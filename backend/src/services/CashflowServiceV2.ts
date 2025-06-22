import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ExtendedFinancialService } from './ExtendedFinancialService';
import { logger } from '../utils/logger';

interface MonthlyMetrics {
  date: Date;
  month: string;
  columnIndex: number;
  columnLetter: string;
  totalInflow: number;
  totalOutflow: number;
  finalBalance: number;
  lowestBalance: number;
  monthlyGeneration: number;
}

// Simple global storage for parsed data
let parsedMetrics: MonthlyMetrics[] = [];
let uploadedFileName: string = '';

export class CashflowServiceV2 {
  /**
   * Parse the Excel worksheet and extract monthly metrics
   */
  parseWorksheet(worksheet: ExcelJS.Worksheet, filename?: string): MonthlyMetrics[] {
    // Clear previous data
    parsedMetrics = [];
    
    // Store the filename
    if (filename) {
      uploadedFileName = filename;
    }
    
    // Define the exact row numbers from the Excel file
    const ROW_NUMBERS = {
      DATES: 3,           // Row 3: Month dates
      TOTAL_INFLOW: 24,   // Row 24: TOTAL INCOME
      TOTAL_OUTFLOW: 100, // Row 100: TOTAL EXPENSE  
      FINAL_BALANCE: 104, // Row 104: Final Balance
      LOWEST_BALANCE: 112, // Row 112: Lowest Balance of the month
      MONTHLY_GENERATION: 113 // Row 113: Monthly Cash Generation
    };
    
    // Find the Peso section columns (should be B through P)
    const dateRow = worksheet.getRow(ROW_NUMBERS.DATES);
    const monthColumns: Array<{col: number, date: Date, month: string}> = [];
    
    // Check columns B (2) through P (16) ONLY - DO NOT GO BEYOND
    for (let col = 2; col <= 16; col++) {
      const cellValue = dateRow.getCell(col).value;
      
      // Check if we hit "Dollars" or USD section
      if (cellValue === 'Dollars' || (typeof cellValue === 'string' && cellValue.includes('USD'))) {
        break;
      }
      
      // Check if it's a date
      if (cellValue instanceof Date) {
        const monthName = format(cellValue, 'MMMM');
        monthColumns.push({
          col,
          date: cellValue,
          month: monthName
        });
      }
    }
    
    // Extract values for each month
    for (const monthInfo of monthColumns) {
      const metrics: MonthlyMetrics = {
        date: monthInfo.date,
        month: monthInfo.month,
        columnIndex: monthInfo.col,
        columnLetter: this.getColumnLetter(monthInfo.col),
        totalInflow: 0,
        totalOutflow: 0,
        finalBalance: 0,
        lowestBalance: 0,
        monthlyGeneration: 0
      };
      
      // Get values from specific rows
      const inflowValue = worksheet.getRow(ROW_NUMBERS.TOTAL_INFLOW).getCell(monthInfo.col).value;
      const outflowValue = worksheet.getRow(ROW_NUMBERS.TOTAL_OUTFLOW).getCell(monthInfo.col).value;
      const balanceValue = worksheet.getRow(ROW_NUMBERS.FINAL_BALANCE).getCell(monthInfo.col).value;
      const lowestValue = worksheet.getRow(ROW_NUMBERS.LOWEST_BALANCE).getCell(monthInfo.col).value;
      const generationValue = worksheet.getRow(ROW_NUMBERS.MONTHLY_GENERATION).getCell(monthInfo.col).value;
      
      // Convert to numbers
      metrics.totalInflow = this.toNumber(inflowValue);
      metrics.totalOutflow = this.toNumber(outflowValue);
      metrics.finalBalance = this.toNumber(balanceValue);
      metrics.lowestBalance = this.toNumber(lowestValue);
      metrics.monthlyGeneration = this.toNumber(generationValue);
      
      parsedMetrics.push(metrics);
    }
    
    return parsedMetrics;
  }
  
  /**
   * Generate dashboard data
   */
  generateDashboard() {
    if (parsedMetrics.length === 0) {
      return this.getMockData();
    }
    
    // Get current month
    const now = new Date();
    const currentMonthName = format(now, 'MMMM');
    
    // Find the data for current month by matching month name
    let currentMonthData = parsedMetrics.find(m => m.month === currentMonthName);
    
    // If current month not found, use the last available month
    if (!currentMonthData) {
      currentMonthData = parsedMetrics[parsedMetrics.length - 1];
    }
    
    // Calculate YTD (Year to Date) values
    let ytdInflow = 0;
    let ytdExpense = 0;
    let ytdInvestment = 0;
    
    // Find the index of the current month in parsedMetrics
    const currentMonthArrayIndex = parsedMetrics.findIndex(m => m.month === currentMonthData.month);
    
    // Get investment data for YTD calculation
    const extendedService = ExtendedFinancialService.getInstance();
    const extendedData = extendedService.getStoredExtendedData();
    const investmentData = extendedData.investments || [];
    
    // Sum up all months from start of year up to and including current month
    for (let i = 0; i <= currentMonthArrayIndex && i < parsedMetrics.length; i++) {
      ytdInflow += parsedMetrics[i].totalInflow;
      ytdExpense += parsedMetrics[i].totalOutflow;
      
      // Add investment data if available
      if (investmentData[i]) {
        ytdInvestment += investmentData[i].totalInvestmentValue || 0;
      }
    }
    
    const ytdBalance = ytdInflow + ytdExpense; // outflow is negative
    
    // Generate chart data for all available months in the Excel file
    const chartData = [];
    
    // Add all months from the Excel file
    for (let i = 0; i < parsedMetrics.length; i++) {
      const metricDate = parsedMetrics[i].date;
      // Determine if this month is actual (past/current) or forecast (future)
      const isActual = metricDate <= now || parsedMetrics[i].month === currentMonthName;
      
      chartData.push({
        date: format(parsedMetrics[i].date, 'yyyy-MM'),
        month: parsedMetrics[i].month,
        income: parsedMetrics[i].totalInflow,
        expenses: Math.abs(parsedMetrics[i].totalOutflow),
        cashflow: parsedMetrics[i].finalBalance,  // Row 104: Final Balance
        isActual: isActual
      });
    }
    
    // Generate insights based on actual data
    const insights = this.generateInsights(parsedMetrics, currentMonthArrayIndex);
    const projections = this.generateProjections(parsedMetrics, currentMonthArrayIndex);
    
    return {
      hasData: true,
      uploadedFileName: uploadedFileName,
      currentMonth: {
        month: currentMonthData.month,
        totalIncome: currentMonthData.totalInflow,
        totalExpense: currentMonthData.totalOutflow,
        finalBalance: currentMonthData.finalBalance,
        lowestBalance: currentMonthData.lowestBalance,
        monthlyGeneration: currentMonthData.monthlyGeneration
      },
      yearToDate: {
        totalIncome: ytdInflow,
        totalExpense: ytdExpense,
        totalBalance: ytdBalance,
        totalInvestment: ytdInvestment
      },
      chartData: chartData,
      highlights: {
        pastThreeMonths: insights,
        nextSixMonths: projections
      },
      isRealData: true
    };
  }
  
  /**
   * Convert Excel value to number
   */
  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }
  
  /**
   * Get column letter from number (1=A, 2=B, etc)
   */
  private getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }
  
  /**
   * Get mock data for when no real data is available
   */
  private getMockData() {
    return {
      hasData: false,
      uploadedFileName: uploadedFileName || null,
      currentMonth: {
        month: 'June',
        totalIncome: 61715728.02,
        totalExpense: -69286881.42,
        finalBalance: 26924011.97,
        lowestBalance: 17129280.86,
        monthlyGeneration: -7571153.41
      },
      yearToDate: {
        totalIncome: 400616487.75,
        totalExpense: -388691108.59,
        totalBalance: 11925379.16
      },
      chartData: [
        { date: '2025-01', month: 'January', income: 70346123.45, expenses: 65432198.76, cashflow: 35000000.00, isActual: true },
        { date: '2025-02', month: 'February', income: 68234567.89, expenses: 67123456.78, cashflow: 36111111.11, isActual: true },
        { date: '2025-03', month: 'March', income: 69876543.21, expenses: 68765432.10, cashflow: 37222222.22, isActual: true },
        { date: '2025-04', month: 'April', income: 65432109.87, expenses: 69876543.21, cashflow: 32777788.88, isActual: true },
        { date: '2025-05', month: 'May', income: 63210987.65, expenses: 70123456.78, cashflow: 25865319.75, isActual: true },
        { date: '2025-06', month: 'June', income: 61715728.02, expenses: 69286881.42, cashflow: 26924011.97, isActual: true },
        { date: '2025-07', month: 'July', income: 61715728.02, expenses: 69286881.42, cashflow: 19352858.56, isActual: false },
        { date: '2025-08', month: 'August', income: 61715728.02, expenses: 69286881.42, cashflow: 11781705.15, isActual: false },
        { date: '2025-09', month: 'September', income: 61715728.02, expenses: 69286881.42, cashflow: 4210551.74, isActual: false },
        { date: '2025-10', month: 'October', income: 61715728.02, expenses: 69286881.42, cashflow: -3360601.67, isActual: false },
        { date: '2025-11', month: 'November', income: 61715728.02, expenses: 69286881.42, cashflow: -10931755.08, isActual: false },
        { date: '2025-12', month: 'December', income: 61715728.02, expenses: 69286881.42, cashflow: -18502908.49, isActual: false }
      ],
      highlights: {
        pastThreeMonths: [
          'Inflow decreased by 12.5% over the last 3 months',
          'Average monthly cash burn of $7.6M over the last 3 months',
          'Cash balance has remained stable with low volatility'
        ],
        nextSixMonths: [
          'Excel projections show $45.4M in cash consumption over the next 6 months',
          'Warning: Projections indicate negative cash balance in 4 months (October)',
          'Projected average monthly inflow: $61.7M',
          'Projected average monthly outflows: $69.3M',
          'Year-end projected cash balance: -$18.5M'
        ]
      },
      isRealData: false
    };
  }
  
  /**
   * Get stored metrics (for debugging)
   */
  getStoredMetrics(): MonthlyMetrics[] {
    return parsedMetrics;
  }
  
  /**
   * Generate insights based on past data
   */
  private generateInsights(metrics: MonthlyMetrics[], currentIndex: number): string[] {
    const insights: string[] = [];
    
    // Get last 3 months of data
    const start = Math.max(0, currentIndex - 2);
    const lastThreeMonths = metrics.slice(start, currentIndex + 1);
    
    if (lastThreeMonths.length >= 2) {
      // Inflow trend
      const inflowChange = ((lastThreeMonths[lastThreeMonths.length - 1].totalInflow - 
                            lastThreeMonths[0].totalInflow) / lastThreeMonths[0].totalInflow * 100);
      if (Math.abs(inflowChange) > 5) {
        insights.push(`Inflow ${inflowChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(inflowChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
      }
      
      // Expense trend
      const outflowChange = ((Math.abs(lastThreeMonths[lastThreeMonths.length - 1].totalOutflow) - 
                             Math.abs(lastThreeMonths[0].totalOutflow)) / Math.abs(lastThreeMonths[0].totalOutflow) * 100);
      if (Math.abs(outflowChange) > 5) {
        insights.push(`Outflows ${outflowChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(outflowChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
      }
      
      // Cash generation analysis
      const avgGeneration = lastThreeMonths.reduce((sum, m) => sum + m.monthlyGeneration, 0) / lastThreeMonths.length;
      if (avgGeneration > 0) {
        insights.push(`Average monthly cash generation of ${this.formatCurrency(avgGeneration)} over the last ${lastThreeMonths.length} months`);
      } else {
        insights.push(`Average monthly cash burn of ${this.formatCurrency(Math.abs(avgGeneration))} over the last ${lastThreeMonths.length} months`);
      }
      
      // Balance stability
      const balanceVolatility = this.calculateVolatility(lastThreeMonths.map(m => m.finalBalance));
      if (balanceVolatility < 0.1) {
        insights.push('Cash balance has remained stable with low volatility');
      } else if (balanceVolatility > 0.3) {
        insights.push('High volatility in cash balance indicates irregular cash flows');
      }
    }
    
    // If no insights generated, provide default
    if (insights.length === 0) {
      insights.push('Upload more months of data for detailed trend analysis');
    }
    
    return insights;
  }
  
  /**
   * Generate projections based on future data in Excel
   */
  private generateProjections(metrics: MonthlyMetrics[], currentIndex: number): string[] {
    const projections: string[] = [];
    
    // Get future months data (these are the projections from Excel)
    const futureMonths = metrics.slice(currentIndex + 1);
    
    if (futureMonths.length > 0) {
      // Analyze the next 6 months
      const next6Months = futureMonths.slice(0, 6);
      
      if (next6Months.length > 0) {
        // Total cash generation over next 6 months
        const totalGeneration = next6Months.reduce((sum, m) => sum + m.monthlyGeneration, 0);
        if (totalGeneration > 0) {
          projections.push(`Excel projections show ${this.formatCurrency(totalGeneration)} in cash generation over the next ${next6Months.length} months`);
        } else {
          projections.push(`Excel projections show ${this.formatCurrency(Math.abs(totalGeneration))} in cash consumption over the next ${next6Months.length} months`);
        }
        
        // Find when balance might go negative
        const negativeMonth = futureMonths.find(m => m.finalBalance < 0);
        if (negativeMonth && metrics[currentIndex].finalBalance > 0) {
          const monthsUntilNegative = futureMonths.indexOf(negativeMonth) + 1;
          projections.push(`Warning: Projections indicate negative cash balance in ${monthsUntilNegative} months (${negativeMonth.month})`);
        }
        
        // Average projected inflow/outflow
        const avgFutureInflow = next6Months.reduce((sum, m) => sum + m.totalInflow, 0) / next6Months.length;
        const avgFutureExpense = next6Months.reduce((sum, m) => sum + Math.abs(m.totalOutflow), 0) / next6Months.length;
        
        projections.push(`Projected average monthly inflow: ${this.formatCurrency(avgFutureInflow)}`);
        projections.push(`Projected average monthly outflows: ${this.formatCurrency(avgFutureExpense)}`);
        
        // End of year position
        const lastMonth = futureMonths[futureMonths.length - 1];
        if (lastMonth) {
          projections.push(`Year-end projected cash balance: ${this.formatCurrency(lastMonth.finalBalance)}`);
        }
      }
    }
    
    // If no projections available, provide default
    if (projections.length === 0) {
      projections.push('No future projections available in Excel file');
    }
    
    return projections;
  }
  
  /**
   * Calculate volatility (standard deviation / mean)
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.abs(stdDev / mean);
  }
  
  /**
   * Detect seasonal patterns in the data
   */
  private detectSeasonalPattern(metrics: MonthlyMetrics[]): string | null {
    if (metrics.length < 12) return null;
    
    // Group by month name to find patterns
    const monthlyAverages: { [key: string]: number[] } = {};
    
    metrics.forEach(m => {
      if (!monthlyAverages[m.month]) {
        monthlyAverages[m.month] = [];
      }
      monthlyAverages[m.month].push(m.totalInflow);
    });
    
    // Find months with consistently high or low inflow
    let highMonths: string[] = [];
    let lowMonths: string[] = [];
    const overallAvg = metrics.reduce((sum, m) => sum + m.totalInflow, 0) / metrics.length;
    
    Object.entries(monthlyAverages).forEach(([month, values]) => {
      const monthAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
      if (monthAvg > overallAvg * 1.15) {
        highMonths.push(month);
      } else if (monthAvg < overallAvg * 0.85) {
        lowMonths.push(month);
      }
    });
    
    if (highMonths.length > 0 || lowMonths.length > 0) {
      const parts = [];
      if (highMonths.length > 0) {
        parts.push(`historically strong in ${highMonths.join(', ')}`);
      }
      if (lowMonths.length > 0) {
        parts.push(`weaker in ${lowMonths.join(', ')}`);
      }
      return `Seasonal pattern detected: ${parts.join(' and ')}`;
    }
    
    return null;
  }
  
  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }

  /**
   * Process extracted data from AI mapping
   */
  async processExtractedData(extractedData: any, originalFilename: string): Promise<void> {
    logger.info(`Processing extracted cashflow data from ${originalFilename}`);
    
    // Clear existing data
    parsedMetrics = [];
    uploadedFileName = originalFilename;
    
    // Process and store the extracted metrics
    if (extractedData.months && Array.isArray(extractedData.months)) {
      const metrics: MonthlyMetrics[] = extractedData.months.map((month: any, index: number) => {
        // Extract values from the mapped data
        const totalInflow = month.data.totalIncome?.value || 
                           month.data.totalInflow?.value || 
                           month.data.revenue?.value || 0;
        
        const totalOutflow = Math.abs(month.data.totalExpense?.value || 
                                     month.data.totalOutflow?.value || 
                                     month.data.expenses?.value || 0);
        
        const finalBalance = month.data.finalBalance?.value || 
                            month.data.endingBalance?.value || 
                            month.data.cashBalance?.value || 0;
        
        const lowestBalance = month.data.lowestBalance?.value || 
                             month.data.minimumBalance?.value || 
                             finalBalance;
        
        const monthlyGeneration = month.data.monthlyGeneration?.value || 
                                 month.data.cashGeneration?.value || 
                                 month.data.netCashFlow?.value || 
                                 (totalInflow - totalOutflow);
        
        // Handle date parsing
        let date = new Date();
        if (month.date instanceof Date) {
          date = month.date;
        } else if (typeof month.date === 'string') {
          date = new Date(month.date);
        } else {
          // If no valid date, create one based on month name or index
          const currentYear = new Date().getFullYear();
          const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December']
                             .indexOf(month.month);
          if (monthIndex !== -1) {
            date = new Date(currentYear, monthIndex, 1);
          } else {
            // Fallback: use index to create sequential dates
            date = new Date(currentYear, index, 1);
          }
        }
        
        return {
          date,
          month: month.month || format(date, 'MMMM'),
          columnIndex: index + 2, // Start from column B (2)
          columnLetter: this.getColumnLetter(index + 2),
          totalInflow,
          totalOutflow: -Math.abs(totalOutflow), // Ensure negative
          finalBalance,
          lowestBalance,
          monthlyGeneration
        };
      });
      
      parsedMetrics = metrics;
      
      // Also process extended financial data if available
      const extendedService = ExtendedFinancialService.getInstance();
      if (extractedData.extendedData) {
        // Process operational, banks, taxes, investments data if mapped
        // This would require extending the AI mapping to include these categories
        // For now, we'll just clear the extended data
        extendedService.clearStoredData();
      }
      
      logger.info(`Stored ${metrics.length} months of cashflow data from custom mapping`);
    }
  }

  /**
   * Clear all stored data
   */
  clearStoredData(): void {
    parsedMetrics = [];
    uploadedFileName = '';
    logger.info('Cashflow stored data cleared');
  }
}