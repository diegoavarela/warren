/**
 * Application Entry Point with Dependency Injection
 * 
 * This is the main application file that bootstraps the server
 * using our dependency injection container.
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServiceProvider, getConfigFromEnv } from './core/ServiceProvider';
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler';
import { registerControllers } from './core/decorators/Controller';
import { container, SERVICES } from './core/Container';
import { logger } from './utils/logger';
import { performanceMiddleware } from './middleware/performanceMiddleware';
import { monitoringDashboard } from './monitoring/MonitoringDashboard';

// Import controllers
import { FileUploadControllerV2 } from './controllers/FileUploadControllerV2';
// Import other controllers as they are refactored...

/**
 * Application class
 */
export class Application {
  private app: express.Application;
  private serviceProvider: any;
  private server: any;
  
  constructor() {
    this.app = express();
  }
  
  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Setup global error handlers
      setupGlobalErrorHandlers();
      
      // Load configuration
      const config = getConfigFromEnv();
      
      // Create service provider
      this.serviceProvider = createServiceProvider(config);
      
      // Register all services
      await this.serviceProvider.register();
      
      // Bootstrap services
      await this.serviceProvider.bootstrap();
      
      // Start monitoring dashboard (non-blocking)
      try {
        await monitoringDashboard.start();
      } catch (error) {
        logger.warn('Failed to start monitoring dashboard:', error);
        // Continue without monitoring - it's not critical
      }
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }
  
  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Compression
    this.app.use(compression());
    
    // Performance monitoring
    this.app.use(performanceMiddleware);
    
    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }
  
  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Register all controllers with DI
    const controllers = [
      FileUploadControllerV2,
      // Add other controllers here as they are refactored
    ];
    
    // Register controllers with the DI container
    controllers.forEach(Controller => {
      container.registerTransient(Controller, Controller);
    });
    
    // Register routes
    registerControllers(this.app, controllers);
    
    // API documentation route
    this.app.get('/api/v2/docs', (req, res) => {
      res.json({
        version: '2.0.0',
        endpoints: [
          {
            path: '/api/v2/files/upload',
            method: 'POST',
            description: 'Upload and parse a financial file'
          },
          {
            path: '/api/v2/files',
            method: 'GET',
            description: 'Get uploaded files'
          },
          {
            path: '/api/v2/files/:id',
            method: 'GET',
            description: 'Get file details'
          },
          {
            path: '/api/v2/files/:id',
            method: 'DELETE',
            description: 'Delete a file'
          },
          {
            path: '/api/v2/files/parser/capabilities',
            method: 'GET',
            description: 'Get parser capabilities'
          }
        ]
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path
      });
    });
  }
  
  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
      });
    });
  }
  
  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    
    this.server = this.app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }
  
  /**
   * Shutdown the server
   */
  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('Server closed');
      });
    }
    
    if (this.serviceProvider) {
      await this.serviceProvider.shutdown();
    }
    
    // Stop monitoring
    await monitoringDashboard.stop();
    
    process.exit(0);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const app = new Application();
    await app.initialize();
    await app.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

export default Application;