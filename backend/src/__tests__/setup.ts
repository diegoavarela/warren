/**
 * Jest Test Setup
 * 
 * Global test configuration and utilities for Warren backend tests.
 * This file is run before all tests.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Uncomment to silence console.log in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: typeof testUtils;
    }
  }
}

/**
 * Test utilities available in all tests
 */
export const testUtils = {
  /**
   * Create a test financial amount
   */
  createFinancialAmount: (value: number, currency = 'USD') => ({
    value,
    currency,
    precision: 2,
  }),

  /**
   * Create a test date range
   */
  createDateRange: (startMonthsAgo = 12, endMonthsAgo = 0) => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - startMonthsAgo, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - endMonthsAgo, 0);
    return { startDate, endDate };
  },

  /**
   * Create a mock parser result
   */
  createMockParserResult: (success = true, lineItemsCount = 10) => ({
    success,
    confidence: {
      overall: 'high' as const,
      fields: {},
      score: 85,
    },
    errors: [],
    warnings: [],
    stats: {
      totalRows: lineItemsCount + 5, // Headers + data
      processedRows: lineItemsCount,
      skippedRows: 3,
      errorRows: 2,
      extractedLineItems: lineItemsCount,
      processingTime: 1500,
    },
    processingSteps: [
      {
        step: 'file_validation',
        status: 'success' as const,
        message: 'File format validated successfully',
        timestamp: new Date(),
        duration: 100,
      },
      {
        step: 'data_extraction',
        status: 'success' as const,
        message: `Extracted ${lineItemsCount} line items`,
        timestamp: new Date(),
        duration: 1200,
      },
    ],
  }),

  /**
   * Create a mock Excel buffer for testing
   */
  createMockExcelBuffer: (): Buffer => {
    // This is a minimal Excel file buffer for testing
    // In real tests, you might want to use ExcelJS to create proper test files
    return Buffer.from('test-excel-content');
  },

  /**
   * Create a mock CSV buffer for testing
   */
  createMockCSVBuffer: (rows: string[][] = []): Buffer => {
    const defaultRows = [
      ['Date', 'Description', 'Amount', 'Category'],
      ['2024-01-01', 'Revenue from sales', '10000', 'Revenue'],
      ['2024-01-02', 'Office rent', '-2000', 'Expense'],
      ['2024-01-03', 'Marketing expense', '-500', 'Expense'],
    ];
    const csvData = (rows.length > 0 ? rows : defaultRows)
      .map(row => row.join(','))
      .join('\n');
    return Buffer.from(csvData);
  },

  /**
   * Wait for a specified amount of time (for async tests)
   */
  wait: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate a random test ID
   */
  generateTestId: (): string => {
    return `test-${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Create a mock company ID
   */
  createMockCompanyId: (): string => {
    return `company-${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * Assert that an object has the expected structure
   */
  assertObjectStructure: (obj: any, expectedKeys: string[]) => {
    expectedKeys.forEach(key => {
      expect(obj).toHaveProperty(key);
    });
  },

  /**
   * Create a mock Express request object
   */
  createMockRequest: (overrides: any = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    user: { id: 'test-user', companyId: 'test-company' },
    ...overrides,
  }),

  /**
   * Create a mock Express response object
   */
  createMockResponse: () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },

  /**
   * Create a mock Next function for Express middleware
   */
  createMockNext: () => jest.fn(),
};

// Make test utilities globally available
(global as any).testUtils = testUtils;

// Database setup/teardown helpers
export const dbTestUtils = {
  /**
   * Setup test database (if needed)
   */
  setupTestDB: async () => {
    // TODO: Implement test database setup
    // This could create a test database, run migrations, seed data, etc.
  },

  /**
   * Cleanup test database
   */
  cleanupTestDB: async () => {
    // TODO: Implement test database cleanup
    // This could drop test tables, clear data, etc.
  },

  /**
   * Create a test transaction
   */
  withTransaction: async (testFn: () => Promise<void>) => {
    // TODO: Implement transaction wrapper for tests
    // This would start a transaction, run the test, then rollback
    await testFn();
  },
};

// Mock external services by default
jest.mock('../services/ExchangeRateService', () => ({
  ExchangeRateService: {
    getInstance: () => ({
      getExchangeRate: jest.fn().mockResolvedValue({
        from: 'USD',
        to: 'EUR',
        rate: 0.85,
        date: new Date(),
        source: 'test',
      }),
    }),
  },
}));

jest.mock('../services/EmailService', () => ({
  EmailService: {
    getInstance: () => ({
      sendEmail: jest.fn().mockResolvedValue(true),
    }),
  },
}));

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/warren_test';

// Error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, but log the error
});

export default testUtils;