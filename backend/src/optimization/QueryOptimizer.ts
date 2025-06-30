/**
 * Database Query Optimizer
 * 
 * Optimizes database queries for better performance
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  duration: number;
  cached?: boolean;
}

export interface QueryPlan {
  query: string;
  params: any[];
  estimatedCost: number;
  actualCost?: number;
  planDetails?: any;
}

export interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  averageDuration: number;
  slowQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

export class QueryOptimizer {
  private pool: Pool;
  private queryCache = new Map<string, { result: any; expiry: number }>();
  private queryStats = new Map<string, { count: number; totalTime: number; slowCount: number }>();
  private slowQueryThreshold = 1000; // 1 second
  
  constructor(pool: Pool) {
    this.pool = pool;
  }
  
  /**
   * Execute optimized query
   */
  async query<T = any>(
    text: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      cacheTTL?: number;
      timeout?: number;
      analyze?: boolean;
    } = {}
  ): Promise<QueryResult<T>> {
    const cacheKey = this.getCacheKey(text, params);
    const startTime = process.hrtime.bigint();
    
    // Check cache first
    if (options.cache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        performanceMonitor.recordCounter('db.query.cache_hit', 1);
        return cached;
      }
    }
    
    let client: PoolClient | undefined;
    
    try {
      client = await this.pool.connect();
      
      // Set query timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }
      
      // Analyze query plan if requested
      if (options.analyze) {
        await this.analyzeQuery(client, text, params);
      }
      
      // Execute query
      const result = await client.query(text, params);
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      // Record metrics
      this.recordQueryStats(text, duration);
      performanceMonitor.recordTiming('db.query.duration', duration, {
        query: this.sanitizeQuery(text)
      });
      
      if (options.cache) {
        performanceMonitor.recordCounter('db.query.cache_miss', 1);
      }
      
      const queryResult: QueryResult<T> = {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        duration,
        cached: false
      };
      
      // Cache result if requested
      if (options.cache && result.rows.length > 0) {
        this.cacheResult(cacheKey, queryResult, options.cacheTTL);
      }
      
      return queryResult;
      
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;
      
      performanceMonitor.recordCounter('db.query.error', 1, {
        error: (error as Error).name
      });
      
      logger.error('Query execution failed', {
        query: this.sanitizeQuery(text),
        params: this.sanitizeParams(params),
        duration,
        error: (error as Error).message
      });
      
      throw error;
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  /**
   * Execute batch queries in transaction
   */
  async batch<T = any>(
    queries: Array<{ text: string; params?: any[] }>,
    options: { rollbackOnError?: boolean; analyze?: boolean } = {}
  ): Promise<QueryResult<T>[]> {
    const client = await this.pool.connect();
    const results: QueryResult<T>[] = [];
    
    try {
      await client.query('BEGIN');
      
      for (const query of queries) {
        const startTime = process.hrtime.bigint();
        
        try {
          if (options.analyze) {
            await this.analyzeQuery(client, query.text, query.params || []);
          }
          
          const result = await client.query(query.text, query.params || []);
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1_000_000;
          
          results.push({
            rows: result.rows,
            rowCount: result.rowCount || 0,
            duration
          });
          
          this.recordQueryStats(query.text, duration);
          
        } catch (error) {
          if (options.rollbackOnError) {
            await client.query('ROLLBACK');
            throw error;
          }
          
          // Continue with other queries but record the error
          results.push({
            rows: [],
            rowCount: 0,
            duration: 0
          });
          
          logger.error('Batch query failed', {
            query: this.sanitizeQuery(query.text),
            error: (error as Error).message
          });
        }
      }
      
      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Analyze query execution plan
   */
  async analyzeQuery(
    client: PoolClient,
    text: string,
    params: any[]
  ): Promise<QueryPlan> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON) ${text}`;
      const result = await client.query(explainQuery, params);
      
      const plan = result.rows[0]['QUERY PLAN'][0];
      const executionTime = plan['Execution Time'];
      const planningTime = plan['Planning Time'];
      
      const queryPlan: QueryPlan = {
        query: this.sanitizeQuery(text),
        params: this.sanitizeParams(params),
        estimatedCost: plan.Plan['Total Cost'],
        actualCost: executionTime + planningTime,
        planDetails: plan
      };
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: queryPlan.query,
          executionTime: `${executionTime}ms`,
          planningTime: `${planningTime}ms`,
          estimatedCost: queryPlan.estimatedCost
        });
      }
      
      return queryPlan;
      
    } catch (error) {
      logger.error('Query analysis failed', {
        query: this.sanitizeQuery(text),
        error: (error as Error).message
      });
      
      return {
        query: this.sanitizeQuery(text),
        params: this.sanitizeParams(params),
        estimatedCost: 0
      };
    }
  }
  
  /**
   * Get optimized query suggestions
   */
  async getOptimizationSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];
    const stats = this.getQueryStats();
    
    // Suggest index creation for slow queries
    if (stats.slowQueries > 0) {
      suggestions.push(
        `Consider adding indexes for ${stats.slowQueries} slow queries (>${this.slowQueryThreshold}ms)`
      );
    }
    
    // Suggest query caching for repeated queries
    const repeatedQueries = Array.from(this.queryStats.entries())
      .filter(([_, stat]) => stat.count > 10)
      .length;
    
    if (repeatedQueries > 0) {
      suggestions.push(
        `Consider caching results for ${repeatedQueries} frequently executed queries`
      );
    }
    
    // Check cache effectiveness
    const cacheStats = this.getCacheStats();
    if (cacheStats.hitRate < 0.5 && cacheStats.total > 100) {
      suggestions.push(
        `Cache hit rate is low (${(cacheStats.hitRate * 100).toFixed(1)}%). Review cache TTL settings.`
      );
    }
    
    return suggestions;
  }
  
  /**
   * Get query statistics
   */
  getQueryStats(): QueryStats {
    let totalQueries = 0;
    let totalDuration = 0;
    let slowQueries = 0;
    
    this.queryStats.forEach(stat => {
      totalQueries += stat.count;
      totalDuration += stat.totalTime;
      slowQueries += stat.slowCount;
    });
    
    const cacheStats = this.getCacheStats();
    
    return {
      totalQueries,
      totalDuration,
      averageDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
      slowQueries,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses
    };
  }
  
  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  private getCacheStats(): { hits: number; misses: number; total: number; hitRate: number } {
    let hits = 0;
    let misses = 0;
    
    // This would be tracked separately in a real implementation
    const total = hits + misses;
    
    return {
      hits,
      misses,
      total,
      hitRate: total > 0 ? hits / total : 0
    };
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(text: string, params: any[]): string {
    return `${text}:${JSON.stringify(params)}`;
  }
  
  /**
   * Get result from cache
   */
  private getFromCache<T>(key: string): QueryResult<T> | null {
    const cached = this.queryCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    if (Date.now() > cached.expiry) {
      this.queryCache.delete(key);
      return null;
    }
    
    return { ...cached.result, cached: true };
  }
  
  /**
   * Cache query result
   */
  private cacheResult(key: string, result: QueryResult, ttl: number = 300000): void {
    this.queryCache.set(key, {
      result: { ...result, cached: undefined }, // Remove cached flag for storage
      expiry: Date.now() + ttl
    });
  }
  
  /**
   * Record query statistics
   */
  private recordQueryStats(query: string, duration: number): void {
    const sanitized = this.sanitizeQuery(query);
    const existing = this.queryStats.get(sanitized) || { count: 0, totalTime: 0, slowCount: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    
    if (duration > this.slowQueryThreshold) {
      existing.slowCount++;
    }
    
    this.queryStats.set(sanitized, existing);
  }
  
  /**
   * Sanitize query for logging/stats
   */
  private sanitizeQuery(query: string): string {
    // Remove extra whitespace and normalize
    return query.replace(/\s+/g, ' ').trim().substring(0, 100);
  }
  
  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string' && param.length > 50) {
        return param.substring(0, 50) + '...';
      }
      return param;
    });
  }
}