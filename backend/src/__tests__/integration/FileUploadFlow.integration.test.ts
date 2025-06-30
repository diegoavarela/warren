/**
 * File Upload Flow Integration Tests
 * 
 * End-to-end tests for the complete file upload process
 */

import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../testApp';
import { Container } from '../../core/Container';
import { FileUploadService } from '../../services/FileUploadService';
import { ParserService } from '../../parser/ParserService';
import { FinancialDataAggregator } from '../../services/FinancialDataAggregator';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

describe('File Upload Flow Integration', () => {
  let app: Application;
  let container: Container;
  let authToken: string;
  
  beforeAll(async () => {
    // Set up DI container
    container = Container.getInstance();
    
    // Register services
    container.register('FileUploadService', FileUploadService);
    container.register('ParserService', ParserService);
    container.register('FinancialDataAggregator', FinancialDataAggregator);
    
    // Create app
    app = await createApp();
    
    // Create auth token
    authToken = jwt.sign(
      { 
        userId: 'test-user-123',
        email: 'test@vortex.com',
        companyId: 'test-company-123',
        role: 'company_admin'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });
  
  afterAll(async () => {
    // Clean up
    container.reset();
  });
  
  describe('POST /api/cashflow/upload', () => {
    it('should successfully upload and parse Excel file', async () => {
      // Create test Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cashflow');
      
      worksheet.addRow(['Cashflow Statement', '', '', '']);
      worksheet.addRow(['', 'Jan 2024', 'Feb 2024', 'Mar 2024']);
      worksheet.addRow(['Revenue', 100000, 110000, 120000]);
      worksheet.addRow(['Expenses', 70000, 75000, 80000]);
      worksheet.addRow(['Net Cash', 30000, 35000, 40000]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'cashflow-test.xlsx')
        .field('statementType', 'cashflow')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.fileName).toBe('cashflow-test.xlsx');
      expect(response.body.metadata.statementType).toBe('cashflow');
      expect(response.body.metadata.parser).toBeDefined();
    });
    
    it('should handle P&L file with AI enhancement', async () => {
      // Create P&L file with some anomalies
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('P&L');
      
      worksheet.addRow(['Income Statement', '', '', '', '']);
      worksheet.addRow(['', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024']);
      worksheet.addRow(['Revenue', 100000, 500000, 120000, 130000]); // Q2 anomaly
      worksheet.addRow(['COGS', 40000, 45000, 48000, 52000]);
      worksheet.addRow(['Gross Profit', '=B3-B4', '=C3-C4', '=D3-D4', '=E3-E4']);
      worksheet.addRow(['Op Expenses', 30000, 32000, 34000, 36000]);
      worksheet.addRow(['Net Income', '=B5-B6', '=C5-C6', '=D5-D6', '=E5-E6']);
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      const response = await request(app)
        .post('/api/pnl/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'pnl-test.xlsx')
        .field('statementType', 'pnl')
        .field('enableAI', 'true')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.anomalies).toBeDefined();
      expect(response.body.metadata.anomalyCount).toBeGreaterThan(0);
      expect(response.body.confidence.aiEnhanced).toBe(true);
    });
    
    it('should handle multi-currency files', async () => {
      // Create multi-currency file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Multi-Currency');
      
      worksheet.addRow(['Revenue by Region', '', '', '']);
      worksheet.addRow(['', 'Jan 2024', 'Feb 2024', 'Mar 2024']);
      worksheet.addRow(['US Revenue (USD)', 50000, 55000, 60000]);
      worksheet.addRow(['EU Revenue (EUR)', 40000, 42000, 45000]);
      worksheet.addRow(['UK Revenue (GBP)', 20000, 22000, 25000]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'multi-currency.xlsx')
        .field('baseCurrency', 'USD')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.currencies).toBeDefined();
      expect(response.body.metadata.currencies.detected).toContain('USD');
      expect(response.body.metadata.currencies.detected).toContain('EUR');
      expect(response.body.metadata.currencies.detected).toContain('GBP');
      expect(response.body.metadata.currencies.converted).toBe(true);
    });
    
    it('should reject files without authentication', async () => {
      const buffer = Buffer.from('test data');
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .attach('file', buffer, 'test.xlsx')
        .expect(401);
      
      expect(response.body.message).toContain('No token provided');
    });
    
    it('should validate file types', async () => {
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not a valid file'), 'test.txt')
        .expect(400);
      
      expect(response.body.message).toContain('Invalid file type');
    });
    
    it('should enforce file size limits', async () => {
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large.xlsx')
        .expect(400);
      
      expect(response.body.message).toContain('File too large');
    });
    
    it('should handle parser errors gracefully', async () => {
      const corruptBuffer = Buffer.from('corrupt excel data');
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', corruptBuffer, 'corrupt.xlsx')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('CSV Upload Flow', () => {
    it('should parse CSV files correctly', async () => {
      const csvContent = `Date,Description,Amount,Type
2024-01-01,Revenue,100000,Income
2024-01-15,Salaries,-50000,Expense
2024-01-20,Office Rent,-10000,Expense
2024-01-31,Revenue,120000,Income`;
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'cashflow.csv')
        .field('fileFormat', 'csv')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.metadata.parserService.engine).toBe('CSVParserEngine');
    });
  });
  
  describe('Multi-tenant Upload Isolation', () => {
    it('should isolate uploads between companies', async () => {
      // Create token for different company
      const otherCompanyToken = jwt.sign(
        { 
          userId: 'other-user',
          email: 'other@company.com',
          companyId: 'other-company-123',
          role: 'company_admin'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
      
      // Upload for first company
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test');
      worksheet.addRow(['Revenue', 100000]);
      const buffer = await workbook.xlsx.writeBuffer();
      
      await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'company1.xlsx')
        .expect(200);
      
      // Try to access from other company (should create new record)
      const response = await request(app)
        .get('/api/cashflow/data')
        .set('Authorization', `Bearer ${otherCompanyToken}`)
        .expect(200);
      
      // Should not see first company's data
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(0);
    });
  });
  
  describe('Performance Tests', () => {
    it('should handle concurrent uploads', async () => {
      const promises = [];
      
      // Create 10 concurrent uploads
      for (let i = 0; i < 10; i++) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Test');
        worksheet.addRow(['Revenue', Math.random() * 100000]);
        
        const uploadPromise = workbook.xlsx.writeBuffer().then(buffer =>
          request(app)
            .post('/api/cashflow/upload')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', buffer, `concurrent-${i}.xlsx`)
        );
        
        promises.push(uploadPromise);
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });
    
    it('should parse large files within timeout', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Large Dataset');
      
      // Add headers
      worksheet.addRow(['Date', 'Description', 'Amount', 'Category']);
      
      // Add 10,000 rows
      for (let i = 0; i < 10000; i++) {
        worksheet.addRow([
          new Date(2024, 0, (i % 365) + 1),
          `Transaction ${i}`,
          Math.random() * 10000,
          i % 2 === 0 ? 'Revenue' : 'Expense'
        ]);
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/cashflow/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buffer, 'large-dataset.xlsx')
        .expect(200);
      
      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});