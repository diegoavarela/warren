import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

interface MonthlyExcelData {
  month: string;
  column: string;
  columnIndex: number;
  excelCells: { [key: string]: { description: string; rawValue: number | undefined; formatted: string; } };
  calculatedByWidget: {
    dividendIncome: { formula: string; calculation: string; result: number; };
    investmentFees: { formula: string; calculation: string; result: number; };
    portfolioValue: { formula: string; calculation: string | number; result: number; };
    netReturn: { formula: string; calculation: string; result: number; };
  };
}

export class ExcelMappingController {
  
  async showInvestmentDataMapping(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      console.log('=== EXCEL INVESTMENT DATA MAPPING ===');
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return res.status(400).json({
          success: false,
          error: 'No worksheet found'
        });
      }

      // Show exactly what's in the investment-related rows
      const mappingInfo = {
        dataSource: 'Cashflow_2025.xlsx - Worksheet 1',
        dateRow: 3,
        investmentRows: {
          row21: {
            rowNumber: 21,
            description: worksheet.getRow(21).getCell(1).value,
            purpose: 'Galicia Portfolio Income',
            note: 'Used for dividend income calculation'
          },
          row22: {
            rowNumber: 22,
            description: worksheet.getRow(22).getCell(1).value,
            purpose: 'Balanz Portfolio Income', 
            note: 'Used for dividend income calculation'
          },
          row23: {
            rowNumber: 23,
            description: worksheet.getRow(23).getCell(1).value,
            purpose: 'Total Investment Income',
            note: 'Used for total portfolio value'
          }
        },
        feeRows: {
          row88: {
            rowNumber: 88,
            description: worksheet.getRow(88).getCell(1).value,
            purpose: 'Bank Expenses (Detail)',
            note: 'Banking costs related to investments'
          },
          row99: {
            rowNumber: 99,
            description: worksheet.getRow(99).getCell(1).value,
            purpose: 'Total Bank Expenses',
            note: 'PRIMARY SOURCE for Investment Fees'
          }
        },
        monthlyData: [] as MonthlyExcelData[]
      };

      // Extract dates and show data for each month
      const dateRow = worksheet.getRow(3);
      const months: MonthlyExcelData[] = [];
      
      for (let col = 2; col <= 16; col++) {
        const dateCell = dateRow.getCell(col).value;
        
        if (dateCell === 'Dollars' || (typeof dateCell === 'string' && dateCell.includes('Dollar'))) {
          break;
        }
        
        if (dateCell instanceof Date) {
          const monthName = format(dateCell, 'MMMM yyyy');
          const columnLetter = String.fromCharCode(64 + col);
          
          // Get actual values from each relevant row
          const galiciaValue = this.getCellValue(worksheet, 21, col);
          const balanzValue = this.getCellValue(worksheet, 22, col);
          const totalInvestmentValue = this.getCellValue(worksheet, 23, col);
          const bankExpenseRow88 = this.getCellValue(worksheet, 88, col);
          const bankExpenseRow99 = this.getCellValue(worksheet, 99, col);
          
          // Show what the widget calculates
          const calculatedDividendIncome = (galiciaValue || 0) + (balanzValue || 0);
          const calculatedInvestmentFees = Math.abs(bankExpenseRow99 || 0);
          const calculatedNetReturn = calculatedDividendIncome - calculatedInvestmentFees;
          
          const monthData = {
            month: monthName,
            column: columnLetter,
            columnIndex: col,
            excelCells: {
              [`${columnLetter}21`]: {
                description: 'Galicia Portfolio',
                rawValue: galiciaValue,
                formatted: galiciaValue ? galiciaValue.toLocaleString() : '0'
              },
              [`${columnLetter}22`]: {
                description: 'Balanz Portfolio', 
                rawValue: balanzValue,
                formatted: balanzValue ? balanzValue.toLocaleString() : '0'
              },
              [`${columnLetter}23`]: {
                description: 'Total Investment',
                rawValue: totalInvestmentValue,
                formatted: totalInvestmentValue ? totalInvestmentValue.toLocaleString() : '0'
              },
              [`${columnLetter}88`]: {
                description: 'Bank Expenses (Detail)',
                rawValue: bankExpenseRow88,
                formatted: bankExpenseRow88 ? bankExpenseRow88.toLocaleString() : '0'
              },
              [`${columnLetter}99`]: {
                description: 'Total Bank Expenses',
                rawValue: bankExpenseRow99,
                formatted: bankExpenseRow99 ? bankExpenseRow99.toLocaleString() : '0'
              }
            },
            calculatedByWidget: {
              dividendIncome: {
                formula: `${columnLetter}21 + ${columnLetter}22`,
                calculation: `${galiciaValue || 0} + ${balanzValue || 0}`,
                result: calculatedDividendIncome
              },
              investmentFees: {
                formula: `ABS(${columnLetter}99)`,
                calculation: `Math.abs(${bankExpenseRow99 || 0})`,
                result: calculatedInvestmentFees
              },
              portfolioValue: {
                formula: `${columnLetter}23 OR (${columnLetter}21 + ${columnLetter}22)`,
                calculation: totalInvestmentValue || calculatedDividendIncome,
                result: totalInvestmentValue || calculatedDividendIncome
              },
              netReturn: {
                formula: 'Dividend Income - Investment Fees',
                calculation: `${calculatedDividendIncome} - ${calculatedInvestmentFees}`,
                result: calculatedNetReturn
              }
            }
          };
          
          months.push(monthData);
        }
      }

      mappingInfo.monthlyData = months;

      // Find which month the widget is actually displaying
      const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
      let selectedMonth = months.find(m => m.month.includes(currentMonthName));
      
      if (!selectedMonth || (!selectedMonth.calculatedByWidget.portfolioValue.result && !selectedMonth.calculatedByWidget.dividendIncome.result)) {
        // Find the latest month with actual data
        for (let i = months.length - 1; i >= 0; i--) {
          const month = months[i];
          if (month.calculatedByWidget.portfolioValue.result > 0 || month.calculatedByWidget.dividendIncome.result > 0) {
            selectedMonth = month;
            break;
          }
        }
      }

      console.log('\n=== WIDGET IS DISPLAYING DATA FROM ===');
      if (selectedMonth) {
        console.log(`Month: ${selectedMonth.month}`);
        console.log(`Excel Column: ${selectedMonth.column}`);
        console.log(`Dividend Income: ${selectedMonth.calculatedByWidget.dividendIncome.result.toLocaleString()}`);
        console.log(`Investment Fees: ${selectedMonth.calculatedByWidget.investmentFees.result.toLocaleString()}`);
        console.log(`Portfolio Value: ${selectedMonth.calculatedByWidget.portfolioValue.result.toLocaleString()}`);
      }

      res.json({
        success: true,
        message: 'Investment data mapping analysis completed',
        data: {
          mapping: mappingInfo,
          widgetDisplaysDataFrom: selectedMonth,
          interpretation: {
            dividendIncomeSource: 'Sum of cells from rows 21 (Galicia) + 22 (Balanz)',
            investmentFeesSource: 'Absolute value from row 99 (Total Bank Expenses)',
            portfolioValueSource: 'Row 23 (Total Investment) or fallback to dividend income sum',
            noteAboutAccuracy: 'Please verify if row 99 actually represents investment-related fees vs general bank expenses'
          }
        }
      });

    } catch (error) {
      console.error('Excel mapping error:', error);
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
        return typeof value.result === 'number' ? value.result : undefined;
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}