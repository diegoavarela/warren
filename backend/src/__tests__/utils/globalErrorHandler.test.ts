/**
 * Global Error Handler Tests
 * 
 * Tests for the comprehensive global error handling system.
 */

import { setupGlobalErrorHandlers, createRequestErrorHandler } from '../../utils/globalErrorHandler';
import { testUtils } from '../setup';

describe('Global Error Handler', () => {
  let originalNodeEnv: string | undefined;
  let originalProcessListeners: any;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    
    // Store original process listeners
    originalProcessListeners = {
      uncaughtException: process.listeners('uncaughtException'),
      unhandledRejection: process.listeners('unhandledRejection'),
      warning: process.listeners('warning'),
      SIGTERM: process.listeners('SIGTERM'),
      SIGINT: process.listeners('SIGINT'),
      exit: process.listeners('exit'),
    };
    
    // Remove existing listeners to avoid interference
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('warning');
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('exit');
  });

  afterEach(() => {
    // Restore original environment
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    // Restore original listeners
    Object.entries(originalProcessListeners).forEach(([event, listeners]) => {
      process.removeAllListeners(event);
      (listeners as Function[]).forEach(listener => {
        process.on(event as any, listener);
      });
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('should set up all global error handlers', () => {
      setupGlobalErrorHandlers();

      // Check that handlers are registered
      expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
      expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
      expect(process.listenerCount('warning')).toBeGreaterThan(0);
      expect(process.listenerCount('SIGTERM')).toBeGreaterThan(0);
      expect(process.listenerCount('SIGINT')).toBeGreaterThan(0);
      expect(process.listenerCount('exit')).toBeGreaterThan(0);
    });

    it('should handle uncaught exceptions in development', (done) => {
      process.env.NODE_ENV = 'development';
      setupGlobalErrorHandlers();

      // Mock console.error to capture the error log
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger an uncaught exception
      const testError = new Error('Test uncaught exception');
      
      // Set a timeout to check the result
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls.some(call => 
          call.some(arg => typeof arg === 'string' && arg.includes('Uncaught Exception'))
        )).toBe(true);
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('uncaughtException', testError);
    });

    it('should handle unhandled promise rejections', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testPromise = Promise.reject(new Error('Test unhandled rejection'));
      
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls.some(call => 
          call.some(arg => typeof arg === 'string' && arg.includes('Unhandled Promise Rejection'))
        )).toBe(true);
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('unhandledRejection', new Error('Test unhandled rejection'), testPromise);
    });

    it('should handle process warnings', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const testWarning = new Error('Test warning');
      testWarning.name = 'Warning';

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('warning', testWarning);
    });

    it('should handle graceful shutdown signals', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls.some(call => 
          call.some(arg => typeof arg === 'string' && arg.includes('SIGTERM'))
        )).toBe(true);
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('SIGTERM');
    });
  });

  describe('createRequestErrorHandler', () => {
    it('should create Express error handler middleware', () => {
      const errorHandler = createRequestErrorHandler();

      expect(typeof errorHandler).toBe('function');
      expect(errorHandler.length).toBe(4); // Express error handlers have 4 parameters
    });

    it('should handle Express errors in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      const errorHandler = createRequestErrorHandler();
      const testError = new Error('Test Express error');
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      errorHandler(testError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test Express error',
          stack: expect.any(String),
        })
      );
    });

    it('should handle Express errors in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      const errorHandler = createRequestErrorHandler();
      const testError = new Error('Test Express error');
      const req = testUtils.createMockRequest();
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      errorHandler(testError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error', // Should not expose error details in production
        })
      );
      
      // Should not include stack trace in production
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should sanitize sensitive request data', () => {
      const errorHandler = createRequestErrorHandler();
      const testError = new Error('Test error');
      const req = testUtils.createMockRequest({
        body: {
          username: 'testuser',
          password: 'secret123',
          apiKey: 'sk-1234567890',
        },
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      errorHandler(testError, req, res, next);

      // Check that the error was logged
      expect(consoleSpy).toHaveBeenCalled();
      
      // Verify that sensitive data was sanitized (this would be in the log output)
      const loggedData = consoleSpy.mock.calls[0];
      const loggedString = JSON.stringify(loggedData);
      
      expect(loggedString).toContain('[REDACTED]');
      expect(loggedString).not.toContain('secret123');
      expect(loggedString).not.toContain('sk-1234567890');
      expect(loggedString).not.toContain('token123');

      consoleSpy.mockRestore();
    });

    it('should include request context in error logs', () => {
      const errorHandler = createRequestErrorHandler();
      const testError = new Error('Test error with context');
      const req = testUtils.createMockRequest({
        url: '/api/test',
        method: 'POST',
        user: { id: 'user123', email: 'test@example.com' },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      errorHandler(testError, req, res, next);

      expect(consoleSpy).toHaveBeenCalled();
      
      // Verify that request context is included
      const loggedData = consoleSpy.mock.calls[0];
      const loggedString = JSON.stringify(loggedData);
      
      expect(loggedString).toContain('/api/test');
      expect(loggedString).toContain('POST');
      expect(loggedString).toContain('user123');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Rate Limiting', () => {
    it('should implement rate limiting for error reporting', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Trigger multiple errors rapidly
      for (let i = 0; i < 15; i++) {
        const testError = new Error(`Test error ${i}`);
        process.emit('uncaughtException', testError);
      }

      setTimeout(() => {
        // Should have logged some errors but rate limited others
        expect(consoleSpy).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error rate limit exceeded')
        );
        
        consoleSpy.mockRestore();
        warnSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('Memory and Performance Monitoring', () => {
    it('should include memory usage in error reports', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testError = new Error('Test error for memory monitoring');
      
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        
        // Check that memory usage information is included
        const loggedData = consoleSpy.mock.calls[0];
        const loggedString = JSON.stringify(loggedData);
        
        expect(loggedString).toContain('memoryUsage');
        expect(loggedString).toContain('heapUsed');
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('uncaughtException', testError);
    });

    it('should include process information in error reports', (done) => {
      setupGlobalErrorHandlers();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const testError = new Error('Test error for process info');
      
      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalled();
        
        const loggedData = consoleSpy.mock.calls[0];
        const loggedString = JSON.stringify(loggedData);
        
        expect(loggedString).toContain('processId');
        expect(loggedString).toContain('uptime');
        expect(loggedString).toContain('nodeVersion');
        
        consoleSpy.mockRestore();
        done();
      }, 100);

      process.emit('uncaughtException', testError);
    });
  });
});