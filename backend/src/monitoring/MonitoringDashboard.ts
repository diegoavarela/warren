/**
 * Monitoring Dashboard
 * 
 * Provides real-time monitoring dashboard for system performance
 */

import { EventEmitter } from 'events';
import { performanceMonitor, PerformanceReport } from './PerformanceMonitor';
import { metricsExporter } from './MetricsExporter';
import { parserCache, exchangeRateCache } from '../optimization/CacheManager';
import { logger } from '../utils/logger';
import * as express from 'express';

export interface DashboardConfig {
  port?: number;
  enableWebUI?: boolean;
  refreshInterval?: number;
  retentionPeriod?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  parser: {
    successRate: number;
    avgProcessingTime: number;
    filesProcessed: number;
  };
  cache: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved?: boolean;
}

export class MonitoringDashboard extends EventEmitter {
  private config: Required<DashboardConfig>;
  private reports: PerformanceReport[] = [];
  private alerts: Alert[] = [];
  private server?: express.Application;
  private httpServer?: any;
  private refreshTimer?: NodeJS.Timeout;
  
  constructor(config: DashboardConfig = {}) {
    super();
    
    this.config = {
      port: config.port || parseInt(process.env.MONITORING_PORT || '3001'),
      enableWebUI: config.enableWebUI !== false,
      refreshInterval: config.refreshInterval || 30000, // 30 seconds
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000 // 24 hours
    };
  }
  
  /**
   * Start monitoring dashboard
   */
  async start(): Promise<void> {
    logger.info('Starting monitoring dashboard', this.config);
    
    // Set up performance monitor listeners
    this.setupMonitoringListeners();
    
    // Start performance monitoring
    performanceMonitor.start();
    
    // Start metrics exporter
    await metricsExporter.start();
    
    // Set up web UI if enabled
    if (this.config.enableWebUI) {
      await this.startWebUI();
    }
    
    // Start refresh timer
    this.refreshTimer = setInterval(() => {
      this.refreshDashboard();
    }, this.config.refreshInterval);
    
    this.emit('started');
    logger.info('Monitoring dashboard started successfully');
  }
  
  /**
   * Stop monitoring dashboard
   */
  async stop(): Promise<void> {
    logger.info('Stopping monitoring dashboard');
    
    // Stop timers
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    // Stop web server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => resolve());
      });
    }
    
    // Stop monitoring services
    performanceMonitor.stop();
    metricsExporter.stop();
    
    this.emit('stopped');
    logger.info('Monitoring dashboard stopped');
  }
  
  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealth {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    // Get latest report
    const latestReport = this.reports[this.reports.length - 1];
    
    // Calculate cache stats
    const parserStats = parserCache.getStats();
    const exchangeStats = exchangeRateCache.getStats();
    const totalCacheHits = parserStats.hits + exchangeStats.hits;
    const totalCacheMisses = parserStats.misses + exchangeStats.misses;
    const cacheHitRate = totalCacheHits + totalCacheMisses > 0
      ? totalCacheHits / (totalCacheHits + totalCacheMisses)
      : 0;
    
    // Determine system status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const errorRate = latestReport?.metrics.errors.rate || 0;
    const successRate = latestReport?.metrics.parser.successRate || 1;
    
    if (memoryPercentage > 90 || errorRate > 10 || successRate < 0.8) {
      status = 'critical';
    } else if (memoryPercentage > 75 || errorRate > 5 || successRate < 0.9) {
      status = 'warning';
    }
    
    return {
      status,
      uptime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: memoryPercentage
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert microseconds to seconds
      },
      parser: {
        successRate: successRate,
        avgProcessingTime: latestReport?.metrics.parser.avgProcessingTime || 0,
        filesProcessed: latestReport?.metrics.parser.filesProcessed || 0
      },
      cache: {
        hitRate: cacheHitRate,
        size: parserStats.size + exchangeStats.size,
        memoryUsage: parserStats.memoryUsage + exchangeStats.memoryUsage
      },
      errors: {
        count: latestReport?.metrics.errors.total || 0,
        rate: errorRate
      },
      alerts: this.getActiveAlerts()
    };
  }
  
  /**
   * Get performance reports
   */
  getPerformanceReports(limit?: number): PerformanceReport[] {
    const reports = [...this.reports].reverse();
    return limit ? reports.slice(0, limit) : reports;
  }
  
  /**
   * Get alerts
   */
  getAlerts(level?: 'info' | 'warning' | 'critical'): Alert[] {
    let alerts = [...this.alerts].reverse();
    
    if (level) {
      alerts = alerts.filter(alert => alert.level === level);
    }
    
    return alerts;
  }
  
  /**
   * Add alert
   */
  addAlert(level: 'info' | 'warning' | 'critical', message: string): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: new Date()
    };
    
    this.alerts.push(alert);
    
    // Limit alerts to prevent memory issues
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
    
    this.emit('alert', alert);
    
    // Log based on level
    if (level === 'critical') {
      logger.error('Critical alert:', message);
    } else if (level === 'warning') {
      logger.warn('Warning alert:', message);
    } else {
      logger.info('Info alert:', message);
    }
  }
  
  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
    }
  }
  
  /**
   * Get active alerts
   */
  private getActiveAlerts(): Alert[] {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Setup monitoring listeners
   */
  private setupMonitoringListeners(): void {
    // Listen for performance reports
    performanceMonitor.on('report', (report: PerformanceReport) => {
      this.reports.push(report);
      
      // Clean old reports
      const cutoff = Date.now() - this.config.retentionPeriod;
      this.reports = this.reports.filter(r => 
        new Date(r.period.split(' - ')[0]).getTime() > cutoff
      );
      
      // Check for alerts
      this.checkForAlerts(report);
      
      // Export metrics
      metricsExporter.exportReport(report);
      
      this.emit('report', report);
    });
    
    // Listen for individual metrics
    performanceMonitor.on('metric', (metric) => {
      metricsExporter.exportMetric(metric);
      this.emit('metric', metric);
    });
    
    // Listen for export requests
    metricsExporter.on('requestExport', () => {
      if (this.reports.length > 0) {
        const latestReport = this.reports[this.reports.length - 1];
        metricsExporter.exportReport(latestReport);
      }
    });
  }
  
  /**
   * Check for alerts based on performance report
   */
  private checkForAlerts(report: PerformanceReport): void {
    // High error rate
    if (report.metrics.errors.rate > 10) {
      this.addAlert('critical', `High error rate: ${report.metrics.errors.rate.toFixed(2)}%`);
    } else if (report.metrics.errors.rate > 5) {
      this.addAlert('warning', `Elevated error rate: ${report.metrics.errors.rate.toFixed(2)}%`);
    }
    
    // Low parser success rate
    if (report.metrics.parser.successRate < 0.8) {
      this.addAlert('critical', `Low parser success rate: ${(report.metrics.parser.successRate * 100).toFixed(1)}%`);
    } else if (report.metrics.parser.successRate < 0.9) {
      this.addAlert('warning', `Parser success rate below target: ${(report.metrics.parser.successRate * 100).toFixed(1)}%`);
    }
    
    // High memory usage
    const memoryUsageMB = report.metrics.system.memoryUsage / 1024 / 1024;
    if (memoryUsageMB > 1000) {
      this.addAlert('critical', `High memory usage: ${memoryUsageMB.toFixed(0)}MB`);
    } else if (memoryUsageMB > 500) {
      this.addAlert('warning', `Elevated memory usage: ${memoryUsageMB.toFixed(0)}MB`);
    }
    
    // Slow average response time
    if (report.metrics.requests.avgResponseTime > 5000) {
      this.addAlert('critical', `Very slow response times: ${report.metrics.requests.avgResponseTime.toFixed(0)}ms`);
    } else if (report.metrics.requests.avgResponseTime > 2000) {
      this.addAlert('warning', `Slow response times: ${report.metrics.requests.avgResponseTime.toFixed(0)}ms`);
    }
  }
  
  /**
   * Start web UI server
   */
  private async startWebUI(): Promise<void> {
    this.server = express.default();
    
    // Enable JSON parsing
    this.server.use(express.default.json());
    
    // CORS for development
    if (this.server) {
      this.server.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
      });
      
      // Health endpoint
      this.server.get('/health', (req, res) => {
        res.json(this.getSystemHealth());
      });
      
      // Reports endpoint
      this.server.get('/reports', (req, res) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        res.json(this.getPerformanceReports(limit));
      });
      
      // Alerts endpoint
      this.server.get('/alerts', (req, res) => {
        const level = req.query.level as 'info' | 'warning' | 'critical' | undefined;
        res.json(this.getAlerts(level));
      });
      
      // Resolve alert endpoint
      this.server.post('/alerts/:id/resolve', (req, res) => {
        this.resolveAlert(req.params.id);
        res.json({ success: true });
      });
      
      // Cache stats endpoint
      this.server.get('/cache', (req, res) => {
        res.json({
          parser: parserCache.getStats(),
          exchangeRate: exchangeRateCache.getStats()
        });
      });
    }
    
    // Start server with error handling
    if (this.server) {
      this.httpServer = this.server.listen(this.config.port);
    }
    
    if (this.httpServer) {
      this.httpServer.on('listening', () => {
        logger.info(`Monitoring dashboard UI available at http://localhost:${this.config.port}`);
      });
      
      this.httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.warn(`Monitoring dashboard port ${this.config.port} is already in use. Dashboard UI disabled.`);
          this.config.enableWebUI = false;
          this.httpServer = undefined;
        } else {
          logger.error('Monitoring dashboard server error:', error);
        }
      });
    }
  }
  
  /**
   * Refresh dashboard
   */
  private refreshDashboard(): void {
    // Emit current health status
    this.emit('healthUpdate', this.getSystemHealth());
    
    // Clean old alerts
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > cutoff);
  }
}

// Singleton instance
export const monitoringDashboard = new MonitoringDashboard();