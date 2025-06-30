/**
 * Parser Service
 * 
 * Main entry point for the badass parser system.
 * Orchestrates parser engines, plugins, and provides a unified API.
 */

import { ParserEngineFactory, IParserEngine } from './core/ParserEngine';
import { ExcelParserEngine } from './engines/ExcelParserEngine';
import { PDFParserEngine } from './engines/PDFParserEngine';
import { CSVParserEngine } from './engines/CSVParserEngine';
import { PluginRegistry } from './plugins/BasePlugin';
import { AIEnhancementPlugin } from './plugins/AIEnhancementPlugin';
import {
  FileFormat,
  ParserConfig,
  ParserResult,
  ParserOptions,
  ValidationError
} from '../types/parser';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { parserOptimizations, ParsingResult } from '../optimization/ParserOptimizations';
import { trackParserPerformance, trackParserResult, trackFileProcessing, trackMemoryUsage } from '../middleware/performanceMiddleware';
import { parserCache } from '../optimization/CacheManager';

/**
 * Parser Service Configuration
 */
export interface ParserServiceConfig {
  enableAI?: boolean;
  defaultPlugins?: string[];
  maxFileSize?: number;
  timeout?: number;
  tier?: 'basic' | 'professional' | 'enterprise';
  enableOptimizations?: boolean;
  enableCaching?: boolean;
  enableWorkers?: boolean;
}

/**
 * Main Parser Service
 */
export class ParserService {
  private config: ParserServiceConfig;
  private engines: Map<FileFormat, IParserEngine> = new Map();
  
  constructor(config: ParserServiceConfig = {}) {
    this.config = {
      enableAI: true,
      defaultPlugins: ['AIEnhancementPlugin'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      timeout: 60000, // 60 seconds
      tier: 'professional',
      enableOptimizations: true,
      enableCaching: true,
      enableWorkers: true,
      ...config
    };
    
    this.initialize();
  }
  
  /**
   * Initialize the parser service
   */
  private initialize(): void {
    // Register parser engines
    this.registerEngines();
    
    // Register plugins
    this.registerPlugins();
    
    logger.info('Parser Service initialized', {
      tier: this.config.tier,
      enableAI: this.config.enableAI,
      engines: Array.from(this.engines.keys())
    });
  }
  
  /**
   * Register all parser engines
   */
  private registerEngines(): void {
    // Register engines with factory
    ParserEngineFactory.register(FileFormat.EXCEL, ExcelParserEngine);
    ParserEngineFactory.register(FileFormat.CSV, CSVParserEngine);
    ParserEngineFactory.register(FileFormat.PDF, PDFParserEngine);
    
    // Create instances for service
    this.engines.set(FileFormat.EXCEL, new ExcelParserEngine());
    this.engines.set(FileFormat.CSV, new CSVParserEngine());
    this.engines.set(FileFormat.PDF, new PDFParserEngine());
    
    // Apply default plugins
    if (this.config.enableAI && this.config.defaultPlugins) {
      this.engines.forEach(engine => {
        this.config.defaultPlugins?.forEach(pluginName => {
          try {
            const plugin = PluginRegistry.create(pluginName);
            engine.registerPlugin(plugin);
          } catch (error) {
            logger.warn(`Failed to register plugin ${pluginName}:`, error);
          }
        });
      });
    }
  }
  
  /**
   * Register all available plugins
   */
  private registerPlugins(): void {
    PluginRegistry.register(AIEnhancementPlugin);
    
    // Register more plugins as they are developed
    // PluginRegistry.register(CurrencyConversionPlugin);
    // PluginRegistry.register(DataValidationPlugin);
    // PluginRegistry.register(IndustrySpecificPlugin);
  }
  
  /**
   * Parse a file buffer
   */
  async parse(
    buffer: Buffer,
    config: ParserConfig
  ): Promise<ParserResult> {
    const startTime = Date.now();
    const stopTimer = trackParserPerformance('parse', {
      fileName: config.fileName || 'unknown',
      fileSize: buffer.length.toString()
    });
    const stopMemoryTracking = trackMemoryUsage('parse');
    
    try {
      // Track file processing metrics
      trackFileProcessing(buffer.length, this.getFileType(config.fileName || ''));
      
      // Validate input
      const validationErrors = await this.validateInput(buffer, config);
      if (validationErrors.length > 0) {
        trackParserResult(false, { reason: 'validation_failed' });
        return {
          success: false,
          errors: validationErrors.map(e => ({
            name: 'ValidationError',
            message: e.message,
            code: e.code
          })),
          metadata: {
            validationErrors,
            processingTime: Date.now() - startTime
          }
        };
      }
      
      // Auto-detect format if not provided
      const format = config.fileFormat || await this.detectFormat(buffer, config.fileName);
      if (!format) {
        throw new Error('Unable to detect file format');
      }
      
      // Get appropriate engine
      const engine = this.getEngine(format);
      if (!engine) {
        throw new Error(`No parser engine available for format: ${format}`);
      }
      
      // Check tier restrictions
      if (!this.checkTierAccess(engine)) {
        throw new Error(`Parser for ${format} requires ${engine.getMetadata().tier} tier`);
      }
      
      let result: ParserResult;
      
      // Use optimized parsing for large files if enabled
      if (this.config.enableOptimizations && buffer.length > 10 * 1024 * 1024) { // > 10MB
        logger.info('Using optimized parsing for large file', {
          size: Math.round(buffer.length / 1024 / 1024) + 'MB',
          format
        });
        
        const optimizedResult = await parserOptimizations.adaptiveOptimization(
          buffer,
          format,
          async (data) => {
            return await this.parseWithTimeout(
              engine,
              data instanceof Buffer ? data : buffer,
              { ...config, fileFormat: format },
              this.config.timeout || 60000
            );
          }
        );
        
        // Convert optimized result to parser result
        result = {
          success: true,
          data: optimizedResult.data,
          metadata: {
            ...optimizedResult.metadata,
            performance: optimizedResult.performance
          },
          confidence: { overall: 0.9 } // Default confidence for optimized parsing
        };
        
      } else {
        // Standard parsing
        result = await this.parseWithTimeout(
          engine,
          buffer,
          { ...config, fileFormat: format },
          this.config.timeout || 60000
        );
      }
      
      // Stop performance tracking
      const duration = stopTimer();
      stopMemoryTracking();
      
      // Add service metadata
      result.metadata = {
        ...result.metadata,
        parserService: {
          version: '2.0.0',
          tier: this.config.tier,
          engine: engine.getMetadata().name,
          processingTime: Date.now() - startTime,
          aiEnhanced: this.config.enableAI,
          optimized: this.config.enableOptimizations && buffer.length > 10 * 1024 * 1024,
          cached: false
        }
      };
      
      // Track success
      trackParserResult(true, {
        format,
        size: buffer.length.toString(),
        duration: duration.toString()
      });
      
      // Record performance metrics
      performanceMonitor.recordTiming('parser.total_duration', Date.now() - startTime, {
        format,
        optimized: result.metadata.parserService?.optimized?.toString() || 'false'
      });
      
      // Log success
      logger.info('File parsed successfully', {
        format,
        size: buffer.length,
        processingTime: Date.now() - startTime,
        confidence: result.confidence?.overall,
        optimized: result.metadata.parserService?.optimized
      });
      
      return result;
      
    } catch (error) {
      const duration = stopTimer();
      stopMemoryTracking();
      
      // Track failure
      trackParserResult(false, {
        error: (error as Error).name,
        message: (error as Error).message.substring(0, 100)
      });
      
      logger.error('Parser service error:', error);
      
      return {
        success: false,
        errors: [{
          name: 'ParserError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PARSE_ERROR'
        }],
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Parse with timeout
   */
  private async parseWithTimeout(
    engine: IParserEngine,
    buffer: Buffer,
    config: ParserConfig,
    timeout: number
  ): Promise<ParserResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Parser timeout exceeded'));
      }, timeout);
      
      engine.parse(buffer, config)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  
  /**
   * Validate input
   */
  private async validateInput(
    buffer: Buffer,
    config: ParserConfig
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Check file size
    if (buffer.length > (this.config.maxFileSize || 100 * 1024 * 1024)) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
        severity: 'error'
      });
    }
    
    // Validate config
    if (!config.fileName && !config.fileFormat) {
      errors.push({
        code: 'MISSING_FORMAT',
        message: 'Either fileName or fileFormat must be provided',
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Get file type from filename
   */
  private getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }
  
  /**
   * Auto-detect file format
   */
  async detectFormat(
    buffer: Buffer,
    fileName?: string
  ): Promise<FileFormat | null> {
    // Check by file extension
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'xlsx':
        case 'xls':
          return FileFormat.EXCEL;
        case 'csv':
          return FileFormat.CSV;
        case 'pdf':
          return FileFormat.PDF;
      }
    }
    
    // Check by file signature
    if (buffer.length >= 4) {
      const signature = buffer.slice(0, 4).toString('hex').toUpperCase();
      
      // Excel signatures
      if (signature === '504B0304' || signature === 'D0CF11E0') {
        return FileFormat.EXCEL;
      }
      
      // PDF signature
      if (buffer.slice(0, 4).toString() === '%PDF') {
        return FileFormat.PDF;
      }
    }
    
    // Check if it's likely CSV (text with delimiters)
    const sample = buffer.slice(0, 1000).toString('utf8');
    if (this.looksLikeCSV(sample)) {
      return FileFormat.CSV;
    }
    
    return null;
  }
  
  /**
   * Check if text looks like CSV
   */
  private looksLikeCSV(text: string): boolean {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return false;
    
    // Check for consistent delimiters
    const delimiters = [',', ';', '\t', '|'];
    for (const delimiter of delimiters) {
      const counts = lines.map(line => 
        (line.match(new RegExp(delimiter, 'g')) || []).length
      );
      
      // If most lines have the same number of delimiters, it's likely CSV
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avgCount > 1 && counts.every(c => Math.abs(c - avgCount) <= 1)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get parser engine for format
   */
  private getEngine(format: FileFormat): IParserEngine | undefined {
    return this.engines.get(format);
  }
  
  /**
   * Check tier access
   */
  private checkTierAccess(engine: IParserEngine): boolean {
    const engineTier = engine.getMetadata().tier;
    const serviceTier = this.config.tier || 'basic';
    
    const tierLevels = { basic: 1, professional: 2, enterprise: 3 };
    
    return tierLevels[serviceTier] >= tierLevels[engineTier];
  }
  
  /**
   * Get available parsers
   */
  getAvailableParsers(): ParserInfo[] {
    return Array.from(this.engines.values()).map(engine => {
      const metadata = engine.getMetadata();
      return {
        name: metadata.name,
        version: metadata.version,
        formats: metadata.supportedFormats,
        tier: metadata.tier,
        capabilities: engine.capabilities,
        performance: metadata.performanceRating,
        accuracy: metadata.accuracyRating
      };
    });
  }
  
  /**
   * Get available plugins
   */
  getAvailablePlugins(): PluginInfo[] {
    return PluginRegistry.getPluginNames().map(name => {
      const metadata = PluginRegistry.getMetadata(name);
      if (!metadata) return null;
      
      return {
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        capabilities: metadata.capabilities,
        author: metadata.author
      };
    }).filter(Boolean) as PluginInfo[];
  }
  
  /**
   * Enable a plugin globally
   */
  enablePlugin(pluginName: string): void {
    this.engines.forEach(engine => {
      try {
        const plugin = PluginRegistry.create(pluginName);
        engine.registerPlugin(plugin);
      } catch (error) {
        logger.warn(`Failed to enable plugin ${pluginName}:`, error);
      }
    });
  }
  
  /**
   * Disable a plugin globally
   */
  disablePlugin(pluginName: string): void {
    this.engines.forEach(engine => {
      engine.unregisterPlugin(pluginName);
    });
  }
  
  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ParserServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Re-initialize if needed
    if (config.enableAI !== undefined || config.defaultPlugins) {
      this.initialize();
    }
  }
}

// Type definitions

interface ParserInfo {
  name: string;
  version: string;
  formats: FileFormat[];
  tier: 'basic' | 'professional' | 'enterprise';
  capabilities: any;
  performance: string;
  accuracy: number;
}

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  author: string;
}

// Export singleton instance
export const parserService = new ParserService();