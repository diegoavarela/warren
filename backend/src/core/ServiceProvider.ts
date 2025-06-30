/**
 * Service Provider
 * 
 * Provides a clean interface for registering and bootstrapping
 * all application services with the DI container.
 */

import { Container, SERVICES, ServiceLifecycle } from './Container';
import { ParserService } from '../parser/ParserService';
import { ExcelParserEngine } from '../parser/engines/ExcelParserEngine';
import { PDFParserEngine } from '../parser/engines/PDFParserEngine';
import { CSVParserEngine } from '../parser/engines/CSVParserEngine';
import { logger } from '../utils/logger';
// import { DatabaseService } from '../services/DatabaseService'; // TODO: Create DatabaseService
import { ConfigurationServiceDB } from '../services/ConfigurationServiceDB';
import { CompanyUserService } from '../services/CompanyUserService';
import { UserService } from '../services/UserService';
import { FileUploadService } from '../services/FileUploadService';
import { EmailService } from '../services/EmailService';

/**
 * Application configuration
 */
export interface AppConfig {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  parser: {
    enableAI: boolean;
    maxFileSize: number;
    tier: 'basic' | 'professional' | 'enterprise';
  };
}

/**
 * Service provider for bootstrapping the application
 */
export class ServiceProvider {
  private container: Container;
  private config: AppConfig;
  
  constructor(container: Container, config: AppConfig) {
    this.container = container;
    this.config = config;
  }
  
  /**
   * Register all application services
   */
  async register(): Promise<void> {
    // Register configuration
    this.registerConfiguration();
    
    // Register infrastructure services
    this.registerInfrastructure();
    
    // Register parser services
    this.registerParsers();
    
    // Register business services
    this.registerBusinessServices();
    
    // Register repositories
    this.registerRepositories();
    
    logger.info('All services registered successfully');
  }
  
  /**
   * Register configuration
   */
  private registerConfiguration(): void {
    this.container.registerValue(SERVICES.Config, this.config);
  }
  
  /**
   * Register infrastructure services
   */
  private registerInfrastructure(): void {
    // Logger
    this.container.registerValue(SERVICES.Logger, logger);
    
    // Database
    // this.container.registerSingleton(SERVICES.Database, DatabaseService as any); // TODO: Create DatabaseService
    
    // Cache (could be Redis, in-memory, etc.)
    this.container.registerFactory(SERVICES.Cache, () => {
      // For now, return a simple in-memory cache
      return new Map();
    });
  }
  
  /**
   * Register parser services
   */
  private registerParsers(): void {
    // Main parser service
    this.container.registerFactory(SERVICES.ParserService, () => {
      return new ParserService({
        enableAI: this.config.parser.enableAI,
        tier: this.config.parser.tier,
        maxFileSize: this.config.parser.maxFileSize
      });
    }, { lifecycle: ServiceLifecycle.SINGLETON });
    
    // Individual parsers
    this.container.registerTransient(SERVICES.ExcelParser, ExcelParserEngine as any);
    this.container.registerTransient(SERVICES.PDFParser, PDFParserEngine as any);
    this.container.registerTransient(SERVICES.CSVParser, CSVParserEngine as any);
  }
  
  /**
   * Register business services
   */
  private registerBusinessServices(): void {
    // Company service
    this.container.registerSingleton(SERVICES.CompanyService, CompanyUserService as any);
    
    // User service
    this.container.registerSingleton(SERVICES.UserService, UserService as any);
    
    // File service
    this.container.registerSingleton(SERVICES.FileService, FileUploadService as any);
    
    // Email service
    this.container.registerFactory(SERVICES.EmailService, () => {
      return EmailService.getInstance();
    }, { lifecycle: ServiceLifecycle.SINGLETON });
  }
  
  /**
   * Register repositories
   */
  private registerRepositories(): void {
    // In a real application, these would be actual repository classes
    // For now, we'll use the services directly
    
    this.container.registerFactory(SERVICES.CompanyRepository, () => {
      // const db = this.container.resolve<DatabaseService>(SERVICES.Database); // TODO: Create DatabaseService
      return {
        findById: async (id: string) => {
          // Implementation
        },
        save: async (company: any) => {
          // Implementation
        },
        // ... other repository methods
      };
    });
    
    this.container.registerFactory(SERVICES.UserRepository, () => {
      // const db = this.container.resolve<DatabaseService>(SERVICES.Database); // TODO: Create DatabaseService
      return {
        findById: async (id: string) => {
          // Implementation
        },
        findByEmail: async (email: string) => {
          // Implementation
        },
        save: async (user: any) => {
          // Implementation
        },
        // ... other repository methods
      };
    });
  }
  
  /**
   * Bootstrap the application
   */
  async bootstrap(): Promise<void> {
    logger.info('Bootstrapping application...');
    
    // Initialize database connection
    // const db = this.container.resolve<any>(SERVICES.Database); // TODO: Create DatabaseService
    // await db.initialize();
    
    // Run migrations if needed
    // await db.runMigrations();
    
    // Initialize other services that need startup
    const parserService = this.container.resolve<ParserService>(SERVICES.ParserService);
    
    logger.info('Application bootstrapped successfully');
  }
  
  /**
   * Shutdown the application gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down application...');
    
    // Close database connections
    try {
      // const db = this.container.resolve<any>(SERVICES.Database); // TODO: Create DatabaseService
      // await db.close();
    } catch (error) {
      logger.error('Error closing database:', error);
    }
    
    // Clear container
    this.container.clear();
    
    logger.info('Application shut down successfully');
  }
}

/**
 * Create and configure the service provider
 */
export function createServiceProvider(config: AppConfig): ServiceProvider {
  const container = new Container();
  return new ServiceProvider(container, config);
}

/**
 * Get configuration from environment
 */
export function getConfigFromEnv(): AppConfig {
  return {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'warren'
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || ''
    },
    parser: {
      enableAI: process.env.PARSER_ENABLE_AI === 'true',
      maxFileSize: parseInt(process.env.PARSER_MAX_FILE_SIZE || '104857600'), // 100MB
      tier: (process.env.PARSER_TIER || 'professional') as any
    }
  };
}