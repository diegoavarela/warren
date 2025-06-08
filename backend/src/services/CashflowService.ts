import ExcelJS from 'exceljs';
import { addMonths, format, parseISO } from 'date-fns';

interface CashflowEntry {
  date: Date;
  description: string;
  revenue: number;
  costs: number;
  cashflow: number;
  cumulativeCash: number;
}

// Global data store for the cashflow data (in production, this would be a database)
let globalCashflowData: CashflowEntry[] = [];

export class CashflowService {
  private currentData: CashflowEntry[] = [];

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
    console.log('Parsing Vortex cashflow format...');
    
    try {
      // This is specifically designed for the Vortex Excel format
      // Row 3 contains dates, starting from column 19 for USD section
      const dateRow = worksheet.getRow(3);
      const dollarDates: Array<{columnIndex: number, date: Date}> = [];
      
      console.log('Checking for dates in row 3...');
      
      // Extract dates from columns 19-33 (Dollar section)
      for (let i = 19; i <= 33; i++) {
        const dateCell = dateRow.getCell(i).value;
        console.log(`Column ${i}: ${dateCell} (${typeof dateCell})`);
        if (dateCell instanceof Date) {
          dollarDates.push({
            columnIndex: i,
            date: dateCell
          });
          console.log(`  -> Added date: ${dateCell.toISOString().split('T')[0]}`);
        }
      }
      
      console.log(`Found ${dollarDates.length} dates in USD section`);
      
      // Group data by month to create monthly summaries
      const monthlySummary = new Map<string, {
        date: Date,
        description: string,
        revenue: number,
        costs: number,
        cashflow: number
      }>();
      
      // Process each account row (starting from row 5, skipping headers)
      console.log(`Processing rows 5 to ${worksheet.rowCount}...`);
      for (let rowNum = 5; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const accountName = row.getCell(1).value as string;
        
        if (!accountName || accountName.trim() === '') {
          console.log(`Skipping row ${rowNum}: empty account name`);
          continue;
        }
        
        console.log(`Processing row ${rowNum}: ${accountName}`);
        
        // Extract values for each date in the dollar section
        for (const dateInfo of dollarDates) {
          const cellValue = row.getCell(dateInfo.columnIndex).value;
          
          if (cellValue && typeof cellValue === 'number' && cellValue !== 0) {
            console.log(`  Column ${dateInfo.columnIndex}: ${cellValue} for ${format(dateInfo.date, 'MMM yyyy')}`);
            
            const monthKey = format(dateInfo.date, 'yyyy-MM');
            
            if (!monthlySummary.has(monthKey)) {
              monthlySummary.set(monthKey, {
                date: dateInfo.date,
                description: `Cashflow for ${format(dateInfo.date, 'MMM yyyy')}`,
                revenue: 0,
                costs: 0,
                cashflow: 0
              });
            }
            
            const monthEntry = monthlySummary.get(monthKey)!;
            
            if (cellValue > 0) {
              monthEntry.revenue += cellValue;
            } else {
              monthEntry.costs += Math.abs(cellValue);
            }
            monthEntry.cashflow += cellValue;
          }
        }
      }
      
      // Convert to CashflowEntry format with cumulative cash
      const data: CashflowEntry[] = [];
      let cumulativeCash = 0;
      
      // Sort by date
      const sortedEntries = Array.from(monthlySummary.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      for (const entry of sortedEntries) {
        cumulativeCash += entry.cashflow;
        
        data.push({
          date: entry.date,
          description: entry.description,
          revenue: entry.revenue,
          costs: entry.costs,
          cashflow: entry.cashflow,
          cumulativeCash
        });
        
        console.log(`${format(entry.date, 'MMM yyyy')}: Revenue=$${entry.revenue.toFixed(0)}, Costs=$${entry.costs.toFixed(0)}, Net=$${entry.cashflow.toFixed(0)}`);
      }
      
      console.log(`Successfully parsed ${data.length} monthly entries`);
      return data;
      
    } catch (error: any) {
      console.error('Error parsing Vortex worksheet:', error);
      throw new Error(`Failed to parse Vortex worksheet: ${error?.message || 'Unknown error'}`);
    }
  }

  private detectColumnMapping(headers: string[]): { date?: number, description?: number, revenue?: number, costs?: number } {
    const mapping: { date?: number, description?: number, revenue?: number, costs?: number } = {};

    headers.forEach((header, index) => {
      const columnNumber = index + 1;
      
      // Date column detection
      if (header.includes('date') || header.includes('fecha') || header.includes('time') || header.includes('periodo')) {
        mapping.date = columnNumber;
      }
      
      // Description column detection
      if (header.includes('description') || header.includes('descripcion') || header.includes('concept') || header.includes('item') || header.includes('detail')) {
        mapping.description = columnNumber;
      }
      
      // Revenue column detection
      if (header.includes('revenue') || header.includes('income') || header.includes('ingreso') || header.includes('venta') || header.includes('sales')) {
        mapping.revenue = columnNumber;
      }
      
      // Costs column detection
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
      // Remove currency symbols and commas
      const cleaned = value.replace(/[$,€£]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  generateDashboard() {
    // Always check for global data first
    this.getCurrentData();
    
    if (this.currentData.length === 0) {
      console.log('No real data available, using mock data');
      // Return mock data if no real data available
      const now = new Date();
      
      return {
        metrics: {
          lowestCashNext6Months: -50000,
          highestCashNext6Months: 250000,
          biggestGainNext6Months: 75000,
          lowestGainNext6Months: -25000,
          revenueYTD: 850000,
          costsYTD: 620000
        },
        highlights: {
          pastThreeMonths: [
            "Q4 revenue exceeded targets by 15%",
            "Cost reduction initiatives saved $30K",
            "New client contracts worth $120K secured"
          ],
          nextSixMonths: [
            "Expected cash shortage in March due to equipment purchase",
            "Major client payment of $100K expected in April",
            "Seasonal revenue increase projected for Q2"
          ]
        },
        chartData: this.generateMockChartData(),
        isRealData: false
      };
    }

    // Calculate real metrics from uploaded data
    console.log(`Using real data with ${this.currentData.length} entries`);
    const now = new Date();
    const sixMonthsFromNow = addMonths(now, 6);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Filter data for projections (next 6 months)
    const futureData = this.currentData.filter(entry => 
      entry.date >= now && entry.date <= sixMonthsFromNow
    );

    // Filter data for YTD calculations
    const ytdData = this.currentData.filter(entry => 
      entry.date >= yearStart && entry.date <= now
    );

    // Calculate metrics
    const futureCashflows = futureData.map(entry => entry.cumulativeCash);
    const futureGains = futureData.map(entry => entry.cashflow);
    
    const metrics = {
      lowestCashNext6Months: futureCashflows.length > 0 ? Math.min(...futureCashflows) : 0,
      highestCashNext6Months: futureCashflows.length > 0 ? Math.max(...futureCashflows) : 0,
      biggestGainNext6Months: futureGains.length > 0 ? Math.max(...futureGains) : 0,
      lowestGainNext6Months: futureGains.length > 0 ? Math.min(...futureGains) : 0,
      revenueYTD: ytdData.reduce((sum, entry) => sum + entry.revenue, 0),
      costsYTD: ytdData.reduce((sum, entry) => sum + entry.costs, 0)
    };

    return {
      metrics,
      highlights: {
        pastThreeMonths: [
          `Processed ${this.currentData.length} cashflow entries`,
          `Total YTD revenue: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.revenueYTD)}`,
          `Data range: ${format(this.currentData[0]?.date || now, 'MMM yyyy')} to ${format(this.currentData[this.currentData.length - 1]?.date || now, 'MMM yyyy')}`
        ],
        nextSixMonths: [
          `${futureData.length} projected entries in next 6 months`,
          `Peak cash expected: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.highestCashNext6Months)}`,
          `Largest gain projected: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(metrics.biggestGainNext6Months)}`
        ]
      },
      chartData: this.generateChartFromRealData(),
      isRealData: true
    };
  }

  calculateMetrics() {
    this.getCurrentData();
    
    if (this.currentData.length === 0) {
      // Mock calculations - in production would use real data
      const now = new Date();
      
      return {
        cashflowTrend: this.generateMockTrendData(),
        monthlyBreakdown: this.generateMonthlyBreakdown(),
        projections: this.generateProjections()
      };
    }
    
    // Use real data for calculations
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

  private generateChartFromRealData() {
    if (this.currentData.length === 0) {
      return this.generateMockChartData();
    }

    // Group data by month
    const monthlyData = new Map();
    
    this.currentData.forEach(entry => {
      const monthKey = format(entry.date, 'yyyy-MM');
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          date: monthKey,
          revenue: 0,
          costs: 0,
          cashflow: 0,
          count: 0
        });
      }
      
      const monthEntry = monthlyData.get(monthKey);
      monthEntry.revenue += entry.revenue;
      monthEntry.costs += entry.costs;
      monthEntry.cashflow += entry.cashflow;
      monthEntry.count += 1;
    });

    return Array.from(monthlyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateMockChartData() {
    const data = [];
    const now = new Date();
    
    for (let i = -6; i <= 6; i++) {
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
}