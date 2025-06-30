/**
 * Performance Monitor
 * 
 * Tracks and reports on system performance metrics
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  period: string;
  metrics: {
    requests: {
      total: number;
      avgResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    parser: {
      filesProcessed: number;
      avgProcessingTime: number;
      successRate: number;
      bytesProcessed: number;
    };
    system: {
      cpuUsage: number;
      memoryUsage: number;
      activeConnections: number;
    };
    errors: {
      total: number;
      rate: number;
      byType: Record<string, number>;
    };
  };
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private intervals: NodeJS.Timeout[] = [];
  private startTime: Date;
  
  constructor() {
    super();
    this.startTime = new Date();
  }
  
  /**
   * Start monitoring
   */
  start(): void {
    logger.info('Performance monitoring started');
    
    // Collect system metrics every 10 seconds
    this.intervals.push(
      setInterval(() => this.collectSystemMetrics(), 10000)
    );
    
    // Generate reports every minute
    this.intervals.push(
      setInterval(() => this.generateReport(), 60000)
    );
    
    // Clean old metrics every hour
    this.intervals.push(
      setInterval(() => this.cleanOldMetrics(), 3600000)
    );
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('Performance monitoring stopped');
  }
  
  /**
   * Record a metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags || {})}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    // Emit for real-time monitoring
    this.emit('metric', metric);
  }
  
  /**
   * Record a timing
   */
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags
    });
  }
  
  /**
   * Record a counter
   */
  recordCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      unit: 'count',
      timestamp: new Date(),
      tags
    });
  }
  
  /**
   * Record a gauge
   */
  recordGauge(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    });
  }
  
  /**
   * Start a timer
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
      return duration;
    };
  }
  
  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Memory metrics
    this.recordGauge('system.memory.heapUsed', memUsage.heapUsed, 'bytes');
    this.recordGauge('system.memory.heapTotal', memUsage.heapTotal, 'bytes');
    this.recordGauge('system.memory.rss', memUsage.rss, 'bytes');
    this.recordGauge('system.memory.external', memUsage.external, 'bytes');
    
    // CPU metrics
    this.recordGauge('system.cpu.user', cpuUsage.user, 'microseconds');
    this.recordGauge('system.cpu.system', cpuUsage.system, 'microseconds');
    
    // Process metrics
    this.recordGauge('system.process.uptime', process.uptime(), 'seconds');
    // Note: _getActiveHandles and _getActiveRequests are deprecated and removed in newer Node versions
    // this.recordGauge('system.process.activeHandles', process._getActiveHandles().length, 'count');
    // this.recordGauge('system.process.activeRequests', process._getActiveRequests().length, 'count');
  }
  
  /**
   * Generate performance report
   */
  private generateReport(): PerformanceReport {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const report: PerformanceReport = {
      period: `${oneMinuteAgo.toISOString()} - ${now.toISOString()}`,
      metrics: {
        requests: this.calculateRequestMetrics(oneMinuteAgo, now),
        parser: this.calculateParserMetrics(oneMinuteAgo, now),
        system: this.calculateSystemMetrics(oneMinuteAgo, now),
        errors: this.calculateErrorMetrics(oneMinuteAgo, now)
      }
    };
    
    // Emit report
    this.emit('report', report);
    
    // Log summary
    logger.info('Performance Report', {
      period: report.period,
      requests: report.metrics.requests.total,
      avgResponseTime: `${report.metrics.requests.avgResponseTime.toFixed(2)}ms`,
      parserSuccessRate: `${(report.metrics.parser.successRate * 100).toFixed(2)}%`,
      errorRate: `${report.metrics.errors.rate.toFixed(2)}%`
    });
    
    return report;
  }
  
  /**
   * Calculate request metrics
   */
  private calculateRequestMetrics(start: Date, end: Date): PerformanceReport['metrics']['requests'] {
    const timings = this.getMetricsInRange('http.request.duration', start, end);
    
    if (timings.length === 0) {
      return {
        total: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
    }
    
    const values = timings.map(m => m.value).sort((a, b) => a - b);
    
    return {
      total: timings.length,
      avgResponseTime: values.reduce((a, b) => a + b, 0) / values.length,
      p95ResponseTime: this.percentile(values, 95),
      p99ResponseTime: this.percentile(values, 99)
    };
  }
  
  /**
   * Calculate parser metrics
   */
  private calculateParserMetrics(start: Date, end: Date): PerformanceReport['metrics']['parser'] {
    const processingTimes = this.getMetricsInRange('parser.processing.duration', start, end);
    const filesSizes = this.getMetricsInRange('parser.file.size', start, end);
    const successes = this.getMetricsInRange('parser.success', start, end);
    const failures = this.getMetricsInRange('parser.failure', start, end);
    
    const totalFiles = successes.length + failures.length;
    
    return {
      filesProcessed: totalFiles,
      avgProcessingTime: processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b.value, 0) / processingTimes.length
        : 0,
      successRate: totalFiles > 0 ? successes.length / totalFiles : 0,
      bytesProcessed: filesSizes.reduce((a, b) => a + b.value, 0)
    };
  }
  
  /**
   * Calculate system metrics
   */
  private calculateSystemMetrics(start: Date, end: Date): PerformanceReport['metrics']['system'] {
    const cpuMetrics = this.getMetricsInRange('system.cpu.user', start, end);
    const memoryMetrics = this.getMetricsInRange('system.memory.heapUsed', start, end);
    const connectionMetrics = this.getMetricsInRange('system.process.activeHandles', start, end);
    
    return {
      cpuUsage: cpuMetrics.length > 0
        ? cpuMetrics[cpuMetrics.length - 1].value
        : 0,
      memoryUsage: memoryMetrics.length > 0
        ? memoryMetrics[memoryMetrics.length - 1].value
        : 0,
      activeConnections: connectionMetrics.length > 0
        ? connectionMetrics[connectionMetrics.length - 1].value
        : 0
    };
  }
  
  /**
   * Calculate error metrics
   */
  private calculateErrorMetrics(start: Date, end: Date): PerformanceReport['metrics']['errors'] {
    const errors = this.getMetricsInRange('error', start, end);
    const requests = this.getMetricsInRange('http.request.duration', start, end);
    
    const errorsByType: Record<string, number> = {};
    
    errors.forEach(error => {
      const type = error.tags?.type || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });
    
    return {
      total: errors.length,
      rate: requests.length > 0 ? (errors.length / requests.length) * 100 : 0,
      byType: errorsByType
    };
  }
  
  /**
   * Get metrics in date range
   */
  private getMetricsInRange(name: string, start: Date, end: Date): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    
    this.metrics.forEach((values, key) => {
      if (key.startsWith(name)) {
        metrics.push(...values.filter(m => 
          m.timestamp >= start && m.timestamp <= end
        ));
      }
    });
    
    return metrics;
  }
  
  /**
   * Calculate percentile
   */
  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index];
  }
  
  /**
   * Clean old metrics
   */
  private cleanOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    let cleaned = 0;
    
    this.metrics.forEach((values, key) => {
      const filtered = values.filter(m => m.timestamp > oneHourAgo);
      cleaned += values.length - filtered.length;
      
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    });
    
    if (cleaned > 0) {
      logger.debug(`Cleaned ${cleaned} old metrics`);
    }
  }
  
  /**
   * Get current metrics snapshot
   */
  getSnapshot(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();