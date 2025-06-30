/**
 * Currency Conversion Plugin Tests
 * 
 * Comprehensive tests for multi-currency detection and conversion
 */

import { CurrencyConversionPlugin } from '../../parser/plugins/CurrencyConversionPlugin';
import { 
  ParserResult, 
  ParserContext, 
  ParserConfig, 
  FileFormat 
} from '../../types/parser';

describe('Currency Conversion Plugin', () => {
  let plugin: CurrencyConversionPlugin;
  
  beforeEach(() => {
    plugin = new CurrencyConversionPlugin();
  });
  
  describe('Currency Detection', () => {
    it('should detect currency from metadata', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan-24': {
            revenue: 100000,
            expenses: 70000,
            netIncome: 30000,
            items: []
          }
        },
        metadata: {
          currency: 'EUR'
        }
      };
      
      const context: ParserContext = {
        config: { 
          fileFormat: FileFormat.EXCEL,
          options: {}
        },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.currencies?.detected).toContain('EUR');
      expect(enhanced.metadata?.currencies?.baseCurrency).toBe('USD');
      expect(enhanced.metadata?.currencies?.converted).toBe(true);
    });
    
    it('should detect currency from configuration', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] }
        },
        metadata: {}
      };
      
      const context: ParserContext = {
        config: { 
          fileFormat: FileFormat.EXCEL,
          options: {
            currency: 'GBP'
          }
        },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      expect(enhanced.metadata?.currencies?.detected).toContain('GBP');
    });
    
    it('should detect currency from value patterns', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': {
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            items: [
              { description: 'Sales Revenue', value: 100000, category: 'revenue' },
              { description: 'Revenue in €', value: 50000, category: 'revenue' },
              { description: 'GBP Revenue', value: 30000, category: 'revenue' }
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
      
      const detected = enhanced.metadata?.currencies?.detected;
      expect(detected).toContain('EUR');
      expect(detected).toContain('GBP');
    });
    
    it('should default to USD when no currency detected', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] }
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
      
      // Should not convert when only USD is detected
      expect(enhanced.metadata?.currencies?.detected).toContain('USD');
      expect(enhanced.metadata?.currencies?.converted).toBeUndefined();
    });
  });
  
  describe('Currency Conversion', () => {
    it('should convert EUR to USD using fallback rates', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan-24': {
            revenue: 100000,
            expenses: 70000,
            netIncome: 30000,
            items: [
              { description: 'Revenue', value: 100000, category: 'revenue' },
              { description: 'Expenses', value: 70000, category: 'expense' }
            ]
          }
        },
        metadata: { currency: 'EUR' }
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      // EUR to USD rate is 1.08 in fallback rates
      expect(enhanced.data!['Jan-24'].revenue).toBeCloseTo(108000, 2);
      expect(enhanced.data!['Jan-24'].expenses).toBeCloseTo(75600, 2);
      expect(enhanced.data!['Jan-24'].netIncome).toBe(enhanced.data!['Jan-24'].revenue - enhanced.data!['Jan-24'].expenses);
      
      // Check item conversion
      expect(enhanced.data!['Jan-24'].items[0].value).toBeCloseTo(108000, 2);
      expect(enhanced.data!['Jan-24'].items[0].originalCurrency).toBe('EUR');
      expect(enhanced.data!['Jan-24'].items[0].converted).toBe(true);
    });
    
    it('should handle multiple currencies in same period', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Q1': {
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            items: [
              { description: 'US Revenue', value: 50000, category: 'revenue', currency: 'USD' },
              { description: 'EU Revenue €', value: 40000, category: 'revenue' },
              { description: 'UK Revenue £', value: 20000, category: 'revenue' }
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
      
      // USD stays same, EUR * 1.08, GBP * 1.27
      const items = enhanced.data!['Q1'].items;
      expect(items[0].value).toBe(50000); // USD unchanged
      expect(items[1].value).toBeCloseTo(43200, 2); // EUR 40000 * 1.08
      expect(items[2].value).toBeCloseTo(25400, 2); // GBP 20000 * 1.27
      
      // Total revenue should be sum of converted values
      expect(enhanced.data!['Q1'].revenue).toBeCloseTo(118600, 2);
    });
    
    it('should add warning when exchange rate not found', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': {
            revenue: 100000,
            expenses: 70000,
            netIncome: 30000,
            items: [
              { description: 'Revenue', value: 100000, category: 'revenue', currency: 'XYZ' }
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
      
      expect(context.warnings).toHaveLength(1);
      expect(context.warnings[0].code).toBe('NO_EXCHANGE_RATE');
      expect(context.warnings[0].message).toContain('XYZ');
    });
  });
  
  describe('Exchange Rate Management', () => {
    it('should use static fallback rates', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': {
            revenue: 100,
            expenses: 0,
            netIncome: 0,
            items: [
              { description: 'Test', value: 100, category: 'revenue', currency: 'JPY' }
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
      
      // JPY to USD rate is 0.0067
      expect(enhanced.data!['Jan'].items[0].value).toBeCloseTo(0.67, 2);
      
      // Check exchange rate was recorded
      const rates = enhanced.metadata?.currencies?.exchangeRates;
      expect(rates?.['JPY_USD']).toBeDefined();
      expect(rates?.['JPY_USD'].rate).toBe(0.0067);
      expect(rates?.['JPY_USD'].source).toBe('static');
    });
    
    it('should include all detected currencies in metadata', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': {
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            items: [
              { description: 'USD Revenue', value: 1000, category: 'revenue' },
              { description: 'EUR Revenue', value: 1000, category: 'revenue' },
              { description: 'BRL Revenue', value: 1000, category: 'revenue' }
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
      
      const detected = enhanced.metadata?.currencies?.detected;
      expect(detected).toHaveLength(3);
      expect(detected).toContain('USD');
      expect(detected).toContain('EUR');
      expect(detected).toContain('BRL');
      
      // Should have exchange rates for non-USD currencies
      const rates = enhanced.metadata?.currencies?.exchangeRates;
      expect(rates?.['EUR_USD']).toBeDefined();
      expect(rates?.['BRL_USD']).toBeDefined();
    });
  });
  
  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset with multiple currencies
      const items: any[] = [];
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
      
      for (let i = 0; i < 1000; i++) {
        items.push({
          description: `Item ${i}`,
          value: Math.random() * 10000,
          category: i % 2 === 0 ? 'revenue' : 'expense',
          currency: currencies[i % currencies.length]
        });
      }
      
      const result: ParserResult = {
        success: true,
        data: {
          'FY2024': {
            revenue: 0,
            expenses: 0,
            netIncome: 0,
            items
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
      
      const start = Date.now();
      const enhanced = await plugin.parse(result, context);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(enhanced.data!['FY2024'].items).toHaveLength(1000);
      
      // All items should be converted
      enhanced.data!['FY2024'].items.forEach(item => {
        expect(item.converted).toBe(true);
        expect(item.originalCurrency).toBeDefined();
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should skip conversion when only base currency detected', async () => {
      const result: ParserResult = {
        success: true,
        data: {
          'Jan': { revenue: 100000, expenses: 70000, netIncome: 30000, items: [] }
        },
        metadata: { currency: 'USD' }
      };
      
      const context: ParserContext = {
        config: { fileFormat: FileFormat.EXCEL },
        startTime: Date.now(),
        metadata: {},
        warnings: [],
        hints: []
      };
      
      const enhanced = await plugin.parse(result, context);
      
      // Should not convert
      expect(enhanced.data!['Jan'].revenue).toBe(100000);
      expect(enhanced.metadata?.currencies?.converted).toBeUndefined();
    });
    
    it('should handle empty data gracefully', async () => {
      const result: ParserResult = {
        success: true,
        data: {},
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
      
      expect(enhanced).toBe(result);
      expect(context.warnings).toHaveLength(0);
    });
    
    it('should handle plugin errors gracefully', async () => {
      const result: ParserResult = {
        success: true,
        data: null as any, // Invalid data
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
      
      expect(enhanced).toBe(result);
      expect(context.warnings).toHaveLength(1);
      expect(context.warnings[0].code).toBe('CURRENCY_CONVERSION_ERROR');
    });
  });
  
  describe('Plugin Metadata', () => {
    it('should provide correct metadata', () => {
      const metadata = plugin.getMetadata();
      
      expect(metadata.name).toBe('CurrencyConversionPlugin');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.capabilities).toContain('currency_conversion');
      expect(metadata.capabilities).toContain('multi_language');
      expect(metadata.capabilities).toContain('data_validation');
      expect(metadata.configuration?.baseCurrency).toBe('USD');
      expect(metadata.configuration?.supportedCurrencies).toContain('EUR');
      expect(metadata.configuration?.supportedCurrencies).toContain('GBP');
    });
  });
});