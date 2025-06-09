import ExcelJS from 'exceljs';
import { format } from 'date-fns';

interface MonthlyMetrics {
  date: Date;
  month: string;
  columnIndex: number;
  columnLetter: string;
  totalIncome: number;
  totalExpense: number;
  finalBalance: number;
  lowestBalance: number;
  monthlyGeneration: number;
}

// Simple global storage for parsed data
let parsedMetrics: MonthlyMetrics[] = [];

export class CashflowServiceV2 {
  /**
   * Parse the Excel worksheet and extract monthly metrics
   */
  parseWorksheet(worksheet: ExcelJS.Worksheet): MonthlyMetrics[] {
    // Clear previous data
    parsedMetrics = [];
    
    // Define the exact row numbers from the Excel file
    const ROW_NUMBERS = {
      DATES: 3,           // Row 3: Month dates
      TOTAL_INCOME: 24,   // Row 24: TOTAL INCOME
      TOTAL_EXPENSE: 100, // Row 100: TOTAL EXPENSE  
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
        totalIncome: 0,
        totalExpense: 0,
        finalBalance: 0,
        lowestBalance: 0,
        monthlyGeneration: 0
      };
      
      // Get values from specific rows
      const incomeValue = worksheet.getRow(ROW_NUMBERS.TOTAL_INCOME).getCell(monthInfo.col).value;
      const expenseValue = worksheet.getRow(ROW_NUMBERS.TOTAL_EXPENSE).getCell(monthInfo.col).value;
      const balanceValue = worksheet.getRow(ROW_NUMBERS.FINAL_BALANCE).getCell(monthInfo.col).value;
      const lowestValue = worksheet.getRow(ROW_NUMBERS.LOWEST_BALANCE).getCell(monthInfo.col).value;
      const generationValue = worksheet.getRow(ROW_NUMBERS.MONTHLY_GENERATION).getCell(monthInfo.col).value;
      
      // Convert to numbers
      metrics.totalIncome = this.toNumber(incomeValue);
      metrics.totalExpense = this.toNumber(expenseValue);
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
    let ytdIncome = 0;
    let ytdExpense = 0;
    
    // Find the index of the current month in parsedMetrics
    const currentMonthArrayIndex = parsedMetrics.findIndex(m => m.month === currentMonthData.month);
    
    // Sum up all months from start of year up to and including current month
    for (let i = 0; i <= currentMonthArrayIndex && i < parsedMetrics.length; i++) {
      ytdIncome += parsedMetrics[i].totalIncome;
      ytdExpense += parsedMetrics[i].totalExpense;
    }
    
    const ytdBalance = ytdIncome + ytdExpense; // expense is negative
    
    // Generate chart data (next 6 months from current)
    const chartStartIndex = Math.min(currentMonthArrayIndex + 1, parsedMetrics.length - 1);
    const chartData = parsedMetrics.slice(chartStartIndex, chartStartIndex + 6).map(m => ({
      date: format(m.date, 'yyyy-MM'),
      month: m.month,
      revenue: m.totalIncome,
      costs: Math.abs(m.totalExpense),
      cashflow: m.monthlyGeneration
    }));
    
    // Generate insights based on actual data
    const insights = this.generateInsights(parsedMetrics, currentMonthArrayIndex);
    const projections = this.generateProjections(parsedMetrics, currentMonthArrayIndex);
    
    return {
      currentMonth: {
        month: currentMonthData.month,
        totalIncome: currentMonthData.totalIncome,
        totalExpense: currentMonthData.totalExpense,
        finalBalance: currentMonthData.finalBalance,
        lowestBalance: currentMonthData.lowestBalance,
        monthlyGeneration: currentMonthData.monthlyGeneration
      },
      yearToDate: {
        totalIncome: ytdIncome,
        totalExpense: ytdExpense,
        totalBalance: ytdBalance
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
      chartData: [],
      highlights: {
        pastThreeMonths: [
          'Income decreased by 12.5% over the last 3 months',
          'Average monthly cash burn of $7.6M over the last 3 months',
          'Cash balance has remained stable with low volatility'
        ],
        nextSixMonths: [
          'Based on current trends, expecting to consume $45.4M in cash over the next 6 months',
          'Income expected to remain stable around $61.7M per month',
          'Projected cash balance of $19.4M in 6 months'
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
      // Income trend
      const incomeChange = ((lastThreeMonths[lastThreeMonths.length - 1].totalIncome - 
                            lastThreeMonths[0].totalIncome) / lastThreeMonths[0].totalIncome * 100);
      if (Math.abs(incomeChange) > 5) {
        insights.push(`Income ${incomeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(incomeChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
      }
      
      // Expense trend
      const expenseChange = ((Math.abs(lastThreeMonths[lastThreeMonths.length - 1].totalExpense) - 
                             Math.abs(lastThreeMonths[0].totalExpense)) / Math.abs(lastThreeMonths[0].totalExpense) * 100);
      if (Math.abs(expenseChange) > 5) {
        insights.push(`Expenses ${expenseChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(expenseChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
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
   * Generate projections based on historical trends
   */
  private generateProjections(metrics: MonthlyMetrics[], currentIndex: number): string[] {
    const projections: string[] = [];
    
    // Get last 6 months of data for trend analysis
    const start = Math.max(0, currentIndex - 5);
    const historicalData = metrics.slice(start, currentIndex + 1);
    
    if (historicalData.length >= 3) {
      // Calculate average monthly income and expense
      const avgIncome = historicalData.reduce((sum, m) => sum + m.totalIncome, 0) / historicalData.length;
      const avgExpense = historicalData.reduce((sum, m) => sum + m.totalExpense, 0) / historicalData.length;
      const avgGeneration = historicalData.reduce((sum, m) => sum + m.monthlyGeneration, 0) / historicalData.length;
      
      // Project 6 months forward
      const projectedBalance = metrics[currentIndex].finalBalance + (avgGeneration * 6);
      
      if (avgGeneration > 0) {
        projections.push(`Based on current trends, expecting to generate ${this.formatCurrency(avgGeneration * 6)} in cash over the next 6 months`);
      } else {
        projections.push(`Based on current trends, expecting to consume ${this.formatCurrency(Math.abs(avgGeneration * 6))} in cash over the next 6 months`);
      }
      
      // Income stability projection
      const incomeVolatility = this.calculateVolatility(historicalData.map(m => m.totalIncome));
      if (incomeVolatility < 0.1) {
        projections.push(`Income expected to remain stable around ${this.formatCurrency(avgIncome)} per month`);
      } else {
        projections.push(`Income volatility suggests range of ${this.formatCurrency(avgIncome * 0.8)} to ${this.formatCurrency(avgIncome * 1.2)} per month`);
      }
      
      // Cash position projection
      if (projectedBalance > 0) {
        projections.push(`Projected cash balance of ${this.formatCurrency(projectedBalance)} in 6 months`);
      } else {
        const monthsUntilZero = Math.floor(metrics[currentIndex].finalBalance / Math.abs(avgGeneration));
        if (monthsUntilZero > 0 && monthsUntilZero <= 12) {
          projections.push(`Warning: Current burn rate suggests cash depletion in ${monthsUntilZero} months`);
        }
      }
      
      // Seasonal patterns
      const seasonalPattern = this.detectSeasonalPattern(metrics.slice(0, currentIndex + 1));
      if (seasonalPattern) {
        projections.push(seasonalPattern);
      }
    }
    
    // If no projections generated, provide default
    if (projections.length === 0) {
      projections.push('Upload more months of data for accurate projections');
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
      monthlyAverages[m.month].push(m.totalIncome);
    });
    
    // Find months with consistently high or low income
    let highMonths: string[] = [];
    let lowMonths: string[] = [];
    const overallAvg = metrics.reduce((sum, m) => sum + m.totalIncome, 0) / metrics.length;
    
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
}