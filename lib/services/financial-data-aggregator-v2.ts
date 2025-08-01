/**
 * FinancialDataAggregator - Unified Financial Context Builder
 * 
 * Based on warren-lightsail architecture:
 * - Aggregates data from multiple sources
 * - Creates comprehensive financial context for AI
 * - Handles currency formatting and scaling
 * - Provides rich data summaries for analysis
 */

import { financialDataService, type CompanyFinancialData, type ProcessedFinancialItem } from './financial-data-service';

export interface AggregatedFinancialContext {
  companyName: string;
  currency: string;
  dataAvailability: {
    totalDataPoints: number;
    periodsAvailable: string[];
    statementTypes: ('profit_loss' | 'cash_flow')[];
    lastUpdated: string;
  };
  financialSummary: {
    revenue: {
      total: string; // Formatted with currency
      monthly: Record<string, string>;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    expenses: {
      total: string;
      byCategory: Record<string, string>;
      operatingExpenses: {
        total: string;
        breakdown: Record<string, string>;
      };
    };
    profitability: {
      grossProfit: string;
      operatingProfit: string;
      netProfit: string;
      ebitda: string;
      margins: {
        gross: string;
        operating: string;
        net: string;
      };
    };
    keyMetrics: {
      revenueGrowth: string;
      expenseRatio: string;
      burnRate: string;
    };
  };
  detailedBreakdowns: {
    revenueByPeriod: Array<{
      period: string;
      amount: string;
      growth?: string;
    }>;
    expensesByCategory: Array<{
      category: string;
      amount: string;
      percentage: string;
    }>;
    operatingExpenseDetails: Array<{
      subcategory: string;
      amount: string;
      description: string;
    }>;
  };
  chartData: {
    monthlyRevenue: Array<{ month: string; value: number }>;
    expenseBreakdown: Array<{ category: string; value: number }>;
    profitabilityTrend: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  };
}

class FinancialDataAggregator {
  private static instance: FinancialDataAggregator;

  private constructor() {
    console.log('🔄 FinancialDataAggregator initialized');
  }

  public static getInstance(): FinancialDataAggregator {
    if (!FinancialDataAggregator.instance) {
      FinancialDataAggregator.instance = new FinancialDataAggregator();
    }
    return FinancialDataAggregator.instance;
  }

  /**
   * Create comprehensive financial context for AI analysis
   */
  public async buildFinancialContext(companyId: string): Promise<AggregatedFinancialContext | null> {
    console.log(`🏗️ Building financial context for company: ${companyId}`);

    const companyData = financialDataService.getCompanyData(companyId);
    if (!companyData) {
      console.log(`❌ No data available for company: ${companyId}`);
      return null;
    }

    try {
      const context = await this.aggregateFinancialData(companyData);
      console.log(`✅ Financial context built successfully for ${companyId}`, {
        dataPoints: context.dataAvailability.totalDataPoints,
        periods: context.dataAvailability.periodsAvailable.length
      });
      return context;
    } catch (error) {
      console.error('❌ Error building financial context:', error);
      return null;
    }
  }

  /**
   * Get data summary for availability check
   */
  public getDataSummary(companyId: string): {
    hasData: boolean;
    summary?: {
      companyName: string;
      totalDataPoints: number;
      periods: string[];
      currency: string;
      lastUpdated: string;
    };
  } {
    const companyData = financialDataService.getCompanyData(companyId);
    
    if (!companyData) {
      return { hasData: false };
    }

    return {
      hasData: true,
      summary: {
        companyName: companyData.companyName,
        totalDataPoints: companyData.dataPoints.length,
        periods: companyData.periods,
        currency: companyData.currency,
        lastUpdated: companyData.lastUpdated
      }
    };
  }

  /**
   * Generate query suggestions based on available data
   */
  public generateQuerySuggestions(companyId: string): string[] {
    const companyData = financialDataService.getCompanyData(companyId);
    if (!companyData) return [];

    const suggestions: string[] = [];
    const { metrics, periods, currency } = companyData;

    // Revenue-based suggestions
    if (metrics.revenue.total > 0) {
      suggestions.push(`What was our total revenue? (${this.formatCurrency(metrics.revenue.total, currency)})`);
      if (periods.length > 1) {
        suggestions.push("Show me revenue trends over the last few months");
        suggestions.push("Compare revenue between different periods");
      }
    }

    // Expense-based suggestions
    if (metrics.expenses.total > 0) {
      suggestions.push("What are our biggest expense categories?");
      suggestions.push(`Show me our operating expenses breakdown`);
    }

    // Profitability suggestions
    if (metrics.margins.ebitda !== 0) {
      suggestions.push("Calculate our EBITDA and explain the components");
      suggestions.push("What's driving our profitability?");
    }

    // Chart suggestions
    suggestions.push("Create a chart showing monthly revenue");
    suggestions.push("Make a graph comparing revenue vs expenses");

    return suggestions.slice(0, 6); // Return top 6 suggestions
  }

  private async aggregateFinancialData(companyData: CompanyFinancialData): Promise<AggregatedFinancialContext> {
    const { dataPoints, metrics, periods, currency, companyName, lastUpdated } = companyData;

    // Build revenue analysis
    const revenueData = this.buildRevenueAnalysis(dataPoints, currency);
    
    // Build expense analysis
    const expenseData = this.buildExpenseAnalysis(dataPoints, currency);
    
    // Build profitability analysis using correctly filtered data instead of service metrics
    const profitabilityData = this.buildProfitabilityAnalysisFromFilteredData(dataPoints, currency);
    
    // Build detailed breakdowns
    const breakdowns = this.buildDetailedBreakdowns(dataPoints, currency);
    
    // Build chart data
    const chartData = this.buildChartData(dataPoints);

    return {
      companyName,
      currency,
      dataAvailability: {
        totalDataPoints: dataPoints.length,
        periodsAvailable: periods,
        statementTypes: this.getAvailableStatementTypes(dataPoints),
        lastUpdated
      },
      financialSummary: {
        revenue: revenueData,
        expenses: expenseData,
        profitability: profitabilityData,
        keyMetrics: this.calculateKeyMetrics(metrics, currency)
      },
      detailedBreakdowns: breakdowns,
      chartData
    };
  }

  private buildRevenueAnalysis(dataPoints: ProcessedFinancialItem[], currency: string) {
    const revenueItems = dataPoints.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );

    const totalRevenue = revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    // Monthly revenue breakdown
    const monthlyRevenue: Record<string, number> = {};
    revenueItems.forEach(item => {
      const period = this.formatPeriod(item.period);
      monthlyRevenue[period] = (monthlyRevenue[period] || 0) + Math.abs(item.amount);
    });

    // Determine trend
    const periods = Object.keys(monthlyRevenue).sort();
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (periods.length >= 2) {
      const firstValue = monthlyRevenue[periods[0]];
      const lastValue = monthlyRevenue[periods[periods.length - 1]];
      if (lastValue > firstValue * 1.05) trend = 'increasing';
      else if (lastValue < firstValue * 0.95) trend = 'decreasing';
    }

    return {
      total: this.formatCurrency(totalRevenue, currency),
      monthly: Object.fromEntries(
        Object.entries(monthlyRevenue).map(([period, amount]) => [
          period, this.formatCurrency(amount, currency)
        ])
      ),
      trend
    };
  }

  private buildExpenseAnalysis(dataPoints: ProcessedFinancialItem[], currency: string) {
    const expenseItems = dataPoints.filter(item => 
      item.category !== 'revenue' && 
      item.category !== 'sales' && 
      // Filter out derived calculation categories that shouldn't be treated as actual expenses
      item.category !== 'total' &&
      item.category !== 'calculation' &&
      item.category !== 'margin' &&
      item.category !== 'earnings_before_tax' &&
      item.category !== 'net_income' &&
      item.amount !== 0
    );

    const totalExpenses = expenseItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    expenseItems.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + Math.abs(item.amount);
    });

    // Operating expenses breakdown
    const opexItems = dataPoints.filter(item => item.category === 'operating_expenses');
    const opexTotal = opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    const opexBreakdown: Record<string, number> = {};
    opexItems.forEach(item => {
      if (item.subcategory) {
        opexBreakdown[item.subcategory] = (opexBreakdown[item.subcategory] || 0) + Math.abs(item.amount);
      }
    });

    return {
      total: this.formatCurrency(totalExpenses, currency),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([category, amount]) => [
          category, this.formatCurrency(amount, currency)
        ])
      ),
      operatingExpenses: {
        total: this.formatCurrency(opexTotal, currency),
        breakdown: Object.fromEntries(
          Object.entries(opexBreakdown).map(([subcategory, amount]) => [
            subcategory, this.formatCurrency(amount, currency)
          ])
        )
      }
    };
  }

  private buildProfitabilityAnalysis(metrics: any, currency: string) {
    return {
      grossProfit: this.formatCurrency(metrics.margins.gross, currency),
      operatingProfit: this.formatCurrency(metrics.margins.operating, currency),
      netProfit: this.formatCurrency(metrics.margins.net, currency),
      ebitda: this.formatCurrency(metrics.margins.ebitda, currency),
      margins: {
        gross: this.formatPercentage(metrics.margins.gross, metrics.revenue.total),
        operating: this.formatPercentage(metrics.margins.operating, metrics.revenue.total),
        net: this.formatPercentage(metrics.margins.net, metrics.revenue.total)
      }
    };
  }

  private buildProfitabilityAnalysisFromFilteredData(dataPoints: ProcessedFinancialItem[], currency: string) {
    // Calculate revenue
    const revenueItems = dataPoints.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );
    const totalRevenue = revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Calculate COGS
    const cogsItems = dataPoints.filter(item => 
      item.category === 'cogs' || item.category === 'cost_of_goods_sold'
    );
    const totalCogs = cogsItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Calculate Operating Expenses
    const opexItems = dataPoints.filter(item => 
      item.category === 'operating_expenses'
    );
    const totalOpex = opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Calculate other expenses (taxes, interest, etc.)
    const otherExpenseItems = dataPoints.filter(item => 
      item.category === 'other_income_expense' || 
      item.category === 'taxes' || 
      item.category === 'interest'
    );
    const totalOtherExpenses = otherExpenseItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    // Calculate margins properly
    const grossProfit = totalRevenue - totalCogs;
    const operatingProfit = grossProfit - totalOpex;
    const ebitda = grossProfit - totalOpex; // EBITDA = Operating Profit before D&A
    const netProfit = operatingProfit - totalOtherExpenses;

    console.log(`📊 PROFITABILITY CALCULATION DEBUG:`);
    console.log(`   Revenue: ${totalRevenue} (${this.formatCurrency(totalRevenue, currency)})`);
    console.log(`   COGS: ${totalCogs} (${this.formatCurrency(totalCogs, currency)})`);
    console.log(`   OPEX: ${totalOpex} (${this.formatCurrency(totalOpex, currency)})`);
    console.log(`   Other Expenses: ${totalOtherExpenses} (${this.formatCurrency(totalOtherExpenses, currency)})`);
    console.log(`   Gross Profit: ${grossProfit} (${this.formatCurrency(grossProfit, currency)})`);
    console.log(`   Operating Profit: ${operatingProfit} (${this.formatCurrency(operatingProfit, currency)})`);
    console.log(`   EBITDA: ${ebitda} (${this.formatCurrency(ebitda, currency)})`);
    console.log(`   Net Profit: ${netProfit} (${this.formatCurrency(netProfit, currency)})`);

    return {
      grossProfit: this.formatCurrency(grossProfit, currency),
      operatingProfit: this.formatCurrency(operatingProfit, currency),
      netProfit: this.formatCurrency(netProfit, currency),
      ebitda: this.formatCurrency(ebitda, currency),
      margins: {
        gross: this.formatPercentage(grossProfit, totalRevenue),
        operating: this.formatPercentage(operatingProfit, totalRevenue),
        net: this.formatPercentage(netProfit, totalRevenue)
      }
    };
  }

  private buildDetailedBreakdowns(dataPoints: ProcessedFinancialItem[], currency: string) {
    // Revenue by period
    const revenueByPeriod = this.buildRevenueByPeriod(dataPoints, currency);
    
    // Expenses by category
    const expensesByCategory = this.buildExpensesByCategory(dataPoints, currency);
    
    // Operating expense details
    const operatingExpenseDetails = this.buildOperatingExpenseDetails(dataPoints, currency);

    return {
      revenueByPeriod,
      expensesByCategory,
      operatingExpenseDetails
    };
  }

  private buildChartData(dataPoints: ProcessedFinancialItem[]) {
    // Monthly revenue chart
    const monthlyRevenue = this.buildMonthlyRevenueChart(dataPoints);
    
    // Expense breakdown chart
    const expenseBreakdown = this.buildExpenseBreakdownChart(dataPoints);
    
    // Profitability trend chart
    const profitabilityTrend = this.buildProfitabilityTrendChart(dataPoints);

    return {
      monthlyRevenue,
      expenseBreakdown,
      profitabilityTrend
    };
  }

  private buildRevenueByPeriod(dataPoints: ProcessedFinancialItem[], currency: string) {
    const revenueItems = dataPoints.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );

    const periodTotals: Record<string, number> = {};
    revenueItems.forEach(item => {
      const period = this.formatPeriod(item.period);
      periodTotals[period] = (periodTotals[period] || 0) + Math.abs(item.amount);
    });

    const periods = Object.keys(periodTotals).sort();
    return periods.map((period, index) => {
      const amount = periodTotals[period];
      let growth: string | undefined;
      
      if (index > 0) {
        const previousAmount = periodTotals[periods[index - 1]];
        const growthRate = ((amount - previousAmount) / previousAmount) * 100;
        growth = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;
      }

      return {
        period,
        amount: this.formatCurrency(amount, currency),
        growth
      };
    });
  }

  private buildExpensesByCategory(dataPoints: ProcessedFinancialItem[], currency: string) {
    const expenseItems = dataPoints.filter(item => 
      item.category !== 'revenue' && 
      item.category !== 'sales' && 
      // Filter out derived calculation categories
      item.category !== 'total' &&
      item.category !== 'calculation' &&
      item.category !== 'margin' &&
      item.category !== 'earnings_before_tax' &&
      item.category !== 'net_income' &&
      item.amount !== 0
    );

    const categoryTotals: Record<string, number> = {};
    expenseItems.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Math.abs(item.amount);
    });

    const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount]) => ({
        category: this.formatCategoryName(category),
        amount: this.formatCurrency(amount, currency),
        percentage: `${((amount / totalExpenses) * 100).toFixed(1)}%`
      }));
  }

  private buildOperatingExpenseDetails(dataPoints: ProcessedFinancialItem[], currency: string) {
    const opexItems = dataPoints.filter(item => item.category === 'operating_expenses');
    
    const subcategoryTotals: Record<string, number> = {};
    opexItems.forEach(item => {
      if (item.subcategory) {
        subcategoryTotals[item.subcategory] = (subcategoryTotals[item.subcategory] || 0) + Math.abs(item.amount);
      }
    });

    return Object.entries(subcategoryTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([subcategory, amount]) => ({
        subcategory: this.formatSubcategoryName(subcategory),
        amount: this.formatCurrency(amount, currency),
        description: this.getSubcategoryDescription(subcategory)
      }));
  }

  private buildMonthlyRevenueChart(dataPoints: ProcessedFinancialItem[]) {
    const revenueItems = dataPoints.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );

    const monthlyData: Record<string, number> = {};
    revenueItems.forEach(item => {
      const month = this.extractMonth(item.period);
      monthlyData[month] = (monthlyData[month] || 0) + Math.abs(item.amount);
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value }));
  }

  private buildExpenseBreakdownChart(dataPoints: ProcessedFinancialItem[]) {
    const expenseItems = dataPoints.filter(item => 
      item.category !== 'revenue' && 
      item.category !== 'sales' && 
      // Filter out derived calculation categories
      item.category !== 'total' &&
      item.category !== 'calculation' &&
      item.category !== 'margin' &&
      item.category !== 'earnings_before_tax' &&
      item.category !== 'net_income' &&
      item.amount !== 0
    );

    const categoryTotals: Record<string, number> = {};
    expenseItems.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Math.abs(item.amount);
    });

    return Object.entries(categoryTotals)
      .map(([category, value]) => ({ 
        category: this.formatCategoryName(category), 
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }

  private buildProfitabilityTrendChart(dataPoints: ProcessedFinancialItem[]) {
    const periods = Array.from(new Set(dataPoints.map(item => this.extractMonth(item.period)))).sort();
    
    return periods.map(month => {
      const monthItems = dataPoints.filter(item => this.extractMonth(item.period) === month);
      
      const revenue = monthItems
        .filter(item => item.category === 'revenue' || item.category === 'sales')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);
      
      const expenses = monthItems
        .filter(item => item.category !== 'revenue' && item.category !== 'sales' && item.amount !== 0)
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);
      
      return {
        month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  }

  // Utility methods
  private calculateKeyMetrics(metrics: any, currency: string) {
    const revenueGrowth = "0%"; // TODO: Calculate actual growth
    const expenseRatio = metrics.revenue.total > 0 
      ? `${((metrics.expenses.total / metrics.revenue.total) * 100).toFixed(1)}%`
      : "N/A";
    const burnRate = this.formatCurrency(metrics.expenses.operatingExpenses.total / 12, currency); // Monthly burn

    return {
      revenueGrowth,
      expenseRatio,
      burnRate
    };
  }

  private getAvailableStatementTypes(dataPoints: ProcessedFinancialItem[]): ('profit_loss' | 'cash_flow')[] {
    const types = new Set(dataPoints.map(item => item.statementType));
    return Array.from(types);
  }

  private formatCurrency(amount: number, currency: string): string {
    // Handle thousands formatting like warren-lightsail
    if (Math.abs(amount) >= 1000) {
      return `${currency} ${(amount / 1000).toFixed(0)}K`;
    }
    return `${currency} ${amount.toFixed(0)}`;
  }

  private formatPercentage(numerator: number, denominator: number): string {
    if (denominator === 0) return "0%";
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
  }

  private formatPeriod(period: string): string {
    // Convert period format to readable month
    if (period.includes('2025-01')) return 'January 2025';
    if (period.includes('2025-02')) return 'February 2025';
    if (period.includes('2025-03')) return 'March 2025';
    if (period.includes('2025-04')) return 'April 2025';
    if (period.includes('2025-05')) return 'May 2025';
    return period;
  }

  private extractMonth(period: string): string {
    if (period.includes('2025-01')) return '2025-01';
    if (period.includes('2025-02')) return '2025-02';
    if (period.includes('2025-03')) return '2025-03';
    if (period.includes('2025-04')) return '2025-04';
    if (period.includes('2025-05')) return '2025-05';
    return period.substring(0, 7); // Default to YYYY-MM format
  }

  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatSubcategoryName(subcategory: string): string {
    return subcategory
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getSubcategoryDescription(subcategory: string): string {
    const descriptions: Record<string, string> = {
      'salaries': 'Employee compensation and wages',
      'marketing': 'Marketing and advertising expenses',
      'technology': 'Software, hardware, and IT costs',
      'professional_services': 'Legal, accounting, and consulting fees',
      'travel_accommodation': 'Business travel and lodging',
      'office_supplies': 'Office materials and supplies',
      'utilities': 'Electricity, internet, and facility costs',
      'bank_fees': 'Banking and financial service charges',
      'meals_and_entertainment': 'Business meals and entertainment'
    };
    return descriptions[subcategory] || 'Other operational expenses';
  }
}

// Export singleton instance
export const financialDataAggregator = FinancialDataAggregator.getInstance();