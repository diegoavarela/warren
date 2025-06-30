import { logger } from './logger';

interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    timestamp: string;
    environment: string;
    nodeVersion: string;
    processId: number;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  request?: {
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
    user?: string;
  };
}

class GlobalErrorHandler {
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly maxErrorsPerMinute = 10;

  /**
   * Format error for logging and monitoring
   */
  private formatError(error: Error, context?: any): ErrorReport {
    return {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        processId: process.pid,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
      request: context?.request ? {
        url: context.request.url,
        method: context.request.method,
        headers: this.sanitizeHeaders(context.request.headers),
        body: this.sanitizeBody(context.request.body),
        user: context.request.user?.id || context.request.user?.email,
      } : undefined,
    };
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers?: any): any {
    if (!headers) return undefined;
    
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize sensitive body data
   */
  private sanitizeBody(body?: any): any {
    if (!body) return undefined;
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    const sanitized = JSON.parse(JSON.stringify(body));
    
    const sanitizeObject = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Check if we should rate limit error reporting
   */
  private shouldRateLimit(): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    if (now - this.lastErrorTime > oneMinute) {
      this.errorCount = 0;
      this.lastErrorTime = now;
    }
    
    this.errorCount++;
    
    if (this.errorCount > this.maxErrorsPerMinute) {
      if (this.errorCount === this.maxErrorsPerMinute + 1) {
        logger.warn('Error rate limit exceeded, suppressing subsequent errors for this minute');
      }
      return true;
    }
    
    return false;
  }

  /**
   * Send error to monitoring service
   */
  private async sendToMonitoring(errorReport: ErrorReport): Promise<void> {
    try {
      // In production, integrate with error monitoring service
      // Examples: Sentry, LogRocket, Bugsnag, etc.
      
      if (process.env.NODE_ENV === 'production') {
        // TODO: Integrate with monitoring service
        console.log('Sending to monitoring service:', {
          ...errorReport,
          error: {
            ...errorReport.error,
            stack: errorReport.error.stack?.substring(0, 1000), // Truncate for monitoring
          },
        });
      }
    } catch (monitoringError) {
      logger.error('Failed to send error to monitoring service:', monitoringError);
    }
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException = (error: Error): void => {
    if (this.shouldRateLimit()) return;

    const errorReport = this.formatError(error);
    
    logger.error('Uncaught Exception:', {
      ...errorReport,
      severity: 'CRITICAL',
    });

    this.sendToMonitoring(errorReport);

    // In production, gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      logger.error('Uncaught exception in production. Shutting down gracefully...');
      
      // Give time for logging to complete
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    } else {
      // In development, don't crash immediately to allow debugging
      logger.warn('Uncaught exception in development. Process continuing...');
    }
  };

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
    if (this.shouldRateLimit()) return;

    const error = reason instanceof Error ? reason : new Error(String(reason));
    const errorReport = this.formatError(error, { promise });
    
    logger.error('Unhandled Promise Rejection:', {
      ...errorReport,
      severity: 'HIGH',
      promise: promise.toString(),
    });

    this.sendToMonitoring(errorReport);

    if (process.env.NODE_ENV === 'production') {
      logger.error('Unhandled rejection in production. This could lead to memory leaks.');
    }
  };

  /**
   * Handle warnings
   */
  handleWarning = (warning: Error): void => {
    if (this.shouldRateLimit()) return;

    logger.warn('Process Warning:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  };

  /**
   * Handle SIGTERM and SIGINT for graceful shutdown
   */
  handleGracefulShutdown = (signal: string): void => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Give time for current requests to complete
    setTimeout(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }, 5000);
  };

  /**
   * Handle exit events
   */
  handleExit = (code: number): void => {
    logger.info(`Process exiting with code: ${code}`);
  };
}

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  const errorHandler = new GlobalErrorHandler();

  // Uncaught exceptions
  process.on('uncaughtException', errorHandler.handleUncaughtException);
  
  // Unhandled promise rejections
  process.on('unhandledRejection', errorHandler.handleUnhandledRejection);
  
  // Process warnings
  process.on('warning', errorHandler.handleWarning);
  
  // Graceful shutdown signals
  process.on('SIGTERM', () => errorHandler.handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => errorHandler.handleGracefulShutdown('SIGINT'));
  
  // Process exit
  process.on('exit', errorHandler.handleExit);

  logger.info('Global error handlers initialized');
}

/**
 * Create an error handler for Express middleware
 */
export function createRequestErrorHandler() {
  const errorHandler = new GlobalErrorHandler();
  
  return (error: Error, req: any, res: any, next: any) => {
    const errorReport = errorHandler['formatError'](error, { request: req });
    
    logger.error('Request Error:', {
      ...errorReport,
      severity: 'MEDIUM',
    });

    errorHandler['sendToMonitoring'](errorReport);

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  };
}