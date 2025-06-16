import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { logger } from '../utils/logger';

interface DebugInvestmentData {
  month: string;
  columnIndex: number;
  galiciaIncome: number;
  balanzIncome: number;
  totalDividendIncome: number;
  bankExpenseRow88: number;
  bankExpenseRow99: number;
  investmentFees: number;
  stockPortfolio: number;
  bondPortfolio: number;
  totalPortfolioValue: number;
}

export class DebugController {
  
  async debugInvestmentParsing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      console.log('=== STARTING INVESTMENT DEBUG PARSING ===');
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return res.status(400).json({
          success: false,
          error: 'No worksheet found'
        });
      }

      // Debug: Check what's in the key rows
      console.log('\n=== ROW CONTENT ANALYSIS ===');
      for (let row = 20; row <= 25; row++) {
        const rowData = worksheet.getRow(row);
        const description = rowData.getCell(1).value;
        console.log(`Row ${row}: "${description}"`);
      }
      
      for (let row = 85; row <= 100; row++) {
        const rowData = worksheet.getRow(row);
        const description = rowData.getCell(1).value;
        if (description && description.toString().toLowerCase().includes('bank')) {
          console.log(`Row ${row}: "${description}"`);
        }
      }

      // Extract dates from row 3
      const dateRow = worksheet.getRow(3);
      const dates: Array<{columnIndex: number, date: Date, monthName: string}> = [];
      
      console.log('\n=== DATE EXTRACTION ===');
      for (let i = 2; i <= 16; i++) {
        const dateCell = dateRow.getCell(i).value;
        
        if (dateCell === 'Dollars' || (typeof dateCell === 'string' && dateCell.includes('Dollar'))) {
          console.log(`Column ${i}: Found "Dollars" - stopping date extraction`);
          break;
        }
        
        if (dateCell instanceof Date) {
          const monthName = format(dateCell, 'MMMM');
          dates.push({
            columnIndex: i,
            date: dateCell,
            monthName: monthName
          });
          console.log(`Column ${i}: ${monthName} ${dateCell.getFullYear()}`);
        } else {
          console.log(`Column ${i}: Not a date - "${dateCell}"`);
        }
      }

      // Parse investment data for each month
      const debugData: DebugInvestmentData[] = [];
      let totalExpectedDividends = 0;
      let totalExpectedFees = 0;

      console.log('\n=== INVESTMENT DATA PARSING ===');
      
      for (const dateInfo of dates) {
        console.log(`\n--- Processing ${dateInfo.monthName} (Column ${dateInfo.columnIndex}) ---`);
        
        // Get dividend income
        const galiciaIncome = this.getCellValue(worksheet, 21, dateInfo.columnIndex);
        const balanzIncome = this.getCellValue(worksheet, 22, dateInfo.columnIndex);
        const totalDividendIncome = (galiciaIncome || 0) + (balanzIncome || 0);
        
        // Get investment fees
        const bankExpenseRow88 = this.getCellValue(worksheet, 88, dateInfo.columnIndex);
        const bankExpenseRow99 = this.getCellValue(worksheet, 99, dateInfo.columnIndex);
        const investmentFees = Math.abs(bankExpenseRow99 || 0);
        
        // Get portfolio values
        const stockPortfolio = this.getCellValue(worksheet, 21, dateInfo.columnIndex);
        const bondPortfolio = this.getCellValue(worksheet, 22, dateInfo.columnIndex);
        const totalFromRow23 = this.getCellValue(worksheet, 23, dateInfo.columnIndex);
        const totalPortfolioValue = totalFromRow23 || ((stockPortfolio || 0) + (bondPortfolio || 0));
        
        const monthData: DebugInvestmentData = {
          month: dateInfo.monthName,
          columnIndex: dateInfo.columnIndex,
          galiciaIncome: galiciaIncome || 0,
          balanzIncome: balanzIncome || 0,
          totalDividendIncome,
          bankExpenseRow88: bankExpenseRow88 || 0,
          bankExpenseRow99: bankExpenseRow99 || 0,
          investmentFees,
          stockPortfolio: stockPortfolio || 0,
          bondPortfolio: bondPortfolio || 0,
          totalPortfolioValue: totalPortfolioValue || 0
        };

        debugData.push(monthData);
        totalExpectedDividends += totalDividendIncome;
        totalExpectedFees += investmentFees;

        console.log(`  Galicia Income (Row 21): ${galiciaIncome}`);
        console.log(`  Balanz Income (Row 22): ${balanzIncome}`);
        console.log(`  Total Dividend Income: ${totalDividendIncome}`);
        console.log(`  Bank Expense Row 88: ${bankExpenseRow88}`);
        console.log(`  Bank Expense Row 99: ${bankExpenseRow99}`);
        console.log(`  Investment Fees: ${investmentFees}`);
        console.log(`  Stock Portfolio: ${stockPortfolio}`);
        console.log(`  Bond Portfolio: ${bondPortfolio}`);
        console.log(`  Total Portfolio Value: ${totalPortfolioValue}`);
      }

      // Calculate what should be displayed
      const latestMonth = debugData[debugData.length - 1];
      const averageMonthlyNetReturn = debugData.length > 0 
        ? debugData.reduce((sum, item) => sum + (item.totalDividendIncome - item.investmentFees), 0) / debugData.length
        : 0;

      console.log('\n=== EXPECTED WIDGET VALUES ===');
      console.log(`Latest Month: ${latestMonth?.month}`);
      console.log(`Expected Dividend Income: ${latestMonth?.totalDividendIncome?.toLocaleString() || 0}`);
      console.log(`Expected Investment Fees: ${latestMonth?.investmentFees?.toLocaleString() || 0}`);
      console.log(`Expected Total Portfolio Value: ${latestMonth?.totalPortfolioValue?.toLocaleString() || 0}`);
      console.log(`Expected YTD Total Dividends: ${totalExpectedDividends.toLocaleString()}`);
      console.log(`Expected YTD Total Fees: ${totalExpectedFees.toLocaleString()}`);
      console.log(`Expected Avg Monthly Net Return: ${averageMonthlyNetReturn.toLocaleString()}`);

      res.json({
        success: true,
        message: 'Investment parsing debug completed',
        data: {
          totalMonthsParsed: debugData.length,
          monthlyBreakdown: debugData,
          expectedWidgetValues: {
            latestMonth: latestMonth?.month,
            dividendIncome: latestMonth?.totalDividendIncome || 0,
            investmentFees: latestMonth?.investmentFees || 0,
            totalPortfolioValue: latestMonth?.totalPortfolioValue || 0,
            ytdTotalDividends: totalExpectedDividends,
            ytdTotalFees: totalExpectedFees,
            averageMonthlyNetReturn: averageMonthlyNetReturn
          }
        }
      });

    } catch (error) {
      console.error('Debug parsing error:', error);
      next(error);
    }
  }

  private getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): number | undefined {
    try {
      const cell = worksheet.getRow(row).getCell(col);
      const value = cell.value;
      
      if (typeof value === 'number') {
        return value;
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      } else if (value && typeof value === 'object' && 'result' in value) {
        // Handle formula cells
        return typeof value.result === 'number' ? value.result : undefined;
      }
      
      return undefined;
    } catch (error) {
      console.warn(`Error getting cell value at ${row},${col}:`, error);
      return undefined;
    }
  }
}