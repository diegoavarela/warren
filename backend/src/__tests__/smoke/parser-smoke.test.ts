/**
 * Parser Smoke Tests
 * 
 * Basic smoke tests to verify the parser functionality works.
 * These tests use the existing parser without strict type checking.
 */

import { FinancialStatementParser } from '../../services/FinancialStatementParser';
import ExcelJS from 'exceljs';

describe('Parser Smoke Tests', () => {
  let parser: FinancialStatementParser;
  
  beforeEach(() => {
    parser = new FinancialStatementParser();
  });

  it('should initialize parser without errors', () => {
    expect(parser).toBeDefined();
    expect(typeof parser.parseFinancialStatement).toBe('function');
  });

  it('should parse a simple Excel file', async () => {
    // Create a minimal test Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');
    
    // Add some basic financial data
    worksheet.addRow(['Item', 'Amount']);
    worksheet.addRow(['Revenue', 100000]);
    worksheet.addRow(['Expenses', 70000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    // This should not throw an error
    const result = await parser.parseFinancialStatement(buffer);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.type).toBeDefined();
    expect(Array.isArray(result.lineItems)).toBe(true);
    expect(Array.isArray(result.timePeriods)).toBe(true);
  });

  it('should handle Excel files with monthly data', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Monthly');
    
    // Add monthly headers
    worksheet.addRow(['', 'Jan-24', 'Feb-24']);
    worksheet.addRow(['Revenue', 50000, 55000]);
    worksheet.addRow(['Expenses', 30000, 32000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parser.parseFinancialStatement(buffer);
    
    expect(result).toBeDefined();
    expect(result.timePeriods.length).toBeGreaterThanOrEqual(0);
    expect(result.lineItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect statement type', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('P&L');
    
    // Add P&L-like data
    worksheet.addRow(['', 'Amount']);
    worksheet.addRow(['Total Revenue', 100000]);
    worksheet.addRow(['Cost of Goods Sold', 40000]);
    worksheet.addRow(['Gross Profit', 60000]);
    worksheet.addRow(['Operating Expenses', 35000]);
    worksheet.addRow(['Net Income', 25000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parser.parseFinancialStatement(buffer);
    
    expect(result.type).toBeDefined();
    expect(['pnl', 'cashflow', 'balance_sheet']).toContain(result.type);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid data
    const invalidBuffer = Buffer.from('not an excel file');
    
    await expect(parser.parseFinancialStatement(invalidBuffer))
      .rejects.toThrow();
  });

  it('should process financial categories', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Categories');
    
    // Add various financial items
    worksheet.addRow(['', 'Amount']);
    worksheet.addRow(['Sales Revenue', 150000]);
    worksheet.addRow(['Service Revenue', 50000]);
    worksheet.addRow(['Salary Expenses', 80000]);
    worksheet.addRow(['Marketing Costs', 20000]);
    worksheet.addRow(['Office Rent', 15000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parser.parseFinancialStatement(buffer);
    
    // Should categorize items
    expect(result.lineItems.length).toBeGreaterThan(0);
    
    // Check if categories are assigned
    const categories = result.lineItems.map(item => item.category);
    const uniqueCategories = [...new Set(categories)];
    expect(uniqueCategories.length).toBeGreaterThan(0);
  });

  it('should handle different languages', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Spanish');
    
    // Add Spanish financial terms
    worksheet.addRow(['', 'Cantidad']);
    worksheet.addRow(['Ingresos', 100000]);
    worksheet.addRow(['Gastos', 70000]);
    worksheet.addRow(['Utilidad', 30000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parser.parseFinancialStatement(buffer);
    
    // Should parse without errors
    expect(result).toBeDefined();
    expect(result.lineItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should complete parsing within reasonable time', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance');
    
    // Add headers
    worksheet.addRow(['Item', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
    
    // Add multiple rows to test performance
    const items = [
      'Revenue', 'Product Sales', 'Service Sales', 'Other Income',
      'Cost of Sales', 'Labor Costs', 'Material Costs',
      'Operating Expenses', 'Salaries', 'Rent', 'Utilities',
      'Marketing', 'Insurance', 'Depreciation'
    ];
    
    items.forEach(item => {
      const amounts = Array(6).fill(0).map(() => Math.random() * 50000);
      worksheet.addRow([item, ...amounts]);
    });
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    const startTime = Date.now();
    const result = await parser.parseFinancialStatement(buffer);
    const duration = Date.now() - startTime;
    
    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);
    expect(result).toBeDefined();
    expect(result.lineItems.length).toBeGreaterThan(0);
  });

  it('should provide structured financial data', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Structured');
    
    worksheet.addRow(['', 'Q1-2024', 'Q2-2024']);
    worksheet.addRow(['Revenue', 300000, 350000]);
    worksheet.addRow(['Expenses', 200000, 220000]);
    worksheet.addRow(['Profit', 100000, 130000]);
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const result = await parser.parseFinancialStatement(buffer);
    
    // Should have structured data
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');
    
    // Should have time periods
    expect(Array.isArray(result.timePeriods)).toBe(true);
    
    // Should have line items with proper structure
    expect(Array.isArray(result.lineItems)).toBe(true);
    if (result.lineItems.length > 0) {
      const firstItem = result.lineItems[0];
      expect(firstItem).toHaveProperty('description');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('row');
      expect(firstItem).toHaveProperty('col');
      expect(firstItem).toHaveProperty('value');
    }
  });
});