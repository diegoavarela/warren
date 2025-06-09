import ExcelJS from 'exceljs';
import { addMonths, format, parseISO, startOfMonth, subMonths } from 'date-fns';

interface CashflowEntry {
  date: Date;
  description: string;
  revenue: number;
  costs: number;
  cashflow: number;
  cumulativeCash: number;
}

interface MonthlyMetrics {
  date: Date;
  month: string;
  totalIncome: number;
  totalExpense: number;
  finalBalance: number;
  lowestBalance: number;
  monthlyGeneration: number;
}

// Global data store for the cashflow data (in production, this would be a database)
let globalCashflowData: CashflowEntry[] = [];
let globalMetricsData: MonthlyMetrics[] = [];

export class CashflowService {
  private currentData: CashflowEntry[] = [];
  private metricsData: MonthlyMetrics[] = [];

  setCurrentData(data: CashflowEntry[]) {
    this.currentData = data;
    globalCashflowData = data; // Store globally
    console.log(`Stored ${data.length} entries globally`);
  }

  getCurrentData(): CashflowEntry[] {
    // Try to get from global store first, then instance
    if (globalCashflowData.length > 0) {
      this.currentData = globalCashflowData;
    }
    return this.currentData;
  }

  parseWorksheet(worksheet: ExcelJS.Worksheet): CashflowEntry[] {
    console.log('Parsing Vortex cashflow format with specific row labels...');
    
    try {
      // Row 3 contains dates, starting from column 2 (B) for Peso section
      const dateRow = worksheet.getRow(3);
      const pesoDates: Array<{columnIndex: number, date: Date, monthName: string}> = [];
      
      console.log('Extracting dates from row 3 (Peso section)...');
      
      // Extract dates from columns 2-16 (B-P) which is the Peso section
      for (let i = 2; i <= 16; i++) {
        const dateCell = dateRow.getCell(i).value;
        if (dateCell instanceof Date) {
          const monthName = format(dateCell, 'MMMM');
          pesoDates.push({
            columnIndex: i,
            date: dateCell,
            monthName: monthName
          });
          console.log(`Column ${i} (${String.fromCharCode(64 + i)}): ${monthName} ${format(dateCell, 'yyyy')}`);
        }
      }
      
      // Define the exact rows based on your Excel file
      const rowNumbers = {
        totalCollections: 20,    // Row 20: Total Collections (what you call Total Income)
        totalIncome: 24,         // Row 24: TOTAL INCOME
        totalExpense: 100,       // Row 100: TOTAL EXPENSE
        finalBalance: 104,       // Row 104: Final Balance
        lowestBalance: 112,      // Row 112: Lowest Balance of the month
        monthlyGeneration: 113   // Row 113: Monthly Cash Generation
      };
      
      console.log('Using rows from Excel:');
      console.log(`  Total Collections (Total Income): row ${rowNumbers.totalCollections}`);
      console.log(`  Total Expense: row ${rowNumbers.totalExpense}`);
      console.log(`  Final Balance: row ${rowNumbers.finalBalance}`);
      console.log(`  Lowest Balance: row ${rowNumbers.lowestBalance}`);
      console.log(`  Monthly Generation: row ${rowNumbers.monthlyGeneration}`);
      
      // Extract metrics for each month
      const monthlyMetrics: MonthlyMetrics[] = [];
      
      for (const dateInfo of pesoDates) {
        const metrics: MonthlyMetrics = {
          date: dateInfo.date,
          month: dateInfo.monthName,
          totalIncome: 0,
          totalExpense: 0,
          finalBalance: 0,
          lowestBalance: 0,
          monthlyGeneration: 0
        };
        
        // Get Total Income from row 24 (TOTAL INCOME)
        const incomeRow = worksheet.getRow(rowNumbers.totalIncome);
        const incomeValue = incomeRow.getCell(dateInfo.columnIndex).value;
        if (typeof incomeValue === 'number') {
          metrics.totalIncome = incomeValue;
          console.log(`${dateInfo.monthName} - Total Income: ${incomeValue.toFixed(2)}`);
        }
        
        // Get Total Expense from row 100
        const expenseRow = worksheet.getRow(rowNumbers.totalExpense);
        const expenseValue = expenseRow.getCell(dateInfo.columnIndex).value;
        if (typeof expenseValue === 'number') {
          metrics.totalExpense = Math.abs(expenseValue); // Store as positive
          console.log(`${dateInfo.monthName} - Total Expense: ${Math.abs(expenseValue).toFixed(2)}`);
        }
        
        // Get Final Balance from row 104
        const balanceRow = worksheet.getRow(rowNumbers.finalBalance);
        const balanceValue = balanceRow.getCell(dateInfo.columnIndex).value;
        if (typeof balanceValue === 'number') {
          metrics.finalBalance = balanceValue;
          console.log(`${dateInfo.monthName} - Final Balance: ${balanceValue.toFixed(2)}`);
        }
        
        // Get Lowest Balance from row 112
        const lowestRow = worksheet.getRow(rowNumbers.lowestBalance);
        const lowestValue = lowestRow.getCell(dateInfo.columnIndex).value;
        if (typeof lowestValue === 'number') {
          metrics.lowestBalance = lowestValue;
          console.log(`${dateInfo.monthName} - Lowest Balance: ${lowestValue.toFixed(2)}`);
        }
        
        // Get Monthly Generation from row 113
        const generationRow = worksheet.getRow(rowNumbers.monthlyGeneration);
        const generationValue = generationRow.getCell(dateInfo.columnIndex).value;
        if (typeof generationValue === 'number') {
          metrics.monthlyGeneration = generationValue;
          console.log(`${dateInfo.monthName} - Monthly Generation: ${generationValue.toFixed(2)}`);
        }
        
        monthlyMetrics.push(metrics);
      }
      
      // Store metrics globally
      globalMetricsData = monthlyMetrics;
      this.metricsData = monthlyMetrics;
      
      // Convert to CashflowEntry format
      const data: CashflowEntry[] = [];
      let cumulativeCash = 0;
      
      for (const metrics of monthlyMetrics) {
        const cashflow = metrics.totalIncome - metrics.totalExpense;
        cumulativeCash += cashflow;
        
        data.push({
          date: metrics.date,
          description: `Cashflow for ${format(metrics.date, 'MMM yyyy')}`,
          revenue: metrics.totalIncome,
          costs: metrics.totalExpense,
          cashflow: cashflow,
          cumulativeCash
        });
      }
      
      console.log(`Successfully parsed ${data.length} monthly entries with specific metrics`);
      return data;
      
    } catch (error: any) {
      console.error('Error parsing Vortex worksheet:', error);
      throw new Error(`Failed to parse Vortex worksheet: ${error?.message || 'Unknown error'}`);
    }
  }

  generateDashboard() {
    // Always check for global data first
    this.getCurrentData();
    const metrics = globalMetricsData.length > 0 ? globalMetricsData : this.metricsData;
    
    if (this.currentData.length === 0 || metrics.length === 0) {
      console.log('No real data available, using mock data');
      // Return mock data if no real data available
      return {
        currentMonth: {
          month: 'June',
          totalIncome: 61715728.02,
          totalExpense: 69286881.42,
          finalBalance: 26924011.97,
          lowestBalance: 17129280.86,
          monthlyGeneration: -7571153.41
        },
        yearToDate: {
          totalIncome: 400616487.75,
          totalExpense: 388691108.59,
          totalBalance: 11925379.16
        },
        chartData: this.generateMockChartData(),
        highlights: {
          pastThreeMonths: ["No data available"],
          nextSixMonths: ["No data available"]
        },
        isRealData: false
      };
    }

    // Get current month (for now, let's use June as it's month 5 in 0-based index)
    const now = new Date();
    const currentMonthIndex = 5; // June (0-based, so Jan=0, Jun=5)
    const currentMonthData = metrics[currentMonthIndex];
    
    // Calculate YTD values (January to current month)
    let ytdIncome = 0;
    let ytdExpense = 0;
    let ytdBalance = 0;
    
    for (let i = 0; i <= currentMonthIndex; i++) {
      ytdIncome += metrics[i].totalIncome;
      ytdExpense += metrics[i].totalExpense;
    }
    ytdBalance = ytdIncome - ytdExpense;
    
    // Generate dashboard data
    const dashboardData = {
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
      chartData: this.generateChartFromRealData(),
      highlights: this.generateHighlights(metrics),
      isRealData: true
    };
    
    console.log('Dashboard data generated:', dashboardData);
    return dashboardData;
  }

  private generateHighlights(metrics: MonthlyMetrics[]) {
    // Get January to May data (first 5 months) for averages
    const janToMay = metrics.slice(0, 5);
    const totalIncomeJanMay = janToMay.reduce((sum, m) => sum + m.totalIncome, 0);
    const totalExpenseJanMay = janToMay.reduce((sum, m) => sum + m.totalExpense, 0);
    const avgIncome = totalIncomeJanMay / janToMay.length;
    const avgExpense = totalExpenseJanMay / janToMay.length;
    
    console.log('Average calculations (Jan-May):');
    console.log(`  Total Income: ${totalIncomeJanMay.toFixed(2)}, Average: ${avgIncome.toFixed(2)}`);
    console.log(`  Total Expense: ${totalExpenseJanMay.toFixed(2)}, Average: ${avgExpense.toFixed(2)}`);
    
    // Find best and worst months
    const bestMonth = metrics.reduce((best, current) => 
      current.monthlyGeneration > best.monthlyGeneration ? current : best
    );
    const worstMonth = metrics.reduce((worst, current) => 
      current.monthlyGeneration < worst.monthlyGeneration ? current : worst
    );
    
    return {
      pastThreeMonths: [
        `Average monthly income (Jan-May): ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(avgIncome)}`,
        `Average monthly expenses (Jan-May): ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(avgExpense)}`,
        `Best performing month: ${bestMonth.month} with ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(bestMonth.monthlyGeneration)}`
      ],
      nextSixMonths: [
        `Worst performing month: ${worstMonth.month} with ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(worstMonth.monthlyGeneration)}`,
        `Current balance trend: ${metrics[metrics.length - 1].finalBalance > metrics[0].finalBalance ? 'Positive' : 'Negative'}`,
        `Monthly average cash generation: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
          metrics.reduce((sum, m) => sum + m.monthlyGeneration, 0) / metrics.length
        )}`
      ]
    };
  }

  private generateChartFromRealData() {
    const metrics = globalMetricsData.length > 0 ? globalMetricsData : this.metricsData;
    
    if (metrics.length === 0) {
      return this.generateMockChartData();
    }

    // Get data starting from July (next month after current June)
    // June is index 5, so we start from index 6
    const futureData = metrics.slice(6, 12); // July to December
    
    console.log('Chart data generation:');
    futureData.forEach((entry, idx) => {
      console.log(`  ${entry.month} ${format(entry.date, 'yyyy')}: Income=${entry.totalIncome.toFixed(2)}`);
    });

    return futureData.map(entry => ({
      date: format(entry.date, 'yyyy-MM'),
      month: entry.month,
      revenue: entry.totalIncome,
      costs: entry.totalExpense,
      cashflow: entry.monthlyGeneration
    }));
  }

  private generateMockChartData() {
    const data = [];
    const now = new Date();
    
    for (let i = -6; i < 0; i++) {
      const date = addMonths(now, i);
      data.push({
        date: format(date, 'yyyy-MM'),
        revenue: Math.random() * 100000 + 50000,
        costs: Math.random() * 80000 + 40000,
        cashflow: Math.random() * 50000 - 10000
      });
    }
    
    return data;
  }

  calculateMetrics() {
    this.getCurrentData();
    
    if (this.currentData.length === 0) {
      return {
        cashflowTrend: this.generateMockTrendData(),
        monthlyBreakdown: this.generateMonthlyBreakdown(),
        projections: this.generateProjections()
      };
    }
    
    return {
      cashflowTrend: this.generateTrendFromRealData(),
      monthlyBreakdown: this.generateRealMonthlyBreakdown(),
      projections: this.generateRealProjections()
    };
  }
  
  private generateTrendFromRealData() {
    const labels = this.currentData.map(entry => format(entry.date, 'MMM'));
    const data = this.currentData.map(entry => entry.cashflow);
    
    return {
      labels,
      datasets: [{
        label: 'Cashflow',
        data,
        borderColor: '#7CB342',
        backgroundColor: 'rgba(124, 179, 66, 0.1)'
      }]
    };
  }
  
  private generateRealMonthlyBreakdown() {
    return this.currentData.map(entry => ({
      month: format(entry.date, 'MMM yyyy'),
      revenue: entry.revenue,
      costs: entry.costs,
      netCashflow: entry.cashflow
    }));
  }
  
  private generateRealProjections() {
    const futureEntries = this.currentData.filter(entry => entry.date > new Date());
    const totalRevenue = futureEntries.reduce((sum, entry) => sum + entry.revenue, 0);
    const totalCosts = futureEntries.reduce((sum, entry) => sum + entry.costs, 0);
    
    return {
      nextQuarter: {
        projectedRevenue: totalRevenue / 2,
        projectedCosts: totalCosts / 2,
        netCashflow: (totalRevenue - totalCosts) / 2,
        confidence: 90
      },
      nextSixMonths: {
        projectedRevenue: totalRevenue,
        projectedCosts: totalCosts,
        netCashflow: totalRevenue - totalCosts,
        confidence: 85
      }
    };
  }

  private generateMockTrendData() {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Cashflow',
        data: [15000, -5000, 25000, 35000, -10000, 45000],
        borderColor: '#7CB342',
        backgroundColor: 'rgba(124, 179, 66, 0.1)'
      }]
    };
  }

  private generateMonthlyBreakdown() {
    return Array.from({ length: 12 }, (_, i) => ({
      month: format(addMonths(new Date(), i - 6), 'MMM yyyy'),
      revenue: Math.random() * 100000 + 50000,
      costs: Math.random() * 80000 + 40000,
      netCashflow: Math.random() * 50000 - 10000
    }));
  }

  private generateProjections() {
    return {
      nextQuarter: {
        projectedRevenue: 275000,
        projectedCosts: 200000,
        netCashflow: 75000,
        confidence: 85
      },
      nextSixMonths: {
        projectedRevenue: 550000,
        projectedCosts: 420000,
        netCashflow: 130000,
        confidence: 75
      }
    };
  }

  private detectColumnMapping(headers: string[]): { date?: number, description?: number, revenue?: number, costs?: number } {
    const mapping: { date?: number, description?: number, revenue?: number, costs?: number } = {};

    headers.forEach((header, index) => {
      const columnNumber = index + 1;
      
      if (header.includes('date') || header.includes('fecha') || header.includes('time') || header.includes('periodo')) {
        mapping.date = columnNumber;
      }
      
      if (header.includes('description') || header.includes('descripcion') || header.includes('concept') || header.includes('item') || header.includes('detail')) {
        mapping.description = columnNumber;
      }
      
      if (header.includes('revenue') || header.includes('income') || header.includes('ingreso') || header.includes('venta') || header.includes('sales')) {
        mapping.revenue = columnNumber;
      }
      
      if (header.includes('cost') || header.includes('expense') || header.includes('gasto') || header.includes('egreso') || header.includes('spend')) {
        mapping.costs = columnNumber;
      }
    });

    return mapping;
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,€£]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}