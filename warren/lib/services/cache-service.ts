/**
 * Cache Service for API Response Optimization
 * 
 * Implements in-memory caching with TTL for API responses to improve
 * dashboard loading performance by reducing database queries.
 */

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

class CacheService {
  private cache = new Map<string, CacheItem>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0
  };

  // Default TTL times (in milliseconds)
  private defaultTTL = {
    pnlData: 5 * 60 * 1000,      // P&L data: 5 minutes
    cashflowData: 5 * 60 * 1000,  // Cash Flow data: 5 minutes
    companyList: 10 * 60 * 1000,  // Company list: 10 minutes
    configurations: 15 * 60 * 1000, // Configurations: 15 minutes
    userProfile: 30 * 60 * 1000   // User profile: 30 minutes
  };

  /**
   * Get cached data or null if expired/not found
   */
  get<T = any>(key: string): T | null {
    this.stats.totalRequests++;
    
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    const isExpired = (now - item.timestamp) > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.data;
  }

  /**
   * Set cached data with TTL
   */
  set<T = any>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.getDefaultTTL(key);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Clear cache entries by pattern
   */
  clearByPattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deleted++;
    });
    
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size info
   */
  getSize(): { entries: number; approximateMemoryMB: number } {
    const entries = this.cache.size;
    
    // Rough memory estimation (not exact)
    let approximateBytes = 0;
    this.cache.forEach((item) => {
      approximateBytes += JSON.stringify(item).length * 2; // Rough UTF-16 estimation
    });
    
    return {
      entries,
      approximateMemoryMB: Math.round(approximateBytes / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => {
      const isExpired = (now - item.timestamp) > item.ttl;
      if (isExpired) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleaned++;
    });
    
    return cleaned;
  }

  /**
   * Generate cache key helpers
   */
  generateKey = {
    pnlData: (companyId: string, period?: string) => 
      `pnl:${companyId}${period ? `:${period}` : ''}`,
    
    cashflowData: (companyId: string, period?: string) => 
      `cashflow:${companyId}${period ? `:${period}` : ''}`,
    
    companyList: (userId: string, role: string) => 
      `companies:${userId}:${role}`,
    
    configurations: (companyId: string, type?: string) => 
      `configs:${companyId}${type ? `:${type}` : ''}`,
    
    userProfile: (userId: string) => 
      `user:${userId}`,
    
    processedData: (companyId: string, configId: string) =>
      `processed:${companyId}:${configId}`
  };

  private getDefaultTTL(key: string): number {
    if (key.startsWith('pnl:')) return this.defaultTTL.pnlData;
    if (key.startsWith('cashflow:')) return this.defaultTTL.cashflowData;
    if (key.startsWith('companies:')) return this.defaultTTL.companyList;
    if (key.startsWith('configs:')) return this.defaultTTL.configurations;
    if (key.startsWith('user:')) return this.defaultTTL.userProfile;
    return 5 * 60 * 1000; // Default 5 minutes
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Auto cleanup expired entries every 10 minutes
setInterval(() => {
  const cleaned = cacheService.cleanup();
  if (cleaned > 0) {
  }
}, 10 * 60 * 1000);

export { cacheService, CacheService };
export type { CacheStats };