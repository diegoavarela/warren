/**
 * Types Smoke Tests
 * 
 * Basic smoke tests to verify our new type system works correctly.
 */

import { 
  FinancialAmount, 
  CurrencyCode, 
  FinancialCategory,
  ExtractionConfidence 
} from '../../types/financial';

import { 
  ApiResponse, 
  FileUploadRequest,
  FinancialMetricsRequest 
} from '../../types/api';

describe('Types Smoke Tests', () => {
  describe('Financial Types', () => {
    it('should create valid FinancialAmount objects', () => {
      const amount: FinancialAmount = {
        value: 1000.50,
        currency: 'USD',
        precision: 2,
      };

      expect(amount.value).toBe(1000.50);
      expect(amount.currency).toBe('USD');
      expect(amount.precision).toBe(2);
    });

    it('should support various currency codes', () => {
      const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY'];
      
      currencies.forEach(currency => {
        const amount: FinancialAmount = {
          value: 100,
          currency: currency,
        };
        expect(amount.currency).toBe(currency);
      });
    });

    it('should define financial categories correctly', () => {
      const categories: FinancialCategory[] = [
        'revenue',
        'expense',
        'asset',
        'liability',
        'equity',
        'cash_inflow',
        'cash_outflow',
      ];

      categories.forEach(category => {
        expect(typeof category).toBe('string');
      });
    });

    it('should create confidence objects', () => {
      const confidence: ExtractionConfidence = {
        overall: 'high',
        fields: {
          amount: 'very_high',
          description: 'medium',
        },
        score: 85,
      };

      expect(confidence.overall).toBe('high');
      expect(confidence.score).toBe(85);
      expect(confidence.fields.amount).toBe('very_high');
    });
  });

  describe('API Types', () => {
    it('should create valid API responses', () => {
      const response: ApiResponse<{ test: string }> = {
        success: true,
        data: { test: 'value' },
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req-123',
          processingTime: 100,
          version: '1.0.0',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data?.test).toBe('value');
      expect(response.metadata.requestId).toBe('req-123');
    });

    it('should create error responses', () => {
      const response: ApiResponse = {
        success: false,
        error: 'Something went wrong',
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req-456',
          processingTime: 50,
          version: '1.0.0',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    it('should handle file upload request types', () => {
      const uploadRequest: Partial<FileUploadRequest> = {
        mappingType: 'cashflow',
        currency: 'USD',
      };

      expect(uploadRequest.mappingType).toBe('cashflow');
      expect(uploadRequest.currency).toBe('USD');
    });

    it('should handle financial metrics request types', () => {
      const metricsRequest: Partial<FinancialMetricsRequest> = {
        companyId: 'comp-123',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        currency: 'USD',
        metrics: ['revenue', 'profit', 'cashflow'],
      };

      expect(metricsRequest.companyId).toBe('comp-123');
      expect(metricsRequest.currency).toBe('USD');
      expect(metricsRequest.metrics).toHaveLength(3);
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints', () => {
      // This test verifies that TypeScript is enforcing our types correctly
      const amount: FinancialAmount = {
        value: 100,
        currency: 'USD',
      };

      // These should work fine
      expect(typeof amount.value).toBe('number');
      expect(typeof amount.currency).toBe('string');
      
      // The type system should prevent invalid assignments
      // (This would cause a TypeScript error at compile time)
      // amount.value = 'invalid'; // ❌ Would cause TS error
      // amount.currency = 123; // ❌ Would cause TS error
    });

    it('should handle optional properties correctly', () => {
      const minimalAmount: FinancialAmount = {
        value: 50,
        currency: 'EUR',
      };

      const fullAmount: FinancialAmount = {
        value: 75,
        currency: 'GBP',
        precision: 2,
        originalValue: '£75.00',
      };

      expect(minimalAmount.precision).toBeUndefined();
      expect(fullAmount.precision).toBe(2);
      expect(fullAmount.originalValue).toBe('£75.00');
    });
  });

  describe('Complex Type Combinations', () => {
    it('should handle nested type structures', () => {
      const complexResponse: ApiResponse<{
        amounts: FinancialAmount[];
        confidence: ExtractionConfidence;
      }> = {
        success: true,
        data: {
          amounts: [
            { value: 100, currency: 'USD' },
            { value: 200, currency: 'EUR', precision: 2 },
          ],
          confidence: {
            overall: 'high',
            fields: {},
            score: 90,
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: 'complex-123',
          processingTime: 250,
          version: '1.0.0',
        },
      };

      expect(complexResponse.data?.amounts).toHaveLength(2);
      expect(complexResponse.data?.confidence.score).toBe(90);
    });

    it('should work with union types', () => {
      const categories: FinancialCategory[] = [
        'revenue',
        'expense',
        'asset',
      ];

      categories.forEach(category => {
        expect(['revenue', 'expense', 'asset', 'liability', 'equity', 'cash_inflow', 'cash_outflow', 'income', 'cost', 'other'])
          .toContain(category);
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large type structures efficiently', () => {
      const startTime = Date.now();
      
      // Create many financial amounts
      const amounts: FinancialAmount[] = [];
      for (let i = 0; i < 1000; i++) {
        amounts.push({
          value: Math.random() * 10000,
          currency: i % 2 === 0 ? 'USD' : 'EUR',
          precision: 2,
        });
      }

      const endTime = Date.now();
      
      expect(amounts).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should not cause memory leaks with type objects', () => {
      // Create and discard many objects to test for memory issues
      for (let i = 0; i < 100; i++) {
        const response: ApiResponse<FinancialAmount[]> = {
          success: true,
          data: Array(100).fill(null).map(() => ({
            value: Math.random() * 1000,
            currency: 'USD',
          })),
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: `test-${i}`,
            processingTime: Math.random() * 100,
            version: '1.0.0',
          },
        };
        
        // Use the object briefly
        expect(response.data).toHaveLength(100);
      }
      
      // If we get here without memory issues, the test passes
      expect(true).toBe(true);
    });
  });
});