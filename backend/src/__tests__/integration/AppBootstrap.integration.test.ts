/**
 * Application Bootstrap Integration Tests
 * 
 * Tests for complete application initialization with DI container
 */

import { Application } from '../../app';
import { Container } from '../../core/Container';
import request from 'supertest';
import { Server } from 'http';

describe('Application Bootstrap Integration', () => {
  let app: Application;
  let server: Server;
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/warren_test';
  });
  
  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  afterEach(async () => {
    // Clean up
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    Container.getInstance().reset();
  });
  
  describe('Application Initialization', () => {
    it('should initialize application successfully', async () => {
      app = new Application();
      await expect(app.initialize()).resolves.not.toThrow();
    });
    
    it('should register all required services', async () => {
      app = new Application();
      await app.initialize();
      
      const container = Container.getInstance();
      
      // Check core services are registered
      expect(container.has('ParserService')).toBe(true);
      expect(container.has('FileUploadService')).toBe(true);
      expect(container.has('ConfigurationServiceDB')).toBe(true);
    });
    
    it('should setup health check endpoint', async () => {
      app = new Application();
      await app.initialize();
      
      // Get Express app instance
      const expressApp = (app as any).app;
      
      const response = await request(expressApp)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
    
    it('should handle initialization errors gracefully', async () => {
      // Set invalid configuration
      process.env.DATABASE_URL = 'invalid://connection';
      
      app = new Application();
      
      // Should throw but not crash
      await expect(app.initialize()).rejects.toThrow();
    });
  });
  
  describe('Service Provider Integration', () => {
    it('should bootstrap all services in correct order', async () => {
      app = new Application();
      await app.initialize();
      
      // Check services are properly initialized
      const container = Container.getInstance();
      const parserService = container.resolve('ParserService');
      
      expect(parserService).toBeDefined();
      expect(parserService.getAvailableParsers).toBeDefined();
    });
    
    it('should handle circular dependencies', async () => {
      // This should be handled by the DI container
      app = new Application();
      await app.initialize();
      
      const container = Container.getInstance();
      
      // Try to resolve services with dependencies
      expect(() => container.resolve('FileUploadService')).not.toThrow();
    });
  });
  
  describe('Middleware Setup', () => {
    it('should apply security middleware', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      // Test CORS
      const response = await request(expressApp)
        .options('/health')
        .expect(204);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
    
    it('should handle large payloads', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      // Create large payload (5MB)
      const largeData = { data: 'x'.repeat(5 * 1024 * 1024) };
      
      const response = await request(expressApp)
        .post('/api/v2/test')
        .send(largeData)
        .expect(404); // Route doesn't exist, but should parse body
      
      // Should not fail due to payload size
      expect(response.body.error).toBe('Not found');
    });
  });
  
  describe('Route Registration', () => {
    it('should register API documentation endpoint', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      const response = await request(expressApp)
        .get('/api/v2/docs')
        .expect(200);
      
      expect(response.body.version).toBe('2.0.0');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.length).toBeGreaterThan(0);
    });
    
    it('should handle 404 errors', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      const response = await request(expressApp)
        .get('/api/v2/nonexistent')
        .expect(404);
      
      expect(response.body.error).toBe('Not found');
      expect(response.body.path).toBe('/api/v2/nonexistent');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle uncaught errors in routes', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      // Add test route that throws
      expressApp.get('/api/v2/error-test', () => {
        throw new Error('Test error');
      });
      
      const response = await request(expressApp)
        .get('/api/v2/error-test')
        .expect(500);
      
      if (process.env.NODE_ENV === 'development') {
        expect(response.body.error).toBe('Test error');
        expect(response.body.stack).toBeDefined();
      } else {
        expect(response.body.error).toBe('Internal server error');
      }
    });
    
    it('should handle async errors', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      // Add async route that rejects
      expressApp.get('/api/v2/async-error', async () => {
        await Promise.reject(new Error('Async test error'));
      });
      
      const response = await request(expressApp)
        .get('/api/v2/async-error')
        .expect(500);
      
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully on SIGTERM', async () => {
      app = new Application();
      await app.initialize();
      
      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });
      
      // Start server
      const startPromise = app.start();
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send SIGTERM
      process.emit('SIGTERM' as any);
      
      // Should attempt to exit
      await expect(startPromise).rejects.toThrow('Process exit');
      
      mockExit.mockRestore();
    });
  });
  
  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      const startTime = Date.now();
      
      // Make 100 concurrent requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(expressApp).get('/health')
        );
      }
      
      const responses = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });
    
    it('should not leak memory on repeated requests', async () => {
      app = new Application();
      await app.initialize();
      
      const expressApp = (app as any).app;
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await request(expressApp).get('/health');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Check memory usage
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // Should not increase by more than 50MB
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});