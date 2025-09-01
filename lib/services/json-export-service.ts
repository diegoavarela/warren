export interface JsonExportData {
  // Company & Organization Info
  companyName: string;
  organizationName: string;
  companyTaxId?: string;
  industry?: string;
  contactEmail?: string;
  website?: string;
  
  // Report Meta Data
  reportType: 'pnl' | 'cashflow';
  locale: string;
  currency: string;
  currentPeriod: string;
  currentPeriodIndex: number;
  generatedBy: string;
  generatedAt: string;
  lastUpdate: string;
  
  // Financial Data Arrays
  periods: string[];
  
  // Dynamic financial metrics based on report type
  [key: string]: any;
  
  // Calculated Summaries
  currentMonthSummary: any;
  ytdSummary: any;
  annualProjections: any;
  growthTrends: number[];
  
  // Enhanced Data
  yearToDate?: any;
  projectedAnnual?: any;
  categories?: any;
  forecasts?: any;
  lineItems?: any;
  summary?: any;
  
  // Configuration data
  lastActualPeriod?: string;
  lastActualPeriodLabel?: string;
  periodMetadata?: any;
}

export class JsonExportService {
  
  /**
   * Generate a clean JSON export of financial dashboard data
   */
  async generateJsonExport(data: JsonExportData): Promise<Buffer> {
    // Create a clean, structured JSON output
    const jsonOutput = {
      metadata: {
        companyName: data.companyName,
        organizationName: data.organizationName,
        companyTaxId: data.companyTaxId,
        industry: data.industry,
        contactEmail: data.contactEmail,
        website: data.website,
        reportType: data.reportType,
        locale: data.locale,
        currency: data.currency,
        currentPeriod: data.currentPeriod,
        currentPeriodIndex: data.currentPeriodIndex,
        generatedBy: data.generatedBy,
        generatedAt: data.generatedAt,
        lastUpdate: data.lastUpdate,
        lastActualPeriod: data.lastActualPeriod,
        lastActualPeriodLabel: data.lastActualPeriodLabel
      },
      
      periods: data.periods,
      
      // Financial data structure varies by report type
      financialData: this.extractFinancialData(data),
      
      // Summaries and calculations
      summaries: {
        currentPeriod: data.currentMonthSummary,
        yearToDate: data.ytdSummary,
        annualProjections: data.annualProjections,
        growthTrends: data.growthTrends
      },
      
      // Enhanced analytics
      analytics: {
        yearToDate: data.yearToDate,
        projectedAnnual: data.projectedAnnual,
        forecasts: data.forecasts,
        summary: data.summary
      },
      
      // Raw line item data
      lineItems: data.lineItems,
      
      // Categories breakdown
      categories: data.categories,
      
      // Period configuration
      periodMetadata: data.periodMetadata
    };
    
    // Convert to formatted JSON buffer
    const jsonString = JSON.stringify(jsonOutput, null, 2);
    return Buffer.from(jsonString, 'utf-8');
  }
  
  /**
   * Extract financial data based on report type
   */
  private extractFinancialData(data: JsonExportData): any {
    if (data.reportType === 'cashflow') {
      return {
        inflows: {
          total: data.totalInflows?.values || [],
          breakdown: this.extractCategoryBreakdown(data.lineItems, 'inflow')
        },
        outflows: {
          total: data.totalOutflows?.values || [],
          breakdown: this.extractCategoryBreakdown(data.lineItems, 'outflow')
        },
        netCashFlow: data.netCashFlow?.values || [],
        balances: {
          initial: data.initialBalance?.values || [],
          final: data.finalBalance?.values || []
        },
        monthlyGeneration: data.monthlyGeneration?.values || []
      };
    } else {
      // P&L data structure
      return {
        revenues: {
          total: data.totalRevenues?.values || [],
          breakdown: this.extractCategoryBreakdown(data.lineItems, 'revenue')
        },
        costs: {
          total: data.totalCosts?.values || [],
          breakdown: this.extractCategoryBreakdown(data.lineItems, 'cost')
        },
        profitability: {
          gross: data.grossProfit?.values || [],
          net: data.netIncome?.values || [],
          ebitda: data.ebitda?.values || []
        },
        expenses: {
          operating: data.operatingExpenses?.values || [],
          breakdown: this.extractCategoryBreakdown(data.lineItems, 'expense')
        }
      };
    }
  }
  
  /**
   * Extract category breakdown from line items
   */
  private extractCategoryBreakdown(lineItems: any, type: string): any {
    if (!lineItems || typeof lineItems !== 'object') {
      return {};
    }
    
    const breakdown: any = {};
    
    // Extract relevant line items based on type
    Object.entries(lineItems).forEach(([key, item]: [string, any]) => {
      if (item?.values && Array.isArray(item.values)) {
        // Categorize based on key patterns
        const isRelevantCategory = this.isRelevantCategory(key, type);
        if (isRelevantCategory) {
          breakdown[key] = {
            label: item.label || this.formatCategoryLabel(key),
            values: item.values,
            description: item.description || ''
          };
        }
      }
    });
    
    return breakdown;
  }
  
  /**
   * Determine if a category is relevant for the given type
   */
  private isRelevantCategory(key: string, type: string): boolean {
    const keyLower = key.toLowerCase();
    
    switch (type) {
      case 'inflow':
        return keyLower.includes('income') || keyLower.includes('revenue') || 
               keyLower.includes('receipt') || keyLower.includes('sale');
               
      case 'outflow':
        return keyLower.includes('expense') || keyLower.includes('cost') || 
               keyLower.includes('payment') || keyLower.includes('outflow');
               
      case 'revenue':
        return keyLower.includes('revenue') || keyLower.includes('income') || 
               keyLower.includes('sale') || keyLower.includes('earning');
               
      case 'cost':
        return keyLower.includes('cost') || keyLower.includes('cogs') || 
               keyLower.includes('material');
               
      case 'expense':
        return keyLower.includes('expense') || keyLower.includes('operating');
        
      default:
        return true; // Include all if type not recognized
    }
  }
  
  /**
   * Format category label for display
   */
  private formatCategoryLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}