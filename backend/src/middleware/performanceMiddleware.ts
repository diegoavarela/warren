/**
 * Performance Monitoring Middleware
 * 
 * Tracks HTTP request performance and parser operations
 */

import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

declare global {
  namespace Express {
    interface Request {
      performanceTimer?: () => number;
    }
  }
}

/**
 * HTTP performance tracking middleware
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Start timer
  const timer = performanceMonitor.startTimer();
  req.performanceTimer = timer;
  
  // Track request start
  performanceMonitor.recordCounter('http.request.start', 1, {
    method: req.method,
    path: req.path
  });
  
  // Override res.end to capture response
  const originalEnd = res.end;
  
  res.end = function(this: Response, ...args: any[]) {
    // Calculate duration
    const duration = timer();
    
    // Record metrics
    performanceMonitor.recordTiming('http.request.duration', duration, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode.toString()
    });
    
    // Record status codes
    performanceMonitor.recordCounter(`http.response.${res.statusCode}`, 1, {
      method: req.method,
      path: req.path
    });
    
    // Record errors
    if (res.statusCode >= 400) {
      performanceMonitor.recordCounter('error', 1, {
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        statusCode: res.statusCode.toString(),
        path: req.path
      });
    }
    
    // Record slow requests
    if (duration > 1000) { // Over 1 second
      performanceMonitor.recordCounter('http.request.slow', 1, {
        method: req.method,
        path: req.path,
        duration: Math.round(duration).toString()
      });
    }
    
    // Call original end with proper typing
    return originalEnd.apply(this, args as any);
  };
  
  next();
}

/**
 * Parser performance tracking
 */
export function trackParserPerformance(
  operation: string,
  metadata: Record<string, any> = {}
): () => number {
  const timer = performanceMonitor.startTimer();
  
  return () => {
    const duration = timer();
    
    performanceMonitor.recordTiming(`parser.${operation}.duration`, duration, metadata);
    
    // Track slow operations
    if (duration > 5000) { // Over 5 seconds
      performanceMonitor.recordCounter('parser.slow_operation', 1, {
        operation,
        duration: Math.round(duration).toString(),
        ...metadata
      });
    }
    
    return duration;
  };
}

/**
 * Track parser success/failure
 */
export function trackParserResult(success: boolean, metadata: Record<string, any> = {}): void {
  performanceMonitor.recordCounter(
    success ? 'parser.success' : 'parser.failure',
    1,
    metadata
  );
}

/**
 * Track file processing
 */
export function trackFileProcessing(fileSize: number, fileType: string): void {
  performanceMonitor.recordCounter('parser.file.processed', 1, { fileType });
  performanceMonitor.recordGauge('parser.file.size', fileSize, 'bytes', { fileType });
}

/**
 * Track memory usage for operations
 */
export function trackMemoryUsage(operation: string): () => void {
  const startMemory = process.memoryUsage().heapUsed;
  
  return () => {
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;
    
    performanceMonitor.recordGauge(
      `memory.delta.${operation}`,
      memoryDelta,
      'bytes'
    );
    
    // Warn on high memory usage
    if (memoryDelta > 100 * 1024 * 1024) { // Over 100MB
      performanceMonitor.recordCounter('memory.high_usage', 1, {
        operation,
        delta: Math.round(memoryDelta / 1024 / 1024).toString() + 'MB'
      });
    }
  };
}