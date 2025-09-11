import 'server-only';
import { 
  QBReport, 
  QBProfitLossReport, 
  QBBalanceSheetReport,
  QBReportRow,
  QBDataTransformResult,
  WarrenCategoryMapping,
  DEFAULT_QB_MAPPINGS
} from '@/lib/types/quickbooks';
import { ProcessedData } from '@/lib/types/configurations';

/**
 * QuickBooks Data Transformer
 * Converts QuickBooks report data to Warren's expected format
 */
export class QuickBooksDataTransformer {
  private mappings: Map<string, WarrenCategoryMapping>;

  constructor(customMappings?: WarrenCategoryMapping[]) {
    this.mappings = new Map();
    
    // Load default mappings
    Object.values(DEFAULT_QB_MAPPINGS).forEach(mapping => {
      this.mappings.set(mapping.qbAccountName.toLowerCase(), mapping);
    });

    // Override with custom mappings
    if (customMappings) {
      customMappings.forEach(mapping => {
        this.mappings.set(mapping.qbAccountName.toLowerCase(), mapping);
      });
    }
  }

  /**
   * Transform QuickBooks P&L report to Warren format
   */
  async transformProfitLoss(
    qbReport: QBProfitLossReport,
    companyId: string
  ): Promise<QBDataTransformResult> {
    try {
      const periods = this.extractPeriods(qbReport);
      const transformedData = this.processPLRows(qbReport.Rows.Row, periods);
      
      // Calculate derived metrics
      const calculatedMetrics = this.calculatePLMetrics(transformedData);
      
      // Format as Warren ProcessedData
      const warrenData: ProcessedData = {
        type: 'pnl',
        periods: periods.map(p => ({
          column: p.columnIndex.toString(),
          period: {
            type: 'month',
            year: new Date(p.date).getFullYear(),
            month: new Date(p.date).getMonth() + 1,
            label: p.label,
          }
        })),
        data: {
          // Revenue section
          totalRevenue: transformedData.totalRevenue,
          grossIncome: transformedData.totalRevenue,
          
          // Cost section
          cogs: transformedData.totalCOGS,
          totalOpex: transformedData.totalExpenses,
          totalOutcome: transformedData.totalCOGS + transformedData.totalExpenses,
          
          // Calculated metrics
          grossProfit: calculatedMetrics.grossProfit,
          grossMargin: calculatedMetrics.grossMargin,
          ebitda: calculatedMetrics.ebitda,
          ebitdaMargin: calculatedMetrics.ebitdaMargin,
          earningsBeforeTaxes: calculatedMetrics.earningsBeforeTaxes,
          netIncome: calculatedMetrics.netIncome,
          
          // Other categories
          otherIncome: transformedData.otherIncome,
          otherExpenses: transformedData.otherExpenses,
          taxes: transformedData.taxes,
        },
        metadata: {
          source: 'quickbooks',
          qbCompanyId: qbReport.Header.Option?.find(o => o.Name === 'RealmId')?.Value || '',
          transformedAt: new Date().toISOString(),
          periodStart: qbReport.Header.StartPeriod || '',
          periodEnd: qbReport.Header.EndPeriod || '',
          currency: qbReport.Header.Currency || 'USD'
        }
      };

      return {
        success: true,
        data: warrenData,
        metadata: {
          qbCompanyId: qbReport.Header.Option?.find(o => o.Name === 'RealmId')?.Value || '',
          reportType: 'pnl',
          periodStart: qbReport.Header.StartPeriod || '',
          periodEnd: qbReport.Header.EndPeriod || '',
          transformedAt: new Date().toISOString(),
          recordCount: qbReport.Rows.Row.length
        }
      };

    } catch (error) {
      console.error('Error transforming QB P&L data:', error);
      return {
        success: false,
        error: `Failed to transform P&L data: ${error.message}`,
        metadata: {
          qbCompanyId: '',
          reportType: 'pnl',
          periodStart: '',
          periodEnd: '',
          transformedAt: new Date().toISOString(),
          recordCount: 0
        }
      };
    }
  }

  /**
   * Derive Cash Flow from P&L and Balance Sheet
   * Since QB Online may not provide direct cash flow reports
   */
  async deriveCashFlow(
    qbPL: QBProfitLossReport,
    qbBS: QBBalanceSheetReport,
    companyId: string
  ): Promise<QBDataTransformResult> {
    try {
      const periods = this.extractPeriods(qbPL);
      
      // Extract key cash flow components
      const netIncome = this.extractNetIncome(qbPL);
      const depreciation = this.extractDepreciation(qbPL);
      const workingCapitalChanges = this.calculateWorkingCapitalChanges(qbBS);
      
      // Calculate cash flow components
      const operatingCashFlow = netIncome + depreciation + workingCapitalChanges;
      const investingCashFlow = this.extractInvestingActivities(qbBS);
      const financingCashFlow = this.extractFinancingActivities(qbBS);
      
      const totalCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
      const initialCash = this.extractInitialCash(qbBS);
      const finalCash = initialCash + totalCashFlow;

      // Format as Warren ProcessedData
      const warrenData: ProcessedData = {
        type: 'cashflow',
        periods: periods.map(p => ({
          column: p.columnIndex.toString(),
          period: {
            type: 'month',
            year: new Date(p.date).getFullYear(),
            month: new Date(p.date).getMonth() + 1,
            label: p.label,
          }
        })),
        data: {
          initialBalance: initialCash,
          finalBalance: finalCash,
          totalInflows: Math.max(0, totalCashFlow),
          totalOutflows: Math.abs(Math.min(0, totalCashFlow)),
          monthlyGeneration: totalCashFlow,
          
          // Detailed categories
          operatingActivities: operatingCashFlow,
          investingActivities: investingCashFlow,
          financingActivities: financingCashFlow,
        },
        metadata: {
          source: 'quickbooks',
          qbCompanyId: qbPL.Header.Option?.find(o => o.Name === 'RealmId')?.Value || '',
          transformedAt: new Date().toISOString(),
          periodStart: qbPL.Header.StartPeriod || '',
          periodEnd: qbPL.Header.EndPeriod || '',
          currency: qbPL.Header.Currency || 'USD',
          derivationNote: 'Cash flow derived from P&L and Balance Sheet data'
        }
      };

      return {
        success: true,
        data: warrenData,
        metadata: {
          qbCompanyId: qbPL.Header.Option?.find(o => o.Name === 'RealmId')?.Value || '',
          reportType: 'cashflow',
          periodStart: qbPL.Header.StartPeriod || '',
          periodEnd: qbPL.Header.EndPeriod || '',
          transformedAt: new Date().toISOString(),
          recordCount: qbPL.Rows.Row.length + qbBS.Rows.Row.length
        }
      };

    } catch (error) {
      console.error('Error deriving cash flow data:', error);
      return {
        success: false,
        error: `Failed to derive cash flow: ${error.message}`,
        metadata: {
          qbCompanyId: '',
          reportType: 'cashflow',
          periodStart: '',
          periodEnd: '',
          transformedAt: new Date().toISOString(),
          recordCount: 0
        }
      };
    }
  }

  /**
   * Extract periods from QB report columns
   */
  private extractPeriods(report: QBReport): Array<{
    label: string;
    date: string;
    columnIndex: number;
  }> {
    const periods: Array<{ label: string; date: string; columnIndex: number; }> = [];
    
    if (report.Columns?.Column) {
      report.Columns.Column.forEach((column, index) => {
        if (column.ColType === 'Money' && column.ColTitle !== 'Total') {
          // Parse the column title to extract period info
          const periodLabel = column.ColTitle;
          const date = this.parsePeriodLabel(periodLabel);
          
          periods.push({
            label: periodLabel,
            date: date,
            columnIndex: index
          });
        }
      });
    }

    return periods;
  }

  /**
   * Process P&L rows and extract data by category
   */
  private processPLRows(rows: QBReportRow[], periods: any[]): {
    totalRevenue: number;
    totalCOGS: number;
    totalExpenses: number;
    otherIncome: number;
    otherExpenses: number;
    taxes: number;
  } {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    let otherIncome = 0;
    let otherExpenses = 0;
    let taxes = 0;

    const processRow = (row: QBReportRow, level: number = 0) => {
      if (row.ColData && row.ColData.length > 0) {
        const accountName = row.ColData[0]?.value || '';
        const amount = this.parseAmount(row.ColData[row.ColData.length - 1]?.value);

        // Categorize based on account name and QB structure
        if (this.isRevenueAccount(accountName, row.group)) {
          totalRevenue += amount;
        } else if (this.isCOGSAccount(accountName, row.group)) {
          totalCOGS += amount;
        } else if (this.isExpenseAccount(accountName, row.group)) {
          totalExpenses += amount;
        } else if (this.isOtherIncomeAccount(accountName, row.group)) {
          otherIncome += amount;
        } else if (this.isOtherExpenseAccount(accountName, row.group)) {
          otherExpenses += amount;
        } else if (this.isTaxAccount(accountName, row.group)) {
          taxes += amount;
        }
      }

      // Process nested rows
      if (row.Rows?.Row) {
        row.Rows.Row.forEach(subRow => processRow(subRow, level + 1));
      }
    };

    rows.forEach(row => processRow(row));

    return {
      totalRevenue,
      totalCOGS,
      totalExpenses,
      otherIncome,
      otherExpenses,
      taxes
    };
  }

  /**
   * Calculate derived P&L metrics
   */
  private calculatePLMetrics(data: any): {
    grossProfit: number;
    grossMargin: number;
    ebitda: number;
    ebitdaMargin: number;
    earningsBeforeTaxes: number;
    netIncome: number;
  } {
    const grossProfit = data.totalRevenue - data.totalCOGS;
    const grossMargin = data.totalRevenue !== 0 ? (grossProfit / data.totalRevenue) * 100 : 0;
    
    const ebitda = grossProfit - data.totalExpenses + data.otherIncome - data.otherExpenses;
    const ebitdaMargin = data.totalRevenue !== 0 ? (ebitda / data.totalRevenue) * 100 : 0;
    
    const earningsBeforeTaxes = ebitda;
    const netIncome = earningsBeforeTaxes - data.taxes;

    return {
      grossProfit,
      grossMargin,
      ebitda,
      ebitdaMargin,
      earningsBeforeTaxes,
      netIncome
    };
  }

  // Helper methods for categorizing accounts
  private isRevenueAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return group === 'Income' || 
           name.includes('income') || 
           name.includes('revenue') || 
           name.includes('sales');
  }

  private isCOGSAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return group === 'Cost of Goods Sold' || 
           name.includes('cost of goods') || 
           name.includes('cogs');
  }

  private isExpenseAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return group === 'Expenses' || 
           (!this.isCOGSAccount(accountName, group) && 
            !this.isOtherExpenseAccount(accountName, group) &&
            (name.includes('expense') || name.includes('cost')));
  }

  private isOtherIncomeAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return group === 'Other Income' || name.includes('other income');
  }

  private isOtherExpenseAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return group === 'Other Expenses' || name.includes('other expense');
  }

  private isTaxAccount(accountName: string, group?: string): boolean {
    const name = accountName.toLowerCase();
    return name.includes('tax') || name.includes('taxes');
  }

  // Helper methods for cash flow derivation
  private extractNetIncome(qbPL: QBProfitLossReport): number {
    // Find Net Income in the P&L report
    const findNetIncome = (rows: QBReportRow[]): number => {
      for (const row of rows) {
        if (row.ColData && row.ColData[0]?.value.toLowerCase().includes('net income')) {
          return this.parseAmount(row.ColData[row.ColData.length - 1]?.value);
        }
        if (row.Rows?.Row) {
          const result = findNetIncome(row.Rows.Row);
          if (result !== 0) return result;
        }
      }
      return 0;
    };

    return findNetIncome(qbPL.Rows.Row);
  }

  private extractDepreciation(qbPL: QBProfitLossReport): number {
    // Find depreciation expenses in P&L
    const findDepreciation = (rows: QBReportRow[]): number => {
      for (const row of rows) {
        if (row.ColData && row.ColData[0]?.value.toLowerCase().includes('depreciation')) {
          return this.parseAmount(row.ColData[row.ColData.length - 1]?.value);
        }
        if (row.Rows?.Row) {
          const result = findDepreciation(row.Rows.Row);
          if (result !== 0) return result;
        }
      }
      return 0;
    };

    return findDepreciation(qbPL.Rows.Row);
  }

  private calculateWorkingCapitalChanges(qbBS: QBBalanceSheetReport): number {
    // Simplified working capital change calculation
    // This would need more sophisticated logic in a real implementation
    return 0;
  }

  private extractInvestingActivities(qbBS: QBBalanceSheetReport): number {
    // Extract investing activities from balance sheet changes
    return 0;
  }

  private extractFinancingActivities(qbBS: QBBalanceSheetReport): number {
    // Extract financing activities from balance sheet changes
    return 0;
  }

  private extractInitialCash(qbBS: QBBalanceSheetReport): number {
    // Find cash and cash equivalents from balance sheet
    const findCash = (rows: QBReportRow[]): number => {
      for (const row of rows) {
        if (row.ColData && 
            (row.ColData[0]?.value.toLowerCase().includes('cash') ||
             row.ColData[0]?.value.toLowerCase().includes('checking'))) {
          return this.parseAmount(row.ColData[row.ColData.length - 1]?.value);
        }
        if (row.Rows?.Row) {
          const result = findCash(row.Rows.Row);
          if (result !== 0) return result;
        }
      }
      return 0;
    };

    return findCash(qbBS.Rows.Row);
  }

  /**
   * Parse period label to date
   */
  private parsePeriodLabel(label: string): string {
    // Handle various QB period formats
    if (label.match(/\w+ \d{4}/)) {
      // "Jan 2025" format
      return new Date(label).toISOString();
    } else if (label.match(/\d{1,2}\/\d{4}/)) {
      // "01/2025" format
      const [month, year] = label.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
    } else {
      // Default to current date if can't parse
      return new Date().toISOString();
    }
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr?: string): number {
    if (!amountStr) return 0;
    
    // Remove currency symbols, commas, and parentheses
    const cleanAmount = amountStr.replace(/[,$()]/g, '');
    
    // Handle negative numbers (often in parentheses in accounting)
    const isNegative = amountStr.includes('(') && amountStr.includes(')');
    const amount = parseFloat(cleanAmount) || 0;
    
    return isNegative ? -amount : amount;
  }

  /**
   * Update mappings
   */
  updateMappings(customMappings: WarrenCategoryMapping[]): void {
    customMappings.forEach(mapping => {
      this.mappings.set(mapping.qbAccountName.toLowerCase(), mapping);
    });
  }

  /**
   * Get current mappings
   */
  getMappings(): WarrenCategoryMapping[] {
    return Array.from(this.mappings.values());
  }
}

/**
 * Factory function to create transformer with custom mappings
 */
export function createQuickBooksTransformer(
  customMappings?: WarrenCategoryMapping[]
): QuickBooksDataTransformer {
  return new QuickBooksDataTransformer(customMappings);
}