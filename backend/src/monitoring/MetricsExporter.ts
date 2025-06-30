/**
 * Metrics Exporter
 * 
 * Exports performance metrics to various monitoring systems
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { PerformanceReport, PerformanceMetric } from './PerformanceMonitor';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MetricsExporterConfig {
  exportInterval?: number;
  exportPath?: string;
  enablePrometheus?: boolean;
  enableGraphite?: boolean;
  enableCustom?: boolean;
  retentionDays?: number;
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

export class MetricsExporter extends EventEmitter {
  private config: Required<MetricsExporterConfig>;
  private exportInterval?: NodeJS.Timeout;
  private prometheusMetrics = new Map<string, PrometheusMetric>();
  
  constructor(config: MetricsExporterConfig = {}) {
    super();
    
    this.config = {
      exportInterval: config.exportInterval || 60000, // 1 minute
      exportPath: config.exportPath || './metrics',
      enablePrometheus: config.enablePrometheus !== false,
      enableGraphite: config.enableGraphite || false,
      enableCustom: config.enableCustom !== false,
      retentionDays: config.retentionDays || 7
    };
  }
  
  /**
   * Start metrics export
   */
  async start(): Promise<void> {
    logger.info('Starting metrics exporter', this.config);
    
    // Ensure export directory exists
    await this.ensureExportDirectory();
    
    // Start export interval
    this.exportInterval = setInterval(() => {
      this.exportMetrics();
    }, this.config.exportInterval);
    
    // Cleanup old metrics
    await this.cleanupOldMetrics();
    
    this.emit('started');
  }
  
  /**
   * Stop metrics export
   */
  stop(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
      this.exportInterval = undefined;
    }
    
    logger.info('Metrics exporter stopped');
    this.emit('stopped');
  }
  
  /**
   * Export performance report
   */
  async exportReport(report: PerformanceReport): Promise<void> {
    try {
      if (this.config.enableCustom) {
        await this.exportCustomFormat(report);
      }
      
      if (this.config.enablePrometheus) {
        await this.exportPrometheusFormat(report);
      }
      
      if (this.config.enableGraphite) {
        await this.exportGraphiteFormat(report);
      }
      
      this.emit('exported', report);
      
    } catch (error) {
      logger.error('Failed to export metrics report', {
        error: (error as Error).message,
        period: report.period
      });
      
      this.emit('error', error);
    }
  }
  
  /**
   * Export individual metric
   */
  async exportMetric(metric: PerformanceMetric): Promise<void> {
    if (this.config.enablePrometheus) {
      this.addPrometheusMetric(metric);
    }
    
    // Real-time metric export could be added here
    this.emit('metric', metric);
  }
  
  /**
   * Export metrics in custom JSON format
   */
  private async exportCustomFormat(report: PerformanceReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `metrics-${timestamp}.json`;
    const filepath = path.join(this.config.exportPath, 'custom', filename);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      report,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
    
    logger.debug('Exported custom metrics', { filepath });
  }
  
  /**
   * Export metrics in Prometheus format
   */
  private async exportPrometheusFormat(report: PerformanceReport): Promise<void> {
    const timestamp = Date.now();
    const lines: string[] = [];
    
    // Add report metrics
    lines.push(this.formatPrometheusMetric({
      name: 'warren_http_requests_total',
      help: 'Total number of HTTP requests',
      type: 'counter',
      value: report.metrics.requests.total,
      timestamp
    }));
    
    lines.push(this.formatPrometheusMetric({
      name: 'warren_http_request_duration_ms',
      help: 'Average HTTP request duration in milliseconds',
      type: 'gauge',
      value: report.metrics.requests.avgResponseTime,
      timestamp
    }));
    
    lines.push(this.formatPrometheusMetric({
      name: 'warren_parser_files_processed_total',
      help: 'Total number of files processed by parser',
      type: 'counter',
      value: report.metrics.parser.filesProcessed,
      timestamp
    }));
    
    lines.push(this.formatPrometheusMetric({
      name: 'warren_parser_success_rate',
      help: 'Parser success rate',
      type: 'gauge',
      value: report.metrics.parser.successRate,
      timestamp
    }));
    
    lines.push(this.formatPrometheusMetric({
      name: 'warren_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      type: 'gauge',
      value: report.metrics.system.memoryUsage,
      timestamp
    }));
    
    lines.push(this.formatPrometheusMetric({
      name: 'warren_errors_total',
      help: 'Total number of errors',
      type: 'counter',
      value: report.metrics.errors.total,
      timestamp
    }));
    
    // Add individual Prometheus metrics
    this.prometheusMetrics.forEach(metric => {
      lines.push(this.formatPrometheusMetric(metric));
    });
    
    const content = lines.join('\n') + '\n';
    const filepath = path.join(this.config.exportPath, 'prometheus', 'metrics.prom');
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content);
    
    // Also create a timestamped backup
    const backupPath = path.join(
      this.config.exportPath,
      'prometheus',
      'history',
      `metrics-${timestamp}.prom`
    );
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, content);
    
    logger.debug('Exported Prometheus metrics', { filepath });
  }
  
  /**
   * Export metrics in Graphite format
   */
  private async exportGraphiteFormat(report: PerformanceReport): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const prefix = 'warren';
    const lines: string[] = [];
    
    // Format: metric.name value timestamp
    lines.push(`${prefix}.http.requests.total ${report.metrics.requests.total} ${timestamp}`);
    lines.push(`${prefix}.http.requests.avg_duration ${report.metrics.requests.avgResponseTime} ${timestamp}`);
    lines.push(`${prefix}.parser.files_processed ${report.metrics.parser.filesProcessed} ${timestamp}`);
    lines.push(`${prefix}.parser.success_rate ${report.metrics.parser.successRate} ${timestamp}`);
    lines.push(`${prefix}.system.memory_usage ${report.metrics.system.memoryUsage} ${timestamp}`);
    lines.push(`${prefix}.errors.total ${report.metrics.errors.total} ${timestamp}`);
    
    const content = lines.join('\n') + '\n';
    const filepath = path.join(this.config.exportPath, 'graphite', `metrics-${timestamp}.txt`);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content);
    
    logger.debug('Exported Graphite metrics', { filepath });
  }
  
  /**
   * Add metric to Prometheus collection
   */
  private addPrometheusMetric(metric: PerformanceMetric): void {
    const prometheusMetric: PrometheusMetric = {
      name: `warren_${metric.name.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      help: `Warren metric: ${metric.name}`,
      type: metric.unit === 'count' ? 'counter' : 'gauge',
      value: metric.value,
      labels: metric.tags,
      timestamp: metric.timestamp.getTime()
    };
    
    this.prometheusMetrics.set(prometheusMetric.name, prometheusMetric);
  }
  
  /**
   * Format Prometheus metric
   */
  private formatPrometheusMetric(metric: PrometheusMetric): string {
    const lines: string[] = [];
    
    // Help line
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    
    // Type line
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    
    // Metric line
    let metricLine = metric.name;
    
    if (metric.labels && Object.keys(metric.labels).length > 0) {
      const labels = Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      metricLine += `{${labels}}`;
    }
    
    metricLine += ` ${metric.value}`;
    
    if (metric.timestamp) {
      metricLine += ` ${metric.timestamp}`;
    }
    
    lines.push(metricLine);
    
    return lines.join('\n');
  }
  
  /**
   * Export current metrics
   */
  private async exportMetrics(): Promise<void> {
    try {
      // This would typically get the latest report from the performance monitor
      // For now, we'll emit an event that the monitor can respond to
      this.emit('requestExport');
      
    } catch (error) {
      logger.error('Failed to export metrics', {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Ensure export directory exists
   */
  private async ensureExportDirectory(): Promise<void> {
    await fs.mkdir(this.config.exportPath, { recursive: true });
    
    if (this.config.enableCustom) {
      await fs.mkdir(path.join(this.config.exportPath, 'custom'), { recursive: true });
    }
    
    if (this.config.enablePrometheus) {
      await fs.mkdir(path.join(this.config.exportPath, 'prometheus'), { recursive: true });
      await fs.mkdir(path.join(this.config.exportPath, 'prometheus', 'history'), { recursive: true });
    }
    
    if (this.config.enableGraphite) {
      await fs.mkdir(path.join(this.config.exportPath, 'graphite'), { recursive: true });
    }
  }
  
  /**
   * Cleanup old metric files
   */
  private async cleanupOldMetrics(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      const directories = [
        path.join(this.config.exportPath, 'custom'),
        path.join(this.config.exportPath, 'prometheus', 'history'),
        path.join(this.config.exportPath, 'graphite')
      ];
      
      for (const dir of directories) {
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filepath = path.join(dir, file);
            const stats = await fs.stat(filepath);
            
            if (stats.mtime.getTime() < cutoff) {
              await fs.unlink(filepath);
              logger.debug('Cleaned up old metric file', { filepath });
            }
          }
        } catch (error) {
          // Directory might not exist, ignore
        }
      }
      
    } catch (error) {
      logger.error('Failed to cleanup old metrics', {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Get export statistics
   */
  getStats(): {
    exportPath: string;
    prometheusMetrics: number;
    lastExport?: string;
  } {
    return {
      exportPath: this.config.exportPath,
      prometheusMetrics: this.prometheusMetrics.size,
      lastExport: undefined // Would track last export time
    };
  }
}

// Singleton instance
export const metricsExporter = new MetricsExporter();