/**
 * Express Application Factory for Testing
 * 
 * Creates and configures the Express application for integration tests
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/multiTenantAuth';
import pnlRoutes from './routes/pnl';
import cashflowRoutes from './routes/cashflow';
import analysisRoutes from './routes/analysis';
import configurationRoutes from './routes/configuration';
import companyUserRoutes from './routes/companyUsers';
import platformAdminRoutes from './routes/platformAdmin';

export async function createApp(): Promise<Application> {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  
  // Performance middleware
  app.use(compression());
  
  // Request parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Rate limiting
  app.use('/api/auth', rateLimiter);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/pnl', pnlRoutes);
  app.use('/api/cashflow', cashflowRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/configuration', configurationRoutes);
  app.use('/api/company-users', companyUserRoutes);
  app.use('/api/platform-admin', platformAdminRoutes);
  
  // Error handling (must be last)
  app.use(errorHandler);
  
  return app;
}