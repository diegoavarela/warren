import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { OperationalData, InvestmentData, BankData, TaxData, ExtendedFinancialData, FinancialSummary } from '../interfaces/FinancialData';
import { logger } from '../utils/logger';

export class ExtendedFinancialService {
  private static instance: ExtendedFinancialService;
  private storedExtendedData: ExtendedFinancialData = {
    operational: [],
    investments: [],
    banks: [],
    taxes: []
  };

  private constructor() {}

  static getInstance(): ExtendedFinancialService {
    if (!ExtendedFinancialService.instance) {
      ExtendedFinancialService.instance = new ExtendedFinancialService();
    }
    return ExtendedFinancialService.instance;
  }
  
  /**
   * Parse extended financial data from Excel worksheet
   * This method looks for operational costs, banking, and tax information
   */
  parseExtendedFinancialData(worksheet: ExcelJS.Worksheet): ExtendedFinancialData {
    logger.info('Parsing extended financial data (operational costs, banks, taxes)...');
    
    try {
      // Extract dates from row 3 (same as cashflow parsing)
      const dateRow = worksheet.getRow(3);
      const dates: Array<{columnIndex: number, date: Date, monthName: string}> = [];
      
      // Extract dates from columns 2-16 (Peso section)
      for (let i = 2; i <= 16; i++) {
        const dateCell = dateRow.getCell(i).value;
        
        if (dateCell === 'Dollars' || (typeof dateCell === 'string' && dateCell.includes('Dollar'))) {
          break;
        }
        
        if (dateCell instanceof Date) {
          const monthName = format(dateCell, 'MMMM');
          dates.push({
            columnIndex: i,
            date: dateCell,
            monthName: monthName
          });
        }
      }
      
      const operational = this.parseOperationalData(worksheet, dates);
      const investments = this.parseInvestmentData(worksheet, dates);
      const banks = this.parseBankData(worksheet, dates);
      const taxes = this.parseTaxData(worksheet, dates);
      
      // Store the parsed data
      this.storedExtendedData = { 
        operational, 
        investments,
        banks, 
        taxes 
      };
      
      return this.storedExtendedData;
      
    } catch (error) {
      logger.error('Error parsing extended financial data:', error);
      return { operational: [], investments: [], banks: [], taxes: [] };
    }
  }

  /**
   * Get stored extended financial data
   */
  getStoredExtendedData(): ExtendedFinancialData {
    return this.storedExtendedData;
  }
  
  /**
   * Clear stored extended financial data
   */
  clearStoredData(): void {
    this.storedExtendedData = {
      operational: [],
      investments: [],
      banks: [],
      taxes: []
    };
    logger.info('Extended financial data cleared');
  }
  
  /**
   * Parse operational data from specific rows using actual Excel structure
   */
  private parseOperationalData(worksheet: ExcelJS.Worksheet, dates: Array<{columnIndex: number, date: Date, monthName: string}>): OperationalData[] {
    const operational: OperationalData[] = [];
    
    // Define row numbers for operational data based on your Excel file
    const operationalRows = {
      totalOpex: 52,           // G52 - Total OpEx
      totalTaxes: 87,          // G87 - Total Taxes  
      totalWages: 79,          // G79 - Total Wages
      totalBankAndTaxes: 99,   // G99 - Bank & Taxes
    };
    
    for (const dateInfo of dates) {
      const opData: OperationalData = {
        month: dateInfo.monthName,
        date: dateInfo.date,
      };
      
      try {
        // Extract operational cost values from specified rows
        opData.totalOpex = this.getCellValue(worksheet, operationalRows.totalOpex, dateInfo.columnIndex);
        opData.totalTaxes = this.getCellValue(worksheet, operationalRows.totalTaxes, dateInfo.columnIndex);
        opData.totalWages = this.getCellValue(worksheet, operationalRows.totalWages, dateInfo.columnIndex);
        opData.totalBankAndTaxes = this.getCellValue(worksheet, operationalRows.totalBankAndTaxes, dateInfo.columnIndex);
        
        // Calculate total operational costs (all values should be negative, so we sum them)
        opData.totalOperationalCosts = (opData.totalOpex || 0) + 
                                     (opData.totalTaxes || 0) + 
                                     (opData.totalWages || 0) + 
                                     (opData.totalBankAndTaxes || 0);
        
        operational.push(opData);
        
        logger.info(`Parsed operational data for ${dateInfo.monthName} (Column ${dateInfo.columnIndex}):`, {
          totalOpex: opData.totalOpex,
          totalTaxes: opData.totalTaxes,
          totalWages: opData.totalWages,
          totalBankAndTaxes: opData.totalBankAndTaxes,
          totalOperationalCosts: opData.totalOperationalCosts,
          columnLetter: String.fromCharCode(64 + dateInfo.columnIndex)
        });
        
      } catch (error) {
        logger.warn(`Error parsing operational data for ${dateInfo.monthName}:`, error);
      }
    }
    
    return operational;
  }

  /**
   * Parse investment data from specific rows
   * You'll need to update these row numbers based on your Excel structure
   */
  private parseInvestmentData(worksheet: ExcelJS.Worksheet, dates: Array<{columnIndex: number, date: Date, monthName: string}>): InvestmentData[] {
    const investments: InvestmentData[] = [];
    
    console.log('\n=== PARSE INVESTMENT DATA START ===');
    console.log(`Processing ${dates.length} months of investment data`);
    
    // Define row numbers for investment data based on Excel structure
    const investmentRows = {
      investmentRow1: 21,       // First investment row
      investmentRow2: 22,       // Second investment row
      totalInvestment: 23,      // Total investment row
      stockPortfolio: 21,       // Using row 21 for stock portfolio
      bondPortfolio: 22,        // Using row 22 for bonds/other investments
    };
    
    // Check what's actually in these rows
    const row21Desc = worksheet.getRow(21).getCell(1).value;
    const row22Desc = worksheet.getRow(22).getCell(1).value;
    const row23Desc = worksheet.getRow(23).getCell(1).value;
    const row88Desc = worksheet.getRow(88).getCell(1).value;
    const row99Desc = worksheet.getRow(99).getCell(1).value;
    
    console.log('Investment rows content check:');
    console.log(`  Row 21: "${row21Desc}"`);
    console.log(`  Row 22: "${row22Desc}"`);
    console.log(`  Row 23: "${row23Desc}"`);
    console.log(`  Row 88: "${row88Desc}"`);
    console.log(`  Row 99: "${row99Desc}"`);
    
    logger.info('Investment rows content check:', {
      row21: { rowNum: 21, description: row21Desc },
      row22: { rowNum: 22, description: row22Desc },
      row23: { rowNum: 23, description: row23Desc },
      row88: { rowNum: 88, description: row88Desc },
      row99: { rowNum: 99, description: row99Desc }
    });
    
    for (const dateInfo of dates) {
      console.log(`\n--- Processing ${dateInfo.monthName} (Column ${dateInfo.columnIndex}) ---`);
      
      const investment: InvestmentData = {
        month: dateInfo.monthName,
        date: dateInfo.date,
      };
      
      // Extract investment values from specified rows
      try {
        // Get individual investment values from rows 21-22
        investment.stockPortfolio = this.getCellValue(worksheet, investmentRows.stockPortfolio, dateInfo.columnIndex);
        investment.bondPortfolio = this.getCellValue(worksheet, investmentRows.bondPortfolio, dateInfo.columnIndex);
        
        console.log(`  Raw stockPortfolio (row 21): ${investment.stockPortfolio}`);
        console.log(`  Raw bondPortfolio (row 22): ${investment.bondPortfolio}`);
        
        // Get total investment from row 23
        const totalFromExcel = this.getCellValue(worksheet, investmentRows.totalInvestment, dateInfo.columnIndex);
        console.log(`  Raw totalFromExcel (row 23): ${totalFromExcel}`);
        
        // Use the total from Excel if available, otherwise calculate
        investment.totalInvestmentValue = totalFromExcel || 
                                        ((investment.stockPortfolio || 0) + 
                                         (investment.bondPortfolio || 0));
        
        // Set other investment fields
        investment.realEstate = 0;
        
        // Get dividend income from investment income rows (21-23)
        const galiciaIncome = this.getCellValue(worksheet, 21, dateInfo.columnIndex) || 0;
        const balanzIncome = this.getCellValue(worksheet, 22, dateInfo.columnIndex) || 0;
        investment.dividendInflow = galiciaIncome + balanzIncome;
        
        console.log(`  Raw galiciaIncome (row 21): ${galiciaIncome}`);
        console.log(`  Raw balanzIncome (row 22): ${balanzIncome}`);
        console.log(`  Calculated dividendInflow: ${investment.dividendInflow}`);
        
        // Investment fees: Since your Excel doesn't have specific investment fees,
        // we'll set this to 0 rather than incorrectly using total bank expenses
        // TODO: If you want to allocate a percentage of bank expenses to investments,
        // we can add that logic here
        investment.investmentFees = 0;
        
        console.log(`  Investment fees set to 0 (no specific investment fees in Excel)`);
        console.log(`  Final totalInvestmentValue: ${investment.totalInvestmentValue}`);
        
        investments.push(investment);
        
        // Enhanced logging for investment values
        logger.info(`Investment data for ${dateInfo.monthName} (Column ${dateInfo.columnIndex}):`, {
          stockPortfolio: investment.stockPortfolio,
          bondPortfolio: investment.bondPortfolio,
          totalInvestmentValue: investment.totalInvestmentValue,
          dividendInflow: investment.dividendInflow,
          investmentFees: investment.investmentFees,
          galiciaIncome: galiciaIncome,
          balanzIncome: balanzIncome,
          totalFromExcel: totalFromExcel,
          columnLetter: String.fromCharCode(64 + dateInfo.columnIndex),
          note: 'Investment fees set to 0 - no specific fees in Excel'
        });
      } catch (error) {
        logger.warn(`Error parsing investment data for ${dateInfo.monthName}:`, error);
      }
    }
    
    // Log summary of investment values to identify the issue
    if (investments.length > 1) {
      const allValues = investments
        .map(inv => inv.totalInvestmentValue)
        .filter((val): val is number => val !== undefined);
      const uniqueValues = [...new Set(allValues)];
      
      if (allValues.length > 0) {
        if (uniqueValues.length === 1) {
          logger.warn('WARNING: All investment portfolio values are identical across all months!', {
            value: uniqueValues[0],
            months: investments.length,
            details: investments.map(inv => ({
              month: inv.month,
              value: inv.totalInvestmentValue
            }))
          });
        } else {
          logger.info('Investment portfolio values vary across months', {
            uniqueValues: uniqueValues.length,
            range: {
              min: Math.min(...allValues),
              max: Math.max(...allValues)
            }
          });
        }
      }
    }
    
    return investments;
  }
  
  /**
   * Parse banking data from specific rows
   */
  private parseBankData(worksheet: ExcelJS.Worksheet, dates: Array<{columnIndex: number, date: Date, monthName: string}>): BankData[] {
    const banks: BankData[] = [];
    
    // Banking data rows 88-99, with row 99 being the total
    const bankRows = {
      // Individual bank expense categories (rows 88-98)
      bankExpense1: 88,
      bankExpense2: 89,
      bankExpense3: 90,
      bankExpense4: 91,
      bankExpense5: 92,
      bankExpense6: 93,
      bankExpense7: 94,
      bankExpense8: 95,
      bankExpense9: 96,
      bankExpense10: 97,
      bankExpense11: 98,
      totalBankExpenses: 99,  // Row 99 - total bank & taxes
    };
    
    for (const dateInfo of dates) {
      const bank: BankData = {
        month: dateInfo.monthName,
        date: dateInfo.date,
      };
      
      try {
        // Parse individual bank expenses from rows 88-98
        const expense1 = this.getCellValue(worksheet, bankRows.bankExpense1, dateInfo.columnIndex) || 0;
        const expense2 = this.getCellValue(worksheet, bankRows.bankExpense2, dateInfo.columnIndex) || 0;
        const expense3 = this.getCellValue(worksheet, bankRows.bankExpense3, dateInfo.columnIndex) || 0;
        const expense4 = this.getCellValue(worksheet, bankRows.bankExpense4, dateInfo.columnIndex) || 0;
        const expense5 = this.getCellValue(worksheet, bankRows.bankExpense5, dateInfo.columnIndex) || 0;
        const expense6 = this.getCellValue(worksheet, bankRows.bankExpense6, dateInfo.columnIndex) || 0;
        const expense7 = this.getCellValue(worksheet, bankRows.bankExpense7, dateInfo.columnIndex) || 0;
        const expense8 = this.getCellValue(worksheet, bankRows.bankExpense8, dateInfo.columnIndex) || 0;
        const expense9 = this.getCellValue(worksheet, bankRows.bankExpense9, dateInfo.columnIndex) || 0;
        const expense10 = this.getCellValue(worksheet, bankRows.bankExpense10, dateInfo.columnIndex) || 0;
        const expense11 = this.getCellValue(worksheet, bankRows.bankExpense11, dateInfo.columnIndex) || 0;
        
        // Get total bank expenses from row 99
        const totalBankExpenses = this.getCellValue(worksheet, bankRows.totalBankExpenses, dateInfo.columnIndex);
        
        // Store individual expenses and total
        bank.bankFees = Math.abs(totalBankExpenses || 0); // Convert negative to positive
        
        // Store individual expenses in a structured way
        (bank as any).individualExpenses = {
          expense1: Math.abs(expense1),
          expense2: Math.abs(expense2),
          expense3: Math.abs(expense3),
          expense4: Math.abs(expense4),
          expense5: Math.abs(expense5),
          expense6: Math.abs(expense6),
          expense7: Math.abs(expense7),
          expense8: Math.abs(expense8),
          expense9: Math.abs(expense9),
          expense10: Math.abs(expense10),
          expense11: Math.abs(expense11),
        };
        
        // Set some reasonable defaults for other fields
        bank.checkingBalance = 0; // Not available in current Excel structure
        bank.savingsBalance = 0;  // Not available in current Excel structure
        bank.interestEarned = 0;  // Not available in current Excel structure
        
        banks.push(bank);
        
        logger.info(`Parsed bank data for ${dateInfo.monthName} (Column ${dateInfo.columnIndex}):`, {
          bankFees: bank.bankFees,
          totalBankExpenses: totalBankExpenses,
          individualExpenses: (bank as any).individualExpenses,
          columnLetter: String.fromCharCode(64 + dateInfo.columnIndex)
        });
        
      } catch (error) {
        logger.warn(`Error parsing bank data for ${dateInfo.monthName}:`, error);
      }
    }
    
    return banks;
  }
  
  /**
   * Parse tax data from specific rows
   */
  private parseTaxData(worksheet: ExcelJS.Worksheet, dates: Array<{columnIndex: number, date: Date, monthName: string}>): TaxData[] {
    const taxes: TaxData[] = [];
    
    // Row 87 contains total taxes
    const taxRows = {
      totalTaxes: 87,
    };
    
    for (const dateInfo of dates) {
      const tax: TaxData = {
        month: dateInfo.monthName,
        date: dateInfo.date,
      };
      
      try {
        // Get total tax burden from row 87
        const totalTaxes = this.getCellValue(worksheet, taxRows.totalTaxes, dateInfo.columnIndex);
        tax.totalTaxBurden = Math.abs(totalTaxes || 0); // Convert negative to positive for display
        
        // Calculate an estimated effective tax rate (this would need revenue data to be accurate)
        // For now, we'll use a placeholder
        tax.effectiveTaxRate = 25.0; // Placeholder percentage
        
        taxes.push(tax);
        
        logger.info(`Parsed tax data for ${dateInfo.monthName} (Column ${dateInfo.columnIndex}):`, {
          totalTaxBurden: tax.totalTaxBurden,
          effectiveTaxRate: tax.effectiveTaxRate,
          columnLetter: String.fromCharCode(64 + dateInfo.columnIndex)
        });
        
      } catch (error) {
        logger.warn(`Error parsing tax data for ${dateInfo.monthName}:`, error);
      }
    }
    
    return taxes;
  }
  
  /**
   * Helper method to safely get cell value as number
   */
  private getCellValue(worksheet: ExcelJS.Worksheet, rowNumber: number, columnIndex: number): number | undefined {
    try {
      const row = worksheet.getRow(rowNumber);
      const cellValue = row.getCell(columnIndex).value;
      return typeof cellValue === 'number' ? cellValue : undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Generate summary statistics for all extended financial data
   */
  generateFinancialSummary(data: ExtendedFinancialData): FinancialSummary {
    const summary: FinancialSummary = {
      // Investment Summary
      totalInvestmentValue: 0,
      totalInvestmentReturn: 0,
      totalDividendInflow: 0,
      
      // Banking Summary
      totalCashBalance: 0,
      totalBankFees: 0,
      totalInterestEarned: 0,
      creditUtilization: 0,
      
      // Tax Summary
      totalTaxesPaid: 0,
      estimatedAnnualTaxLiability: 0,
      effectiveTaxRate: 0
    };
    
    // Calculate investment summaries
    if (data.investments.length > 0) {
      // Find current month data instead of just using the last month
      const now = new Date();
      const currentMonthName = format(now, 'MMMM');
      
      // Try to find current month, fallback to latest month with actual data
      let currentInvestment = data.investments.find(inv => inv.month === currentMonthName);
      
      // If current month not found or has no data, find the latest month with actual investment data
      if (!currentInvestment || !currentInvestment.totalInvestmentValue) {
        // Find the latest month with non-zero investment value
        for (let i = data.investments.length - 1; i >= 0; i--) {
          const investmentValue = data.investments[i].totalInvestmentValue;
          if (investmentValue && investmentValue > 0) {
            currentInvestment = data.investments[i];
            break;
          }
        }
        
        // If still no data found, use the last available month
        if (!currentInvestment) {
          currentInvestment = data.investments[data.investments.length - 1];
        }
      }
      
      summary.totalInvestmentValue = currentInvestment.totalInvestmentValue || 0;
      
      // For dividend inflow, show only the current month's dividend income (not cumulative)
      summary.totalDividendInflow = currentInvestment.dividendInflow || 0;
    }
    
    // Calculate banking summaries  
    if (data.banks.length > 0) {
      // Find current month bank data, similar to investment logic
      const now = new Date();
      const currentMonthName = format(now, 'MMMM');
      
      let currentBank = data.banks.find(bank => bank.month === currentMonthName);
      if (!currentBank) {
        // If current month not found, use the latest month with data
        currentBank = data.banks[data.banks.length - 1];
      }
      
      summary.totalCashBalance = (currentBank.checkingBalance || 0) + (currentBank.savingsBalance || 0);
      summary.totalBankFees = data.banks.reduce((sum, bank) => sum + (bank.bankFees || 0), 0);
      summary.totalInterestEarned = data.banks.reduce((sum, bank) => sum + (bank.interestEarned || 0), 0);
    }
    
    // Calculate tax summaries
    if (data.taxes.length > 0) {
      summary.totalTaxesPaid = data.taxes.reduce((sum, tax) => sum + (tax.totalTaxBurden || 0), 0);
      summary.estimatedAnnualTaxLiability = summary.totalTaxesPaid * (12 / data.taxes.length);
    }
    
    return summary;
  }

  /**
   * Get extended metrics data
   */
  getExtendedMetrics(): ExtendedFinancialData {
    return this.storedExtendedData;
  }
}