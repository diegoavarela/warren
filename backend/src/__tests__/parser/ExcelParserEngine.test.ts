/**
 * Excel Parser Engine Tests
 * 
 * Comprehensive tests for our badass parser architecture
 */

import { ExcelParserEngine } from '../../parser/engines/ExcelParserEngine';
import { AIEnhancementPlugin } from '../../parser/plugins/AIEnhancementPlugin';
import { ParserEngineFactory } from '../../parser/core/ParserEngine';
import { PluginRegistry } from '../../parser/plugins/BasePlugin';
import { FileFormat, ParserConfig } from '../../types/parser';
import * as ExcelJS from 'exceljs';

describe('Excel Parser Engine', () => {
  let engine: ExcelParserEngine;
  
  beforeEach(() => {
    engine = new ExcelParserEngine();
  });
  
  describe('Core Functionality', () => {
    it('should initialize with correct metadata', () => {
      const metadata = engine.getMetadata();
      
      expect(metadata.name).toBe('ExcelParserEngine');
      expect(metadata.version).toBe('2.0.0');
      expect(metadata.supportedFormats).toContain(FileFormat.EXCEL);
      expect(metadata.supportedFormats).toContain(FileFormat.CSV);
      expect(metadata.tier).toBe('professional');
      expect(metadata.accuracyRating).toBe(95);
    });
    
    it('should have all required capabilities', () => {
      expect(engine.capabilities.supportsMultiSheet).toBe(true);
      expect(engine.capabilities.supportsFormulas).toBe(true);
      expect(engine.capabilities.aiEnhanced).toBe(true);
      expect(engine.capabilities.confidenceScoring).toBe(true);
      expect(engine.capabilities.multiLanguage).toBe(true);
    });
    
    it('should parse a simple P&L statement', async () => {
      const buffer = await createTestExcel([
        ['', 'Jan-24', 'Feb-24', 'Mar-24'],
        ['Revenue', 100000, 110000, 120000],
        ['Cost of Goods Sold', 60000, 65000, 70000],
        ['Gross Profit', 40000, 45000, 50000],
        ['Operating Expenses', 20000, 22000, 24000],
        ['Net Income', 20000, 23000, 26000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-pnl.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.statementType).toBe('pnl');
      expect(result.metadata?.timePeriods).toHaveLength(3);
      expect(result.metadata?.lineItemCount).toBeGreaterThan(0);
      
      // Check financial data
      expect(result.data).toBeDefined();
      expect(result.data!['Jan-24']).toBeDefined();
      const janData = result.data!['Jan-24'];
      expect(janData?.revenue).toBe(100000);
      expect(janData?.expenses).toBeGreaterThan(0);
    });
    
    it('should detect cashflow statements', async () => {
      const buffer = await createTestExcel([
        ['Cash Flow Statement', '', '', ''],
        ['', 'Q1-2024', 'Q2-2024', 'Q3-2024'],
        ['Operating Activities', '', '', ''],
        ['Cash from Operations', 50000, 55000, 60000],
        ['Investing Activities', '', '', ''],
        ['Capital Expenditures', -20000, -15000, -10000],
        ['Financing Activities', '', '', ''],
        ['Debt Repayment', -10000, -10000, -10000],
        ['Net Cash Flow', 20000, 30000, 40000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-cashflow.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.statementType).toBe('cashflow');
    });
    
    it('should handle multi-language statements', async () => {
      const buffer = await createTestExcel([
        ['', 'Ene-24', 'Feb-24', 'Mar-24'],
        ['Ingresos Totales', 100000, 110000, 120000],
        ['Gastos Operativos', 60000, 65000, 70000],
        ['Utilidad Neta', 40000, 45000, 50000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-spanish.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.language).toBe('es');
    });
    
    it('should calculate confidence scores', async () => {
      const buffer = await createTestExcel([
        ['', 'Jan-24', 'Feb-24'],
        ['Revenue', 100000, 110000],
        ['Expenses', 70000, 75000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-confidence.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.confidence).toBeDefined();
      expect(result.confidence!.overall).toBeGreaterThan(0.5);
      expect(result.confidence!.overall).toBeLessThanOrEqual(1.0);
      expect(result.confidence!.factors).toBeDefined();
    });
    
    it('should handle validation errors', async () => {
      const emptyBuffer = Buffer.from('');
      
      const config: ParserConfig = {
        fileName: 'empty.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      await expect(engine.parse(emptyBuffer, config))
        .rejects.toThrow('Validation failed');
    });
  });
  
  describe('Plugin System', () => {
    let aiPlugin: AIEnhancementPlugin;
    
    beforeEach(() => {
      aiPlugin = new AIEnhancementPlugin();
    });
    
    it('should register plugins successfully', () => {
      expect(() => engine.registerPlugin(aiPlugin)).not.toThrow();
      expect(engine.getPlugins()).toHaveLength(1);
      const firstPlugin = engine.getPlugins()[0];
      expect(firstPlugin?.name).toBe('AIEnhancementPlugin');
    });
    
    it('should not register duplicate plugins', () => {
      engine.registerPlugin(aiPlugin);
      expect(() => engine.registerPlugin(aiPlugin))
        .toThrow('Plugin AIEnhancementPlugin is already registered');
    });
    
    it('should unregister plugins', () => {
      engine.registerPlugin(aiPlugin);
      expect(engine.getPlugins()).toHaveLength(1);
      
      engine.unregisterPlugin('AIEnhancementPlugin');
      expect(engine.getPlugins()).toHaveLength(0);
    });
    
    it('should enhance parsing with AI plugin', async () => {
      engine.registerPlugin(aiPlugin);
      
      const buffer = await createTestExcel([
        ['', 'Jan-24', 'Feb-24', 'Mar-24'],
        ['Total Revenue from Operations', 100000, 110000, 120000],
        ['Salary and Wage Expenses', 50000, 52000, 54000],
        ['Marketing and Advertising Costs', 10000, 11000, 12000],
        ['Net Operating Income', 40000, 47000, 54000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-ai-enhanced.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.success).toBe(true);
      expect(result.confidence?.aiEnhanced).toBe(true);
      
      // Check AI categorization
      const janData = result.data!['Jan-24'];
      expect(janData?.items).toBeDefined();
      
      const revenueItem = janData?.items?.find((item: any) => 
        item.description.includes('Revenue')
      );
      expect(revenueItem?.category).toBe('revenue');
      expect((revenueItem as any)?.aiEnhanced).toBe(true);
      
      const salaryItem = janData?.items?.find((item: any) => 
        item.description.includes('Salary')
      );
      expect(salaryItem?.category).toBe('expense');
      expect(salaryItem?.subcategory).toBe('personnel');
    });
    
    it('should detect anomalies with AI plugin', async () => {
      engine.registerPlugin(aiPlugin);
      
      // Create data with anomaly
      const buffer = await createTestExcel([
        ['', 'Jan-24', 'Feb-24', 'Mar-24', 'Apr-24'],
        ['Revenue', 100000, 105000, 500000, 110000], // Anomaly in Mar
        ['Expenses', 70000, 73000, 75000, 77000]
      ]);
      
      const config: ParserConfig = {
        fileName: 'test-anomaly.xlsx',
        fileFormat: FileFormat.EXCEL,
        options: {}
      };
      
      const result = await engine.parse(buffer, config);
      
      expect(result.metadata?.anomalies).toBeDefined();
      expect(result.metadata?.anomalyCount).toBeGreaterThan(0);
      
      const anomaly = result.metadata?.anomalies[0];
      expect(anomaly?.period).toBe('Mar-24');
      expect(anomaly?.metric).toBe('revenue');
    });
  });
  
  describe('Factory Pattern', () => {
    beforeAll(() => {
      ParserEngineFactory.register(FileFormat.EXCEL, ExcelParserEngine);
    });
    
    it('should create engines using factory', () => {
      const engine = ParserEngineFactory.create(FileFormat.EXCEL);
      
      expect(engine).toBeInstanceOf(ExcelParserEngine);
      expect(engine.format).toBe(FileFormat.EXCEL);
    });
    
    it('should list supported formats', () => {
      const formats = ParserEngineFactory.getSupportedFormats();
      
      expect(formats).toContain(FileFormat.EXCEL);
    });
    
    it('should check format support', () => {
      expect(ParserEngineFactory.isFormatSupported(FileFormat.EXCEL)).toBe(true);
      expect(ParserEngineFactory.isFormatSupported('unknown' as FileFormat)).toBe(false);
    });
  });
  
  describe('Plugin Registry', () => {
    beforeAll(() => {
      PluginRegistry.register(AIEnhancementPlugin);
    });
    
    it('should register plugin classes', () => {
      expect(PluginRegistry.has('AIEnhancementPlugin')).toBe(true);
    });
    
    it('should create plugin instances', () => {
      const plugin = PluginRegistry.create('AIEnhancementPlugin');
      
      expect(plugin).toBeInstanceOf(AIEnhancementPlugin);
      expect(plugin.name).toBe('AIEnhancementPlugin');
    });
    
    it('should get plugin metadata', () => {
      const metadata = PluginRegistry.getMetadata('AIEnhancementPlugin');
      
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('AIEnhancementPlugin');
      expect(metadata?.capabilities).toContain('anomaly_detection');
      expect(metadata?.capabilities).toContain('pattern_recognition');
    });
  });
});

/**
 * Helper function to create test Excel files
 */
async function createTestExcel(data: any[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  
  data.forEach(row => {
    worksheet.addRow(row);
  });
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}