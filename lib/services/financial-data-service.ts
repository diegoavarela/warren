/**
 * FinancialDataService - In-Memory Financial Data Storage
 * 
 * This service follows the warren-lightsail architecture pattern:
 * - Singleton pattern for persistent in-memory storage
 * - Stores processed financial data across requests
 * - Provides comprehensive data access for AI analysis
 */

export interface ProcessedFinancialItem {
  accountName: string;
  category: string;
  subcategory?: string;
  amount: number;
  currency: string;
  period: string;
  statementType: 'profit_loss' | 'cash_flow';
  originalData?: any;
}

export interface FinancialMetrics {
  revenue: {
    total: number;
    byPeriod: Record<string, number>;
    byCategory: Record<string, number>;
  };
  expenses: {
    total: number;
    byPeriod: Record<string, number>;
    byCategory: Record<string, number>;
    operatingExpenses: {
      total: number;
      bySubcategory: Record<string, number>;
    };
  };
  margins: {
    gross: number;
    operating: number;
    net: number;
    ebitda: number;
  };
  cashflow: {
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
  };
}

export interface CompanyFinancialData {
  companyId: string;
  companyName: string;
  currency: string;
  dataPoints: ProcessedFinancialItem[];
  metrics: FinancialMetrics;
  periods: string[];
  lastUpdated: string;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    statementCounts: {
      profitLoss: number;
      cashFlow: number;
    };
  };
}

class FinancialDataService {
  private static instance: FinancialDataService;
  private companyData: Map<string, CompanyFinancialData> = new Map();

  private constructor() {
    console.log('🏗️ FinancialDataService singleton initialized');
  }

  public static getInstance(): FinancialDataService {
    if (!FinancialDataService.instance) {
      FinancialDataService.instance = new FinancialDataService();
    }
    return FinancialDataService.instance;
  }

  /**
   * Store processed financial data for a company
   */
  public storeCompanyData(companyId: string, data: CompanyFinancialData): void {
    console.log(`💾 Storing financial data for company: ${companyId}`, {
      dataPoints: data.dataPoints.length,
      periods: data.periods.length,
      currency: data.currency
    });

    this.companyData.set(companyId, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Get all stored data for a company
   */
  public getCompanyData(companyId: string): CompanyFinancialData | null {
    const data = this.companyData.get(companyId);
    if (data) {
      console.log(`📊 Retrieved financial data for company: ${companyId}`, {
        dataPoints: data.dataPoints.length,
        lastUpdated: data.lastUpdated
      });
    } else {
      console.log(`❌ No financial data found for company: ${companyId}`);
    }
    return data || null;
  }

  /**
   * Add financial items to existing company data
   */
  public addFinancialItems(companyId: string, items: ProcessedFinancialItem[]): void {
    const existingData = this.companyData.get(companyId);
    
    if (existingData) {
      // Merge new items with existing
      const updatedItems = [...existingData.dataPoints, ...items];
      const updatedData = {
        ...existingData,
        dataPoints: updatedItems,
        lastUpdated: new Date().toISOString()
      };
      
      // Recalculate metrics
      updatedData.metrics = this.calculateMetrics(updatedItems, existingData.currency);
      updatedData.summary = this.calculateSummary(updatedItems);
      
      this.companyData.set(companyId, updatedData);
      console.log(`➕ Added ${items.length} financial items to company: ${companyId}`);
    } else {
      console.log(`❌ Cannot add items - no existing data for company: ${companyId}`);
    }
  }

  /**
   * Get financial data filtered by criteria
   */
  public getFilteredData(
    companyId: string,
    filters: {
      periods?: string[];
      categories?: string[];
      statementTypes?: ('profit_loss' | 'cash_flow')[];
    }
  ): ProcessedFinancialItem[] {
    const data = this.getCompanyData(companyId);
    if (!data) return [];

    let filteredItems = data.dataPoints;

    if (filters.periods) {
      filteredItems = filteredItems.filter(item => 
        filters.periods!.includes(item.period)
      );
    }

    if (filters.categories) {
      filteredItems = filteredItems.filter(item => 
        filters.categories!.includes(item.category)
      );
    }

    if (filters.statementTypes) {
      filteredItems = filteredItems.filter(item => 
        filters.statementTypes!.includes(item.statementType)
      );
    }

    console.log(`🔍 Filtered data for ${companyId}:`, {
      originalCount: data.dataPoints.length,
      filteredCount: filteredItems.length,
      filters
    });

    return filteredItems;
  }

  /**
   * Get available companies
   */
  public getAvailableCompanies(): string[] {
    return Array.from(this.companyData.keys());
  }

  /**
   * Check if company has data
   */
  public hasCompanyData(companyId: string): boolean {
    return this.companyData.has(companyId);
  }

  /**
   * Clear cached data for a company to force recalculation
   */
  public clearCompanyData(companyId: string): void {
    this.companyData.delete(companyId);
    console.log(`🗑️ Cleared cached data for company: ${companyId}`);
  }

  /**
   * Clear all cached data
   */
  public clearAllData(): void {
    this.companyData.clear();
    console.log(`🗑️ Cleared all cached financial data`);
  }


  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    totalCompanies: number;
    totalDataPoints: number;
    memoryEstimate: string;
  } {
    let totalDataPoints = 0;
    for (const data of Array.from(this.companyData.values())) {
      totalDataPoints += data.dataPoints.length;
    }

    const memoryEstimate = `~${Math.round(totalDataPoints * 0.5)}KB`;

    return {
      totalCompanies: this.companyData.size,
      totalDataPoints,
      memoryEstimate
    };
  }

  /**
   * Calculate comprehensive financial metrics
   */
  private calculateMetrics(items: ProcessedFinancialItem[], currency: string): FinancialMetrics {
    // Debug all categories first
    const allCategories = Array.from(new Set(items.map(item => item.category)));
    console.log(`🔍 RAW CATEGORIES DEBUG - All categories in data:`, allCategories);
    console.log(`🔍 RAW CATEGORIES DEBUG - Total items:`, items.length);
    
    const revenueItems = items.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );
    console.log(`🔍 FILTERING DEBUG - Revenue items found:`, revenueItems.length);
    
    const beforeFiltering = items.filter(item => 
      item.category !== 'revenue' && item.category !== 'sales'
    );
    console.log(`🔍 FILTERING DEBUG - Non-revenue items:`, beforeFiltering.length);
    console.log(`🔍 FILTERING DEBUG - Non-revenue categories:`, Array.from(new Set(beforeFiltering.map(item => item.category))));
    
    const expenseItems = items.filter(item => 
      item.category !== 'revenue' && 
      item.category !== 'sales' &&
      // Filter out derived calculation categories that shouldn't be treated as actual expenses
      item.category !== 'total' &&
      item.category !== 'calculation' &&
      item.category !== 'margin' &&
      item.category !== 'earnings_before_tax' &&
      item.category !== 'net_income'
    );
    
    console.log(`🔍 FILTERING DEBUG - After filtering expense items:`, expenseItems.length);
    console.log(`🔍 FILTERING DEBUG - Final expense categories:`, Array.from(new Set(expenseItems.map(item => item.category))));
    
    const problematicItems = items.filter(item => 
      ['total', 'calculation', 'margin', 'earnings_before_tax', 'net_income'].includes(item.category)
    );
    console.log(`🔍 FILTERING DEBUG - Problematic items that should be filtered:`, problematicItems.map(item => ({
      category: item.category,
      amount: item.amount,
      accountName: item.accountName
    })));
    const opexItems = items.filter(item => 
      item.category === 'operating_expenses'
    );

    // Revenue analysis
    const revenue = {
      total: revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
      byPeriod: this.groupByPeriod(revenueItems),
      byCategory: this.groupByCategory(revenueItems)
    };

    // Expense analysis - use filtered expenseItems that exclude calculation categories
    const expenses = {
      total: expenseItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
      byPeriod: this.groupByPeriod(expenseItems),
      byCategory: this.groupByCategory(expenseItems),
      operatingExpenses: {
        total: opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0),
        bySubcategory: this.groupBySubcategory(opexItems)
      }
    };

    console.log(`🔍 EXPENSE DEBUG - Filtered expense items: ${expenseItems.length}, Total: ${expenses.total}`);
    console.log(`🔍 EXPENSE DEBUG - Categories included:`, Array.from(new Set(expenseItems.map(item => item.category))));
    console.log(`🔍 EXPENSE DEBUG - Problematic categories found:`, items.filter(item => 
      ['total', 'calculation', 'margin', 'earnings_before_tax', 'net_income'].includes(item.category)
    ).map(item => `${item.category}: ${item.amount}`));

    // Get COGS (Cost of Goods Sold) and calculate proper margins
    const cogsItems = items.filter(item => 
      item.category === 'cogs' || item.category === 'cost_of_goods_sold'
    );
    const totalCogs = cogsItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    // Debug logging to see what's happening
    console.log(`🔍 EBITDA DEBUG - Revenue: ${revenue.total}, COGS: ${totalCogs}, OPEX: ${expenses.operatingExpenses.total}`);
    console.log(`🔍 EBITDA DEBUG - Total Expenses: ${expenses.total}`);
    console.log(`🔍 EBITDA DEBUG - Expense Categories:`, expenseItems.map(item => `${item.category}: ${item.amount}`).slice(0, 10));
    
    // Margin calculations - using proper financial formulas
    const grossMargin = revenue.total - totalCogs;
    const operatingMargin = grossMargin - expenses.operatingExpenses.total;
    const netMargin = operatingMargin - items.filter(item => 
      item.category === 'taxes' || item.category === 'interest'
    ).reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    // EBITDA = Revenue - COGS - Operating Expenses (before interest, taxes, depreciation, amortization)
    const ebitda = grossMargin - expenses.operatingExpenses.total;
    
    console.log(`🔍 EBITDA DEBUG - Calculated: Gross: ${grossMargin}, Operating: ${operatingMargin}, EBITDA: ${ebitda}`);

    return {
      revenue,
      expenses,
      margins: {
        gross: grossMargin,
        operating: operatingMargin,
        net: netMargin,
        ebitda
      },
      cashflow: {
        operating: 0, // TODO: Implement cashflow calculations
        investing: 0,
        financing: 0,
        netChange: 0
      }
    };
  }

  private calculateSummary(items: ProcessedFinancialItem[]) {
    const revenueItems = items.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );
    const expenseItems = items.filter(item => 
      item.category !== 'revenue' && item.category !== 'sales'
    );

    const totalRevenue = revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalExpenses = expenseItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      statementCounts: {
        profitLoss: items.filter(item => item.statementType === 'profit_loss').length,
        cashFlow: items.filter(item => item.statementType === 'cash_flow').length
      }
    };
  }

  private groupByPeriod(items: ProcessedFinancialItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      grouped[item.period] = (grouped[item.period] || 0) + Math.abs(item.amount);
    }
    return grouped;
  }

  private groupByCategory(items: ProcessedFinancialItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      grouped[item.category] = (grouped[item.category] || 0) + Math.abs(item.amount);
    }
    return grouped;
  }

  private groupBySubcategory(items: ProcessedFinancialItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      if (item.subcategory) {
        grouped[item.subcategory] = (grouped[item.subcategory] || 0) + Math.abs(item.amount);
      }
    }
    return grouped;
  }
}

// Export singleton instance
export const financialDataService = FinancialDataService.getInstance();