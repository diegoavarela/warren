/**
 * Cache Manager
 * 
 * High-performance caching system for parsed data and computations
 */

import { logger } from '../utils/logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  enableMetrics?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  hits: number;
  created: number;
  size: number; // Approximate size in bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  memoryUsage: number;
  evictions: number;
}

export class CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 3600000, // 1 hour default
      maxSize: options.maxSize || 1000,
      enableMetrics: options.enableMetrics !== false
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, Math.min(this.options.ttl / 4, 60000)); // Every 15 minutes or 1 minute, whichever is smaller
  }
  
  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.recordMetric('cache.miss', 1, { key });
      return undefined;
    }
    
    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.recordMetric('cache.miss', 1, { key, reason: 'expired' });
      return undefined;
    }
    
    // Update hit count
    entry.hits++;
    this.stats.hits++;
    this.recordMetric('cache.hit', 1, { key });
    
    return entry.value;
  }
  
  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.options.ttl);
    const size = this.estimateSize(value);
    
    // Check if we need to evict
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const entry: CacheEntry<T> = {
      value,
      expiry,
      hits: 0,
      created: Date.now(),
      size
    };
    
    this.cache.set(key, entry);
    this.recordMetric('cache.set', 1, { key, size: size.toString() });
  }
  
  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.recordMetric('cache.delete', 1, { key });
    }
    return deleted;
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.recordMetric('cache.clear', 1, { entries: size.toString() });
  }
  
  /**
   * Get or set pattern
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const total = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.options.maxSize,
      memoryUsage,
      evictions: this.stats.evictions
    };
  }
  
  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
      this.recordMetric('cache.cleanup', cleaned);
    }
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey = '';
    let lruTime = Date.now();
    
    // Find entry with lowest hits and oldest creation time
    for (const [key, entry] of this.cache.entries()) {
      const score = entry.hits / (Date.now() - entry.created + 1); // Hits per millisecond
      if (score < lruTime) {
        lruTime = score;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.recordMetric('cache.eviction', 1, { key: lruKey, reason: 'lru' });
    }
  }
  
  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }
  
  /**
   * Record metric if enabled
   */
  private recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (this.options.enableMetrics) {
      performanceMonitor.recordCounter(name, value, tags);
    }
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}

// Specialized caches
export class ParserCache extends CacheManager {
  constructor() {
    super({
      ttl: 1800000, // 30 minutes
      maxSize: 500,
      enableMetrics: true
    });
  }
  
  /**
   * Cache parsed file data
   */
  cacheParseResult(fileHash: string, result: any): void {
    this.set(`parse:${fileHash}`, result);
  }
  
  /**
   * Get cached parse result
   */
  getCachedParseResult(fileHash: string): any {
    return this.get(`parse:${fileHash}`);
  }
  
  /**
   * Cache AI analysis
   */
  cacheAIAnalysis(dataHash: string, analysis: any): void {
    this.set(`ai:${dataHash}`, analysis, 3600000); // 1 hour for AI results
  }
  
  /**
   * Get cached AI analysis
   */
  getCachedAIAnalysis(dataHash: string): any {
    return this.get(`ai:${dataHash}`);
  }
}

export class ExchangeRateCache extends CacheManager {
  constructor() {
    super({
      ttl: 900000, // 15 minutes
      maxSize: 100,
      enableMetrics: true
    });
  }
  
  /**
   * Cache exchange rate
   */
  cacheRate(from: string, to: string, rate: number): void {
    this.set(`rate:${from}_${to}`, rate);
  }
  
  /**
   * Get cached exchange rate
   */
  getCachedRate(from: string, to: string): number | undefined {
    return this.get(`rate:${from}_${to}`);
  }
}

// Global cache instances
export const parserCache = new ParserCache();
export const exchangeRateCache = new ExchangeRateCache();