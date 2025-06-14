import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { OperationalData, InvestmentData, BankData, TaxData, ExtendedFinancialData, FinancialSummary } from '../interfaces/FinancialData';
import { logger } from '../utils/logger';

export class ExtendedFinancialService {
  private storedExtendedData: ExtendedFinancialData = {
    operational: [],
    investments: [],
    banks: [],
    taxes: []
  };
  
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
      const banks = this.parseBankData(worksheet, dates);
      const taxes = this.parseTaxData(worksheet, dates);
      
      // Store the parsed data
      this.storedExtendedData = { 
        operational, 
        investments: [], // Not implemented yet
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
    
    // Define row numbers for investment data (these are examples - you'll need to provide actual row numbers)
    const investmentRows = {
      stockPortfolio: 120,      // Example row number
      bondPortfolio: 121,       // Example row number  
      realEstate: 122,          // Example row number
      dividendInflow: 123,      // Example row number
      investmentFees: 124,      // Example row number
    };
    
    for (const dateInfo of dates) {
      const investment: InvestmentData = {
        month: dateInfo.monthName,
        date: dateInfo.date,
      };
      
      // Extract investment values from specified rows
      try {
        investment.stockPortfolio = this.getCellValue(worksheet, investmentRows.stockPortfolio, dateInfo.columnIndex);
        investment.bondPortfolio = this.getCellValue(worksheet, investmentRows.bondPortfolio, dateInfo.columnIndex);
        investment.realEstate = this.getCellValue(worksheet, investmentRows.realEstate, dateInfo.columnIndex);
        investment.dividendInflow = this.getCellValue(worksheet, investmentRows.dividendInflow, dateInfo.columnIndex);
        investment.investmentFees = this.getCellValue(worksheet, investmentRows.investmentFees, dateInfo.columnIndex);
        
        // Calculate derived values
        investment.totalInvestmentValue = (investment.stockPortfolio || 0) + 
                                        (investment.bondPortfolio || 0) + 
                                        (investment.realEstate || 0);
        
        investments.push(investment);
      } catch (error) {
        logger.warn(`Error parsing investment data for ${dateInfo.monthName}:`, error);
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
      const latestInvestment = data.investments[data.investments.length - 1];
      summary.totalInvestmentValue = latestInvestment.totalInvestmentValue || 0;
      summary.totalDividendInflow = data.investments.reduce((sum, inv) => sum + (inv.dividendInflow || 0), 0);
    }
    
    // Calculate banking summaries  
    if (data.banks.length > 0) {
      const latestBank = data.banks[data.banks.length - 1];
      summary.totalCashBalance = (latestBank.checkingBalance || 0) + (latestBank.savingsBalance || 0);
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
}