/**
 * AI Enhancement Plugin Tests
 * 
 * Comprehensive tests for AI-powered parser enhancements
 */

import { AIEnhancementPlugin } from '../../parser/plugins/AIEnhancementPlugin';
import { ExcelParserEngine } from '../../parser/engines/ExcelParserEngine';
import { 
  ParserResult, 
  ParserContext, 
  ParserConfig, 
  FileFormat 
} from '../../types/parser';
import * as ExcelJS from 'exceljs';

describe('AI Enhancement Plugin', () => {
  let plugin: AIEnhancementPlugin;
  let engine: ExcelParserEngine;
  
  beforeEach(() => {
    plugin = new AIEnhancementPlugin();
    engine = new ExcelParserEngine();
  });
  
  describe('Pattern Recognition', () => {
    it('should enhance revenue categorization with context', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan-24': {
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            items: [
              {
                description: 'Recurring Subscription Revenue',
                value: 50000,
                category: 'unknown',
                confidence: 0.5
              },
              {
                description: 'License Revenue from Products',
                value: 30000,
                category: 'unknown',
                confidence: 0.5
              }
            ]
          }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.data!['Jan-24'].items[0].category).toBe('revenue');
      expect(enhanced.data!['Jan-24'].items[0].subcategory).toBe('recurring');
      expect(enhanced.data!['Jan-24'].items[0].confidence).toBeGreaterThan(0.9);
      expect(enhanced.data!['Jan-24'].items[0].aiEnhanced).toBe(true);
      
      expect(enhanced.data!['Jan-24'].items[1].category).toBe('revenue');
      expect(enhanced.data!['Jan-24'].items[1].subcategory).toBe('license');
    });
    
    it('should enhance expense categorization with subcategories', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1-24': {
            revenue: 100000,
            expenses: 0,
            netIncome: 0,
            items: [
              {
                description: 'Salary and Wage Expenses',
                value: -30000,
                category: 'unknown',
                confidence: 0.5
              },
              {
                description: 'Office Rent and Utilities',
                value: -10000,
                category: 'unknown',
                confidence: 0.5
              },
              {
                description: 'Marketing and Advertising Costs',
                value: -5000,
                category: 'unknown',
                confidence: 0.5
              }
            ]
          }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      const items = enhanced.data!['Q1-24'].items;
      
      expect(items[0].category).toBe('expense');
      expect(items[0].subcategory).toBe('personnel');
      
      expect(items[1].category).toBe('expense');
      expect(items[1].subcategory).toBe('facilities');
      
      expect(items[2].category).toBe('expense');
      expect(items[2].subcategory).toBe('marketing');
    });
  });
  
  describe('Anomaly Detection', () => {
    it('should detect statistical anomalies in time series', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan-24': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] },
          'Feb-24': { revenue: 105000, expenses: 72000, netIncome: 33000, items: [] },
          'Mar-24': { revenue: 500000, expenses: 75000, netIncome: 425000, items: [] }, // Anomaly
          'Apr-24': { revenue: 110000, expenses: 74000, netIncome: 36000, items: [] },
          'May-24': { revenue: 108000, expenses: 73000, netIncome: 35000, items: [] }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.anomalies).toBeDefined();
      expect(enhanced.metadata?.anomalyCount).toBeGreaterThan(0);
      
      const anomaly = enhanced.metadata?.anomalies[0];
      expect(anomaly?.period).toBe('Mar-24');
      expect(anomaly?.metric).toBe('revenue');
      expect(anomaly?.type).toBe('statistical_anomaly');
      
      // Should also add warning
      expect(context.warnings).toHaveLength(1);
      expect(context.warnings[0].code).toBe('ANOMALIES_DETECTED');
    });
    
    it('should detect percentage change anomalies', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1-24': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] },
          'Q2-24': { revenue: 110000, expenses: 20000, netIncome: 90000, items: [] }, // 71% expense drop
          'Q3-24': { revenue: 120000, expenses: 75000, netIncome: 45000, items: [] }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.anomalies).toBeDefined();
      
      const anomaly = enhanced.metadata?.anomalies.find((a: any) => 
        a.metric === 'expenses' && a.period === 'Q2-24'
      );
      expect(anomaly).toBeDefined();
    });
  });
  
  describe('Missing Data Inference', () => {
    it('should infer gross profit when missing', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'FY2023': {
            revenue: 1000000,
            expenses: 600000,
            netIncome: 400000,
            cogs: 400000,
            items: []
          },
          'FY2024': {
            revenue: 1200000,
            expenses: 700000,
            netIncome: 500000,
            cogs: 450000,
            items: []
          }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.data!['FY2023'].grossProfit).toBe(600000); // revenue - cogs
      expect(enhanced.data!['FY2023'].grossProfitInferred).toBe(true);
      
      expect(enhanced.data!['FY2024'].grossProfit).toBe(750000);
      expect(enhanced.data!['FY2024'].grossProfitInferred).toBe(true);
    });
    
    it('should calculate operating margin when possible', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1': {
            revenue: 200000,
            expenses: 150000,
            netIncome: 50000,
            operatingIncome: 60000,
            items: []
          }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.data!['Q1'].operatingMargin).toBe(30); // (60000/200000) * 100
      expect(enhanced.data!['Q1'].operatingMarginInferred).toBe(true);
    });
  });
  
  describe('Data Quality Assessment', () => {
    it('should calculate overall data quality score', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] },
          'Feb': { revenue: 0, expenses: 0, netIncome: 0, items: [] }, // Missing data
          'Mar': { revenue: 120000, expenses: 80000, netIncome: 40000, items: [] }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.dataQuality).toBeDefined();
      expect(enhanced.metadata?.dataQuality.overallScore).toBeLessThan(1.0);
      expect(enhanced.metadata?.dataQuality.factors.completeness).toBeLessThan(1.0);
      expect(enhanced.metadata?.dataQuality.grade).toBeDefined();
    });
    
    it('should detect inconsistent calculations', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1': { 
            revenue: 100000, 
            expenses: 70000, 
            netIncome: 25000, // Should be 30000
            items: [] 
          },
          'Q2': { 
            revenue: 110000, 
            expenses: 75000, 
            netIncome: 35000, // Correct
            items: [] 
          }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.dataQuality.factors.consistency).toBeLessThan(1.0);
    });
  });
  
  describe('Confidence Score Enhancement', () => {
    it('should enhance confidence scores based on data quality', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] }
        },
        metadata: {},
        confidence: {
          overall: 0.7,
          fields: {},
          factors: {}
        }
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.confidence?.aiEnhanced).toBe(true);
      expect(enhanced.confidence?.factors?.patternRecognition).toBeDefined();
      expect(enhanced.confidence?.factors?.anomalyDetection).toBeDefined();
      expect(enhanced.confidence?.factors?.dataInference).toBeDefined();
      expect(enhanced.confidence?.factors?.qualityAssessment).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle plugin errors gracefully', async () => {
      const result: ParserResult = {
        success: true,
        data: null as any, // Invalid data to trigger error
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      // Should not throw, but add warning
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced).toBe(result); // Should return original result
      expect(context.warnings).toHaveLength(1);
      expect(context.warnings[0].code).toBe('AI_ENHANCEMENT_ERROR');
    });
  });
  
  describe('Plugin Lifecycle', () => {
    it('should initialize and cleanup properly', () => {
      const mockEngine = {
        registerPlugin: jest.fn(),
        unregisterPlugin: jest.fn()
      } as any;
      
      // Test registration
      plugin.onRegister(mockEngine);
      expect(plugin.isEnabled()).toBe(true);
      
      // Test enable/disable
      plugin.disable();
      expect(plugin.isEnabled()).toBe(false);
      
      plugin.enable();
      expect(plugin.isEnabled()).toBe(true);
      
      // Test unregistration
      plugin.onUnregister(mockEngine);
    });
    
    it('should provide correct metadata', () => {
      const metadata = plugin.getMetadata();
      
      expect(metadata.name).toBe('AIEnhancementPlugin');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.capabilities).toContain('pattern_recognition');
      expect(metadata.capabilities).toContain('anomaly_detection');
      expect(metadata.capabilities).toContain('data_inference');
      expect(metadata.capabilities).toContain('quality_assessment');
      expect(metadata.capabilities).toContain('confidence_scoring');
    });
  });
});