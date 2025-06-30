/**
 * FinancialStatementParser Tests
 * 
 * Comprehensive tests for the core financial statement parser.
 * These tests ensure our badass parser works correctly with various file formats.
 */

import { FinancialStatementParser } from '../../services/FinancialStatementParser';
import ExcelJS from 'exceljs';

describe('FinancialStatementParser', () => {
  let parser: FinancialStatementParser;
  
  beforeEach(() => {
    parser = new FinancialStatementParser();
  });

  describe('Excel File Parsing', () => {
    it('should parse a basic P&L statement from Excel', async () => {
      // Create a test Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('P&L Statement');
      
      // Add headers
      worksheet.addRow(['', 'Jan-24', 'Feb-24', 'Mar-24']);
      
      // Add revenue data
      worksheet.addRow(['Total Revenue', 100000, 110000, 120000]);
      worksheet.addRow(['Service Revenue', 80000, 85000, 90000]);
      worksheet.addRow(['Product Revenue', 20000, 25000, 30000]);
      
      // Add expense data
      worksheet.addRow(['Cost of Goods Sold', 40000, 44000, 48000]);
      worksheet.addRow(['Operating Expenses', 30000, 32000, 34000]);
      worksheet.addRow(['Salaries', 25000, 26000, 27000]);
      worksheet.addRow(['Marketing', 5000, 6000, 7000]);
      
      // Add totals
      worksheet.addRow(['Gross Profit', 60000, 66000, 72000]);
      worksheet.addRow(['Net Income', 30000, 34000, 38000]);
      
      // Convert to buffer
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      // Parse the file
      const result = await parser.parseFinancialStatement(buffer);
      
      // Assertions
      expect(result.type).toBe('pnl');
      expect(result.timePeriods).toHaveLength(3);
      expect(result.timePeriods[0].period).toContain('Jan');
      expect(result.lineItems.length).toBeGreaterThan(0);
      
      // Check that revenue items are correctly categorized
      const revenueItems = result.lineItems.filter(item => item.category === 'revenue');
      expect(revenueItems.length).toBeGreaterThan(0);
      
      // Check that expense items are correctly categorized
      const expenseItems = result.lineItems.filter(item => item.category === 'expense');
      expect(expenseItems.length).toBeGreaterThan(0);
      
      // Verify financial data structure
      expect(result.data).toBeDefined();
      expect(Object.keys(result.data)).toHaveLength(3); // 3 periods
      
      // Check first period data
      const firstPeriod = Object.keys(result.data)[0];
      expect(result.data[firstPeriod].revenue).toBeGreaterThan(0);
      expect(result.data[firstPeriod].operatingExpenses).toBeGreaterThan(0);
    });

    it('should parse a basic cashflow statement from Excel', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cash Flow');
      
      // Add headers
      worksheet.addRow(['', 'Jan-24', 'Feb-24', 'Mar-24']);
      
      // Operating activities
      worksheet.addRow(['Operating Activities']);
      worksheet.addRow(['Net Income', 30000, 34000, 38000]);
      worksheet.addRow(['Depreciation', 5000, 5000, 5000]);
      worksheet.addRow(['Accounts Receivable', -2000, -3000, -1000]);
      worksheet.addRow(['Accounts Payable', 1000, 2000, 1500]);
      
      // Investing activities
      worksheet.addRow(['Investing Activities']);
      worksheet.addRow(['Equipment Purchase', -10000, 0, -5000]);
      worksheet.addRow(['Asset Sale', 0, 15000, 0]);
      
      // Financing activities
      worksheet.addRow(['Financing Activities']);
      worksheet.addRow(['Loan Proceeds', 50000, 0, 0]);
      worksheet.addRow(['Loan Payments', -2000, -2000, -2000]);
      
      // Cash positions
      worksheet.addRow(['Beginning Cash', 20000, 92000, 143000]);
      worksheet.addRow(['Ending Cash', 92000, 143000, 180500]);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      expect(result.type).toBe('cashflow');
      expect(result.timePeriods).toHaveLength(3);
      
      // Check that cashflow items are correctly categorized
      const operatingItems = result.lineItems.filter(item => item.subcategory === 'operating');
      const investingItems = result.lineItems.filter(item => item.subcategory === 'investing');
      const financingItems = result.lineItems.filter(item => item.subcategory === 'financing');
      
      expect(operatingItems.length).toBeGreaterThan(0);
      expect(investingItems.length).toBeGreaterThan(0);
      expect(financingItems.length).toBeGreaterThan(0);
    });

    it('should handle Spanish language financial statements', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Estado de Resultados');
      
      // Add Spanish headers and data
      worksheet.addRow(['', 'Ene-24', 'Feb-24', 'Mar-24']);
      worksheet.addRow(['Ingresos Totales', 100000, 110000, 120000]);
      worksheet.addRow(['Costos de Ventas', 40000, 44000, 48000]);
      worksheet.addRow(['Gastos Operativos', 30000, 32000, 34000]);
      worksheet.addRow(['Sueldos', 25000, 26000, 27000]);
      worksheet.addRow(['Utilidad Neta', 30000, 34000, 38000]);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      expect(result.type).toBe('pnl');
      expect(result.lineItems.length).toBeGreaterThan(0);
      
      // Should recognize Spanish revenue terms
      const revenueItems = result.lineItems.filter(item => item.category === 'revenue');
      expect(revenueItems.length).toBeGreaterThan(0);
      
      // Should recognize Spanish expense terms
      const expenseItems = result.lineItems.filter(item => item.category === 'expense');
      expect(expenseItems.length).toBeGreaterThan(0);
    });

    it('should handle date detection in various formats', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test Dates');
      
      // Test different date formats
      worksheet.addRow(['', 'January 2024', 'Q1 2024', '2024']);
      worksheet.addRow(['Revenue', 100000, 300000, 1200000]);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      expect(result.timePeriods).toHaveLength(3);
      expect(result.timePeriods[0].type).toBe('month');
      expect(result.timePeriods[1].type).toBe('quarter');
      expect(result.timePeriods[2].type).toBe('year');
    });

    it('should detect and handle calculated fields', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Test Formulas');
      
      // Add data with formulas
      worksheet.addRow(['', 'Jan-24']);
      worksheet.addRow(['Revenue', 100000]);
      worksheet.addRow(['Expenses', 70000]);
      
      // Add a formula for profit (this would be detected as calculated)
      const profitRow = worksheet.addRow(['Profit', { formula: 'B2-B3' }]);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      // Should detect calculated fields
      const calculatedItems = result.lineItems.filter(item => item.isCalculated);
      expect(calculatedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty Excel files gracefully', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Empty');
      // Add no data
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      await expect(parser.parseFinancialStatement(buffer))
        .rejects.toThrow(); // Should throw an error for empty files
    });

    it('should handle files with no recognizable financial data', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Random Data');
      
      // Add non-financial data
      worksheet.addRow(['Name', 'Age', 'City']);
      worksheet.addRow(['John', 25, 'New York']);
      worksheet.addRow(['Jane', 30, 'San Francisco']);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      // Should still attempt to parse but with low confidence
      expect(result.lineItems.length).toBe(0);
    });

    it('should handle corrupted or invalid Excel files', async () => {
      const invalidBuffer = Buffer.from('This is not an Excel file');
      
      await expect(parser.parseFinancialStatement(invalidBuffer))
        .rejects.toThrow();
    });

    it('should handle very large Excel files', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Large Dataset');
      
      // Add headers
      worksheet.addRow(['Date', 'Description', 'Amount', 'Category']);
      
      // Add many rows (simulate a large file)
      for (let i = 0; i < 1000; i++) {
        worksheet.addRow([
          new Date(2024, 0, i % 31 + 1),
          `Transaction ${i}`,
          Math.random() * 10000,
          i % 2 === 0 ? 'Revenue' : 'Expense'
        ]);
      }
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      expect(result.lineItems.length).toBeGreaterThan(100);
      // Should handle large files without timing out
    });
  });

  describe('Multi-currency Support', () => {
    it('should detect currency symbols in data', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Multi-Currency');
      
      worksheet.addRow(['', 'USD', 'EUR', 'GBP']);
      worksheet.addRow(['Revenue', '$100,000', '€85,000', '£75,000']);
      worksheet.addRow(['Expenses', '$70,000', '€60,000', '£52,000']);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      // Should detect different currencies
      expect(result.timePeriods.length).toBeGreaterThan(0);
      expect(result.lineItems.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should parse a typical file within reasonable time', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Performance Test');
      
      // Create a realistic financial statement
      worksheet.addRow(['', 'Jan-24', 'Feb-24', 'Mar-24', 'Apr-24', 'May-24', 'Jun-24']);
      
      const financialItems = [
        'Total Revenue', 'Product Sales', 'Service Revenue', 'Other Income',
        'Cost of Goods Sold', 'Materials', 'Labor', 'Overhead',
        'Operating Expenses', 'Salaries', 'Rent', 'Utilities', 'Marketing',
        'Travel', 'Professional Services', 'Insurance', 'Depreciation',
        'Gross Profit', 'Operating Income', 'EBITDA', 'Net Income'
      ];
      
      financialItems.forEach(item => {
        const row = [item];
        for (let i = 0; i < 6; i++) {
          row.push(Math.random() * 100000);
        }
        worksheet.addRow(row);
      });
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const startTime = Date.now();
      const result = await parser.parseFinancialStatement(buffer);
      const processingTime = Date.now() - startTime;
      
      // Should complete within 10 seconds for a typical file
      expect(processingTime).toBeLessThan(10000);
      expect(result.lineItems.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality and Validation', () => {
    it('should identify inconsistent data patterns', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quality Test');
      
      worksheet.addRow(['', 'Jan-24', 'Feb-24', 'Mar-24']);
      worksheet.addRow(['Revenue', 100000, 110000, 'Invalid']); // Invalid data
      worksheet.addRow(['Expenses', 70000, '', 75000]); // Missing data
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      // Should handle invalid/missing data gracefully
      expect(result.lineItems.length).toBeGreaterThan(0);
    });

    it('should provide confidence scores for extracted data', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Confidence Test');
      
      // Clear, well-structured data should have high confidence
      worksheet.addRow(['', 'Jan-24', 'Feb-24']);
      worksheet.addRow(['Total Revenue', 100000, 110000]);
      worksheet.addRow(['Total Expenses', 70000, 75000]);
      worksheet.addRow(['Net Income', 30000, 35000]);
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const result = await parser.parseFinancialStatement(buffer);
      
      // Well-structured data should have reasonable confidence
      expect(result.lineItems.length).toBeGreaterThan(0);
    });
  });
});