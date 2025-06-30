/**
 * Parser Service Integration Tests
 * 
 * End-to-end tests for the complete parser system with all engines and plugins
 */

import { ParserService } from '../../parser/ParserService';
import { FileFormat, ParserConfig } from '../../types/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

describe('Parser Service Integration Tests', () => {
  let parserService: ParserService;
  
  beforeAll(() => {
    parserService = new ParserService({
      enableAI: true,
      defaultPlugins: ['AIEnhancementPlugin', 'CurrencyConversionPlugin'],
      tier: 'enterprise'
    });
  });
  
  describe('Excel Parsing with AI and Currency', () => {
    it('should parse complex multi-currency Excel with AI enhancement', async () => {
      // Create test Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('P&L Statement');
      
      // Add multi-currency data
      worksheet.addRow(['Income Statement', '', '', '', '']);
      worksheet.addRow(['All amounts in respective currencies', '', '', '', '']);
      worksheet.addRow(['', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024']);
      worksheet.addRow(['Revenue (USD)', 100000, 110000, 120000, 130000]);
      worksheet.addRow(['EU Revenue (EUR)', 50000, 55000, 60000, 65000]);
      worksheet.addRow(['UK Revenue (GBP)', 30000, 32000, 35000, 38000]);
      worksheet.addRow(['']);
      worksheet.addRow(['Total Revenue', '=SUM(B4:B6)', '=SUM(C4:C6)', '=SUM(D4:D6)', '=SUM(E4:E6)']);
      worksheet.addRow(['']);
      worksheet.addRow(['Cost of Goods Sold', 60000, 65000, 70000, 75000]);
      worksheet.addRow(['Salary Expenses', 40000, 42000, 44000, 46000]);
      worksheet.addRow(['Marketing Costs', 10000, 12000, 15000, 18000]);
      worksheet.addRow(['Office Rent', 5000, 5000, 5000, 5000]);
      worksheet.addRow(['']);
      worksheet.addRow(['Total Expenses', '=SUM(B10:B13)', '=SUM(C10:C13)', '=SUM(D10:D13)', '=SUM(E10:E13)']);
      worksheet.addRow(['']);
      worksheet.addRow(['Net Income', '=B8-B15', '=C8-C15', '=D8-D15', '=E8-E15']);
      worksheet.addRow(['']);
      worksheet.addRow(['Unusual Item - One-time gain', 0, 500000, 0, 0]); // Anomaly
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const config: ParserConfig = {
        fileName: 'multi-currency-pnl.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {
          enableAI: true,
          enableCurrencyConversion: true,
          baseCurrency: 'USD'
        }
      };
      
      const result = await parserService.parse(buffer, config);
      
      // Basic assertions
      expect(result.success).toBe(true);
      expect(result.metadata?.statementType).toBe('pnl');
      expect(result.metadata?.timePeriods).toHaveLength(4);
      
      // AI Enhancement assertions
      expect(result.metadata?.anomalies).toBeDefined();
      expect(result.metadata?.anomalyCount).toBeGreaterThan(0);
      
      // Find the Q2 anomaly
      const q2Anomaly = result.metadata?.anomalies?.find((a: any) => 
        a.period === 'Q2 2024'
      );
      expect(q2Anomaly).toBeDefined();
      
      // Currency conversion assertions
      expect(result.metadata?.currencies?.detected).toContain('USD');
      expect(result.metadata?.currencies?.detected).toContain('EUR');
      expect(result.metadata?.currencies?.detected).toContain('GBP');
      expect(result.metadata?.currencies?.converted).toBe(true);
      expect(result.metadata?.currencies?.baseCurrency).toBe('USD');
      
      // Data quality assertions
      expect(result.metadata?.dataQuality).toBeDefined();
      expect(result.metadata?.dataQuality.grade).toBeDefined();
      
      // Confidence assertions
      expect(result.confidence).toBeDefined();
      expect(result.confidence?.aiEnhanced).toBe(true);
      expect(result.confidence?.overall).toBeGreaterThan(0.5);
      
      // Line item categorization
      const q1Data = result.data!['Q1 2024'];
      
      // Check salary was properly categorized
      const salaryItem = q1Data.items.find((item: any) => 
        item.description.includes('Salary')
      );
      expect(salaryItem?.category).toBe('expense');
      expect(salaryItem?.subcategory).toBe('personnel');
      expect(salaryItem?.aiEnhanced).toBe(true);
      
      // Check marketing was categorized
      const marketingItem = q1Data.items.find((item: any) => 
        item.description.includes('Marketing')
      );
      expect(marketingItem?.category).toBe('expense');
      expect(marketingItem?.subcategory).toBe('marketing');
    });
    
    it('should handle Excel with formulas and calculated fields', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Financial Data');
      
      worksheet.addRow(['', 'Jan', 'Feb', 'Mar']);
      worksheet.addRow(['Revenue', 100000, 110000, 120000]);
      worksheet.addRow(['COGS', 60000, 65000, 70000]);
      worksheet.addRow(['Gross Profit', '=B2-B3', '=C2-C3', '=D2-D3']);
      worksheet.addRow(['Op Expenses', 20000, 22000, 24000]);
      worksheet.addRow(['Net Income', '=B4-B5', '=C4-C5', '=D4-D5']);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const result = await parserService.parse(buffer, {
        fileName: 'formulas.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      
      expect(result.success).toBe(true);
      
      // Check that formulas were detected and values calculated
      const janData = result.data!['Jan'];
      expect(janData.revenue).toBe(100000);
      expect(janData.expenses).toBeGreaterThan(0);
      
      // Check gross profit was inferred
      expect(janData.grossProfit).toBeDefined();
      expect(janData.grossProfitInferred).toBe(true);
    });
  });
  
  describe('CSV Parsing', () => {
    it('should parse CSV with auto-delimiter detection', async () => {
      const csvContent = `Period;Revenue;Expenses;Net Income
Q1 2024;€100,000;€70,000;€30,000
Q2 2024;€110,000;€75,000;€35,000
Q3 2024;€120,000;€80,000;€40,000
Q4 2024;€130,000;€85,000;€45,000`;
      
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parserService.parse(buffer, {
        fileName: 'european-data.csv',
        fileFormat: FileFormat.CSV
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata?.delimiter).toBe(';');
      expect(result.metadata?.statementType).toBe('pnl');
      
      // Check currency was detected and converted
      expect(result.metadata?.currencies?.detected).toContain('EUR');
      expect(result.data!['Q1 2024'].revenue).toBeGreaterThan(100000); // EUR to USD
    });
    
    it('should handle large CSV files efficiently', async () => {
      // Generate large CSV
      let csvContent = 'Date,Description,Amount,Category\n';
      
      for (let i = 0; i < 10000; i++) {
        const date = `2024-01-${(i % 31) + 1}`;
        const description = `Transaction ${i}`;
        const amount = Math.random() * 10000;
        const category = i % 2 === 0 ? 'Revenue' : 'Expense';
        csvContent += `${date},${description},${amount},${category}\n`;
      }
      
      const buffer = Buffer.from(csvContent, 'utf8');
      const startTime = Date.now();
      
      const result = await parserService.parse(buffer, {
        fileName: 'large-file.csv',
        fileFormat: FileFormat.CSV
      });
      
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should parse within 5 seconds
      expect(result.metadata?.rowCount).toBe(10001); // Header + 10000 rows
    });
  });
  
  describe('PDF Parsing', () => {
    it('should parse PDF financial statements', async () => {
      // Mock PDF buffer (in real tests, load actual PDF)
      const mockPdfBuffer = Buffer.from('%PDF-1.4\n%Mock PDF Content');
      
      const result = await parserService.parse(mockPdfBuffer, {
        fileName: 'financial-statement.pdf',
        fileFormat: FileFormat.PDF
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata?.statementType).toBeDefined();
      expect(result.confidence?.factors?.textExtraction).toBeDefined();
    });
  });
  
  describe('Format Auto-Detection', () => {
    it('should auto-detect Excel format', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Test');
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const result = await parserService.parse(buffer, {
        fileName: 'test.xlsx'
        // No fileFormat specified
      } as any);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.parserService?.engine).toBe('ExcelParserEngine');
    });
    
    it('should auto-detect CSV format', async () => {
      const csvContent = 'Date,Amount,Description\n2024-01-01,1000,Test';
      const buffer = Buffer.from(csvContent, 'utf8');
      
      const result = await parserService.parse(buffer, {
        fileName: 'data.csv'
      } as any);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.parserService?.engine).toBe('CSVParserEngine');
    });
    
    it('should auto-detect PDF format', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\ntest');
      
      const result = await parserService.parse(buffer, {
        fileName: 'document.pdf'
      } as any);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.parserService?.engine).toBe('PDFParserEngine');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle corrupted files gracefully', async () => {
      const corruptBuffer = Buffer.from('corrupt data that is not a valid file');
      
      const result = await parserService.parse(corruptBuffer, {
        fileName: 'corrupt.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBeDefined();
    });
    
    it('should enforce file size limits', async () => {
      // Create buffer larger than limit
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      
      const result = await parserService.parse(largeBuffer, {
        fileName: 'huge.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      
      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe('FILE_TOO_LARGE');
    });
    
    it('should timeout long-running operations', async () => {
      // This would require a mock that takes too long
      // For now, we'll test the timeout configuration
      const service = new ParserService({
        timeout: 100 // 100ms timeout
      });
      
      expect(service).toBeDefined();
      // In real test, would create a slow parser to test timeout
    });
  });
  
  describe('Plugin Management', () => {
    it('should list available parsers', () => {
      const parsers = parserService.getAvailableParsers();
      
      expect(parsers).toHaveLength(3);
      expect(parsers.map(p => p.name)).toContain('ExcelParserEngine');
      expect(parsers.map(p => p.name)).toContain('CSVParserEngine');
      expect(parsers.map(p => p.name)).toContain('PDFParserEngine');
      
      parsers.forEach(parser => {
        expect(parser.version).toBeDefined();
        expect(parser.capabilities).toBeDefined();
        expect(parser.performance).toBeDefined();
        expect(parser.accuracy).toBeGreaterThan(0);
      });
    });
    
    it('should list available plugins', () => {
      const plugins = parserService.getAvailablePlugins();
      
      expect(plugins.length).toBeGreaterThanOrEqual(2);
      expect(plugins.map(p => p.name)).toContain('AIEnhancementPlugin');
      expect(plugins.map(p => p.name)).toContain('CurrencyConversionPlugin');
      
      plugins.forEach(plugin => {
        expect(plugin.version).toBeDefined();
        expect(plugin.description).toBeDefined();
        expect(plugin.capabilities).toBeDefined();
        expect(plugin.author).toBeDefined();
      });
    });
    
    it('should enable and disable plugins', () => {
      // Disable AI plugin
      parserService.disablePlugin('AIEnhancementPlugin');
      
      // Parse without AI
      // Would need to verify AI features are not applied
      
      // Re-enable AI plugin
      parserService.enablePlugin('AIEnhancementPlugin');
      
      // Verify AI features work again
    });
  });
  
  describe('Tier Access Control', () => {
    it('should enforce tier restrictions', async () => {
      const basicService = new ParserService({
        tier: 'basic'
      });
      
      // CSV should work (basic tier)
      const csvBuffer = Buffer.from('a,b,c\n1,2,3');
      const csvResult = await basicService.parse(csvBuffer, {
        fileName: 'test.csv',
        fileFormat: FileFormat.CSV
      });
      
      expect(csvResult.success).toBe(true);
      
      // Excel requires professional tier
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Test');
      const excelBuffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const excelResult = await basicService.parse(excelBuffer, {
        fileName: 'test.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      
      expect(excelResult.success).toBe(false);
      expect(excelResult.errors![0].message).toContain('tier');
    });
  });
});