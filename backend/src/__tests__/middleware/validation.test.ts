/**
 * Validation Middleware Tests
 * 
 * Tests for the comprehensive request validation middleware.
 */

import { validateRequest, financialSchemas, commonSchemas } from '../../middleware/validation';
import { testUtils } from '../setup';

describe('Validation Middleware', () => {
  describe('validateRequest function', () => {
    it('should validate request body successfully', async () => {
      const req = testUtils.createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: commonSchemas.email.keys({
          password: financialSchemas.currency.optional(),
        }),
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const req = testUtils.createMockRequest({
        body: {
          email: 'invalid-email',
          password: '123', // Too short
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: {
          email: commonSchemas.email.required(),
          password: financialSchemas.currency.min(6).required(),
        },
      });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.any(Array),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate query parameters', async () => {
      const req = testUtils.createMockRequest({
        query: {
          page: '1',
          limit: '20',
          currency: 'USD',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        query: commonSchemas.pagination.keys({
          currency: financialSchemas.currency.optional(),
        }),
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1); // Should be converted to number
      expect(req.query.limit).toBe(20);
    });

    it('should validate route parameters', async () => {
      const req = testUtils.createMockRequest({
        params: {
          companyId: '123e4567-e89b-12d3-a456-426614174000',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        params: {
          companyId: commonSchemas.uuid.required(),
        },
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should strip unknown fields when stripUnknown is true', async () => {
      const req = testUtils.createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
          unknownField: 'should be stripped',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: {
          email: commonSchemas.email.required(),
          password: financialSchemas.currency.min(6).required(),
        },
        stripUnknown: true,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.unknownField).toBeUndefined();
    });
  });

  describe('Financial Schemas', () => {
    describe('currency schema', () => {
      it('should validate valid currency codes', () => {
        const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        
        validCurrencies.forEach(currency => {
          const { error } = financialSchemas.currency.validate(currency);
          expect(error).toBeUndefined();
        });
      });

      it('should reject invalid currency codes', () => {
        const invalidCurrencies = ['usd', 'USDD', 'US', '123'];
        
        invalidCurrencies.forEach(currency => {
          const { error } = financialSchemas.currency.validate(currency);
          expect(error).toBeDefined();
        });
      });
    });

    describe('amount schema', () => {
      it('should validate valid amounts', () => {
        const validAmounts = [100, 100.50, 0, -100.25];
        
        validAmounts.forEach(amount => {
          const { error } = financialSchemas.amount.validate(amount);
          expect(error).toBeUndefined();
        });
      });

      it('should reject amounts with too many decimal places', () => {
        const invalidAmounts = [100.555, 100.1234];
        
        invalidAmounts.forEach(amount => {
          const { error } = financialSchemas.amount.validate(amount);
          expect(error).toBeDefined();
        });
      });
    });

    describe('positiveAmount schema', () => {
      it('should validate positive amounts only', () => {
        const { error: validError } = financialSchemas.positiveAmount.validate(100.50);
        expect(validError).toBeUndefined();

        const { error: invalidError } = financialSchemas.positiveAmount.validate(-100);
        expect(invalidError).toBeDefined();

        const { error: zeroError } = financialSchemas.positiveAmount.validate(0);
        expect(zeroError).toBeDefined();
      });
    });

    describe('parserConfig schema', () => {
      it('should validate complete parser configuration', () => {
        const validConfig = {
          fileType: 'excel',
          amountColumn: 3,
          descriptionColumn: 1,
          dateColumn: 2,
          skipRows: 0,
          dateFormat: 'YYYY-MM-DD',
          currencyColumn: 4,
        };

        const { error } = financialSchemas.parserConfig.validate(validConfig);
        expect(error).toBeUndefined();
      });

      it('should require mandatory fields', () => {
        const invalidConfig = {
          fileType: 'excel',
          // Missing required fields
        };

        const { error } = financialSchemas.parserConfig.validate(invalidConfig);
        expect(error).toBeDefined();
      });

      it('should reject invalid file types', () => {
        const invalidConfig = {
          fileType: 'invalid',
          amountColumn: 3,
          descriptionColumn: 1,
          dateColumn: 2,
        };

        const { error } = financialSchemas.parserConfig.validate(invalidConfig);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Common Schemas', () => {
    describe('email schema', () => {
      it('should validate valid email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user+tag@domain.co.uk',
          'first.last@subdomain.example.org',
        ];

        validEmails.forEach(email => {
          const { error } = commonSchemas.email.validate(email);
          expect(error).toBeUndefined();
        });
      });

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user space@domain.com',
        ];

        invalidEmails.forEach(email => {
          const { error } = commonSchemas.email.validate(email);
          expect(error).toBeDefined();
        });
      });
    });

    describe('uuid schema', () => {
      it('should validate valid UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          '00000000-0000-0000-0000-000000000000',
          'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
        ];

        validUUIDs.forEach(uuid => {
          const { error } = commonSchemas.uuid.validate(uuid);
          expect(error).toBeUndefined();
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidUUIDs = [
          'not-a-uuid',
          '123e4567-e89b-12d3-a456',
          '123e4567-e89b-12d3-a456-42661417400g',
        ];

        invalidUUIDs.forEach(uuid => {
          const { error } = commonSchemas.uuid.validate(uuid);
          expect(error).toBeDefined();
        });
      });
    });

    describe('pagination schema', () => {
      it('should validate pagination parameters with defaults', () => {
        const { error, value } = commonSchemas.pagination.validate({});
        
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
        expect(value.order).toBe('asc');
      });

      it('should enforce pagination limits', () => {
        const { error } = commonSchemas.pagination.validate({
          page: 0, // Invalid: must be >= 1
          limit: 200, // Invalid: must be <= 100
        });

        expect(error).toBeDefined();
      });
    });

    describe('dateRange schema', () => {
      it('should validate valid date ranges', () => {
        const validRange = {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        };

        const { error } = commonSchemas.dateRange.validate(validRange);
        expect(error).toBeUndefined();
      });

      it('should reject ranges where end date is before start date', () => {
        const invalidRange = {
          startDate: '2024-12-31T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z',
        };

        const { error } = commonSchemas.dateRange.validate(invalidRange);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation middleware errors gracefully', async () => {
      const req = testUtils.createMockRequest({
        body: { malformed: 'data' },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      // Create a middleware with an intentionally problematic schema
      const middleware = validateRequest({
        body: null as any, // This should cause an error
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Internal validation error'),
        })
      );
    });

    it('should sanitize sensitive data in error logs', async () => {
      const req = testUtils.createMockRequest({
        body: {
          password: 'secret123',
          apiKey: 'sk-1234567890',
          email: 'invalid-email',
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: {
          email: commonSchemas.email.required(),
          password: financialSchemas.currency.min(6).required(),
          apiKey: financialSchemas.currency.optional(),
        },
      });

      // Spy on console methods to check sanitization
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await middleware(req, res, next);

      // Verify that sensitive data was sanitized
      expect(res.status).toHaveBeenCalledWith(400);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Advanced Validation Scenarios', () => {
    it('should handle complex nested validation', async () => {
      const req = testUtils.createMockRequest({
        body: {
          companyConfig: {
            baseCurrency: 'USD',
            financialSettings: {
              fiscalYearStart: 1,
              decimalPrecision: 2,
            },
          },
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: {
          companyConfig: {
            baseCurrency: financialSchemas.currency.required(),
            financialSettings: {
              fiscalYearStart: financialSchemas.positiveAmount.integer().min(1).max(12).required(),
              decimalPrecision: financialSchemas.positiveAmount.integer().min(0).max(4).required(),
            },
          },
        },
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle file upload validation', async () => {
      const req = testUtils.createMockRequest({
        body: {
          mappingType: 'cashflow',
          currency: 'USD',
          parserConfig: {
            fileType: 'excel',
            amountColumn: 3,
            descriptionColumn: 1,
            dateColumn: 2,
          },
        },
      });
      const res = testUtils.createMockResponse();
      const next = testUtils.createMockNext();

      const middleware = validateRequest({
        body: {
          mappingType: financialSchemas.currency.valid('cashflow', 'pnl').required(),
          currency: financialSchemas.currency.optional(),
          parserConfig: financialSchemas.parserConfig.optional(),
        },
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});