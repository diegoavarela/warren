/**
 * Parser Performance Optimizations
 * 
 * Optimizations for the parser system to handle large files and improve throughput
 */

import { Readable, Transform } from 'stream';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { Worker } from 'worker_threads';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { parserCache } from './CacheManager';
import * as crypto from 'crypto';
import * as path from 'path';

export interface StreamParsingOptions {
  batchSize?: number;
  maxMemory?: number;
  enableWorkers?: boolean;
  workerCount?: number;
  enableCache?: boolean;
}

export interface ParsingResult {
  data: any;
  metadata: any;
  performance: {
    duration: number;
    memoryUsed: number;
    rowsProcessed: number;
    throughput: number; // rows per second
  };
}

export class ParserOptimizations {
  private readonly defaultOptions: Required<StreamParsingOptions> = {
    batchSize: 1000,
    maxMemory: 512 * 1024 * 1024, // 512MB
    enableWorkers: true,
    workerCount: Math.min(4, require('os').cpus().length),
    enableCache: true
  };
  
  /**
   * Parse large files using streaming
   */
  async parseWithStreaming(
    buffer: Buffer,
    parserFunction: (batch: any[]) => Promise<any>,
    options: StreamParsingOptions = {}
  ): Promise<ParsingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Generate cache key
    const fileHash = this.generateFileHash(buffer);
    
    // Check cache first
    if (opts.enableCache) {
      const cached = parserCache.getCachedParseResult(fileHash);
      if (cached) {
        logger.info('Using cached parse result', { fileHash });
        return cached;
      }
    }
    
    let totalRows = 0;
    const results: any[] = [];
    
    try {
      // Create streaming parser
      const batchProcessor = new BatchProcessor(opts.batchSize, parserFunction);
      
      // Process in batches
      await this.processInBatches(buffer, batchProcessor, opts);
      
      // Collect results
      for await (const batch of batchProcessor.getResults()) {
        results.push(...batch);
        totalRows += batch.length;
        
        // Memory check
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > opts.maxMemory) {
          logger.warn('Memory limit approaching', {
            current: Math.round(currentMemory / 1024 / 1024) + 'MB',
            limit: Math.round(opts.maxMemory / 1024 / 1024) + 'MB'
          });
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      const throughput = totalRows / (duration / 1000);
      
      const result: ParsingResult = {
        data: results,
        metadata: {
          cached: false,
          fileHash,
          optimization: 'streaming'
        },
        performance: {
          duration,
          memoryUsed,
          rowsProcessed: totalRows,
          throughput
        }
      };
      
      // Cache result
      if (opts.enableCache) {
        parserCache.cacheParseResult(fileHash, result);
      }
      
      // Record metrics
      performanceMonitor.recordTiming('parser.streaming.duration', duration);
      performanceMonitor.recordGauge('parser.streaming.throughput', throughput, 'rows_per_second');
      performanceMonitor.recordGauge('parser.streaming.memory', memoryUsed, 'bytes');
      
      return result;
      
    } catch (error) {
      logger.error('Streaming parse failed', {
        error: (error as Error).message,
        fileHash,
        totalRows
      });
      throw error;
    }
  }
  
  /**
   * Parse using worker threads for CPU-intensive operations
   */
  async parseWithWorkers(
    buffer: Buffer,
    parserType: string,
    options: StreamParsingOptions = {}
  ): Promise<ParsingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    if (!opts.enableWorkers) {
      throw new Error('Worker threads not enabled');
    }
    
    const fileHash = this.generateFileHash(buffer);
    
    // Check cache
    if (opts.enableCache) {
      const cached = parserCache.getCachedParseResult(fileHash);
      if (cached) {
        return cached;
      }
    }
    
    try {
      // Split buffer into chunks for workers
      const chunks = this.splitBuffer(buffer, opts.workerCount);
      const workers: Worker[] = [];
      const promises: Promise<any>[] = [];
      
      // Create workers
      for (let i = 0; i < chunks.length; i++) {
        const workerPath = process.env.NODE_ENV === 'production'
          ? path.join(__dirname, 'parserWorker.js')
          : path.join(__dirname, '../../src/optimization/parserWorker.ts');
          
        const worker = new Worker(
          workerPath,
          {
            workerData: {
              chunk: chunks[i],
              parserType,
              chunkIndex: i
            },
            // Enable TypeScript execution in development
            ...(process.env.NODE_ENV !== 'production' && {
              execArgv: ['-r', 'ts-node/register']
            })
          }
        );
        
        workers.push(worker);
        
        const promise = new Promise((resolve, reject) => {
          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
        
        promises.push(promise);
      }
      
      // Wait for all workers to complete
      const results = await Promise.all(promises);
      
      // Cleanup workers
      workers.forEach(worker => worker.terminate());
      
      // Merge results
      const mergedData = this.mergeWorkerResults(results);
      const totalRows = mergedData.length;
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      const throughput = totalRows / (duration / 1000);
      
      const result: ParsingResult = {
        data: mergedData,
        metadata: {
          cached: false,
          fileHash,
          optimization: 'workers',
          workerCount: opts.workerCount
        },
        performance: {
          duration,
          memoryUsed,
          rowsProcessed: totalRows,
          throughput
        }
      };
      
      // Cache result
      if (opts.enableCache) {
        parserCache.cacheParseResult(fileHash, result);
      }
      
      // Record metrics
      performanceMonitor.recordTiming('parser.workers.duration', duration);
      performanceMonitor.recordGauge('parser.workers.throughput', throughput, 'rows_per_second');
      performanceMonitor.recordCounter('parser.workers.used', opts.workerCount);
      
      return result;
      
    } catch (error) {
      logger.error('Worker parse failed', {
        error: (error as Error).message,
        fileHash,
        workerCount: opts.workerCount
      });
      throw error;
    }
  }
  
  /**
   * Optimize parser based on file characteristics
   */
  async adaptiveOptimization(
    buffer: Buffer,
    fileType: string,
    parserFunction: (data: any) => Promise<any>
  ): Promise<ParsingResult> {
    const fileSize = buffer.length;
    const fileSizeMB = fileSize / 1024 / 1024;
    
    // Small files - use standard parsing
    if (fileSizeMB < 5) {
      logger.debug('Using standard parsing for small file', { sizeMB: fileSizeMB });
      
      const startTime = Date.now();
      const data = await parserFunction(buffer);
      const duration = Date.now() - startTime;
      
      return {
        data,
        metadata: { optimization: 'standard' },
        performance: {
          duration,
          memoryUsed: 0,
          rowsProcessed: Array.isArray(data) ? data.length : 1,
          throughput: 0
        }
      };
    }
    
    // Medium files - use streaming
    if (fileSizeMB < 50) {
      logger.debug('Using streaming for medium file', { sizeMB: fileSizeMB });
      return this.parseWithStreaming(buffer, async (batch) => {
        return await parserFunction(batch);
      });
    }
    
    // Large files - use workers
    logger.debug('Using workers for large file', { sizeMB: fileSizeMB });
    return this.parseWithWorkers(buffer, fileType, {
      workerCount: Math.min(8, Math.ceil(fileSizeMB / 10)) // Scale workers with file size
    });
  }
  
  /**
   * Process buffer in batches
   */
  private async processInBatches(
    buffer: Buffer,
    processor: BatchProcessor,
    options: Required<StreamParsingOptions>
  ): Promise<void> {
    // This would be implemented based on the specific file format
    // For now, this is a placeholder that would integrate with specific parsers
    const chunks = this.splitBuffer(buffer, Math.ceil(buffer.length / (options.batchSize * 1000)));
    
    for (const chunk of chunks) {
      await processor.processBatch(chunk);
    }
    
    await processor.finish();
  }
  
  /**
   * Split buffer into chunks
   */
  private splitBuffer(buffer: Buffer, chunkCount: number): Buffer[] {
    const chunks: Buffer[] = [];
    const chunkSize = Math.ceil(buffer.length / chunkCount);
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.slice(i, end));
    }
    
    return chunks;
  }
  
  /**
   * Merge results from multiple workers
   */
  private mergeWorkerResults(results: any[]): any[] {
    // Sort by chunk index to maintain order
    results.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
    
    // Merge data
    const merged: any[] = [];
    for (const result of results) {
      if (Array.isArray(result.data)) {
        merged.push(...result.data);
      }
    }
    
    return merged;
  }
  
  /**
   * Generate hash for file caching
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }
}

/**
 * Batch processor for streaming operations
 */
class BatchProcessor {
  private results: any[] = [];
  private batchSize: number;
  private processingFunction: (batch: any[]) => Promise<any>;
  
  constructor(batchSize: number, processingFunction: (batch: any[]) => Promise<any>) {
    this.batchSize = batchSize;
    this.processingFunction = processingFunction;
  }
  
  async processBatch(data: any): Promise<void> {
    const batch = Array.isArray(data) ? data : [data];
    const result = await this.processingFunction(batch);
    this.results.push(result);
  }
  
  async finish(): Promise<void> {
    // Any cleanup or final processing
  }
  
  async* getResults(): AsyncGenerator<any[]> {
    for (const result of this.results) {
      yield Array.isArray(result) ? result : [result];
    }
  }
}

// Export singleton instance
export const parserOptimizations = new ParserOptimizations();