/**
 * Financial Data Cache Service
 * Pre-processes and caches all financial data for AI chat consumption
 * Based on warren-lightsail's elegant approach
 */

import { financialDataAggregator } from './financial-data-aggregator';

export interface CachedFinancialMetrics {
  companyId: string;
  companyName: string;
  currency: string;
  lastUpdated: string;
  
  // Pre-calculated totals (like warren-lightsail)
  totalRevenue: number;
  totalExpenses: number;
  totalEBITDA: number;
  totalNetIncome: number;
  
  // Monthly breakdowns (structured like warren-lightsail)
  monthlyMetrics: Array<{
    period: string;
    month: string; // Jan-25, Feb-25, etc.
    revenue: number;
    cogs: number;
    operatingExpenses: number;
    ebitda: number;
    netIncome: number;
    grossProfit: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
  }>;
  
  // Category breakdowns (for detail queries)
  categoryBreakdowns: {
    [category: string]: {
      total: number;
      items: Array<{
        accountName: string;
        subcategory: string | null;
        amount: number;
        period: string;
      }>;
    };
  };
  
  // Quick stats for AI context
  stats: {
    periodsAvailable: number;
    totalDataPoints: number;
    hasRevenue: boolean;
    hasExpenses: boolean;
    hasEBITDA: boolean;
    availablePeriods: string[];
    topExpenseCategories: Array<{ category: string; amount: number }>;
  };
}

class FinancialDataCacheService {
  private cache = new Map<string, CachedFinancialMetrics>();
  
  /**
   * Generate and cache all financial data for a company
   * This runs when user opens the chat
   */
  async generateCacheForCompany(companyId: string): Promise<CachedFinancialMetrics> {
    
    try {
      // Get all the raw data
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss'],
        periodLimit: 12,
      });
      
      // Process into structured format (warren-lightsail style)
      const monthlyMetrics = (detailedData.aggregatedData.periodAnalysis || []).map(period => {
        // Convert period to readable month format
        const monthName = this.formatPeriodToMonth(period.period);
        
        return {
          period: period.period,
          month: monthName,
          revenue: period.revenue || 0,
          cogs: period.expenses || 0, // Using expenses as COGS proxy
          operatingExpenses: 0, // Will calculate from line items
          ebitda: period.ebitda || 0,
          netIncome: period.netIncome || 0,
          grossProfit: period.grossProfit || 0,
          grossMargin: period.revenue > 0 ? ((period.grossProfit || 0) / period.revenue) * 100 : 0,
          operatingMargin: period.revenue > 0 ? ((period.ebitda || 0) / period.revenue) * 100 : 0,
          netMargin: period.revenue > 0 ? ((period.netIncome || 0) / period.revenue) * 100 : 0,
        };
      });
      
      // Build category breakdowns
      const categoryBreakdowns: { [category: string]: any } = {};
      
      for (const statement of (detailedData.statements || [])) {
        for (const item of (statement.lineItems || [])) {
          const category = item.category || 'uncategorized';
          
          if (!categoryBreakdowns[category]) {
            categoryBreakdowns[category] = {
              total: 0,
              items: []
            };
          }
          
          categoryBreakdowns[category].items.push({
            accountName: item.accountName,
            subcategory: item.subcategory,
            amount: item.amount,
            period: statement.period,
          });
          
          // Smart totaling (don't double-count totals)
          if (!item.accountName.toLowerCase().includes('total')) {
            categoryBreakdowns[category].total += Math.abs(item.amount);
          }
        }
      }
      
      // Calculate top expense categories
      const topExpenseCategories = Object.entries(categoryBreakdowns)
        .filter(([category]) => category !== 'revenue')
        .map(([category, data]: [string, any]) => ({ category, amount: data.total }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      // Create cached metrics
      const cachedMetrics: CachedFinancialMetrics = {
        companyId,
        companyName: summary.companyName,
        currency: (detailedData.statements && detailedData.statements[0]?.currency) || 'ARS',
        lastUpdated: new Date().toISOString(),
        
        // Totals
        totalRevenue: detailedData.aggregatedData.totalRevenue,
        totalExpenses: detailedData.aggregatedData.totalExpenses,
        totalEBITDA: monthlyMetrics.reduce((sum, m) => sum + m.ebitda, 0),
        totalNetIncome: detailedData.aggregatedData.netIncome,
        
        // Monthly data
        monthlyMetrics,
        
        // Category breakdowns
        categoryBreakdowns,
        
        // Stats
        stats: {
          periodsAvailable: monthlyMetrics.length,
          totalDataPoints: summary.totalDataPoints,
          hasRevenue: detailedData.aggregatedData.totalRevenue > 0,
          hasExpenses: detailedData.aggregatedData.totalExpenses > 0,
          hasEBITDA: monthlyMetrics.some(m => m.ebitda !== 0),
          availablePeriods: monthlyMetrics.map(m => m.month),
          topExpenseCategories,
        }
      };
      
      // Cache it
      this.cache.set(companyId, cachedMetrics);
      
      return cachedMetrics;
      
    } catch (error) {
      console.error('❌ CACHE SERVICE - Error generating cache:', error);
      throw new Error('Failed to generate financial data cache');
    }
  }
  
  /**
   * Get cached data (used by AI chat)
   */
  getCachedData(companyId: string): CachedFinancialMetrics | null {
    return this.cache.get(companyId) || null;
  }
  
  /**
   * Check if cache exists and is fresh
   */
  isCacheFresh(companyId: string, maxAgeMinutes: number = 30): boolean {
    const cached = this.cache.get(companyId);
    if (!cached) return false;
    
    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;
    
    return cacheAge < maxAge;
  }
  
  /**
   * Clear cache for a company
   */
  clearCache(companyId: string): void {
    this.cache.delete(companyId);
  }
  
  /**
   * Build AI-friendly data summary (warren-lightsail style)
   */
  buildAIDataSummary(companyId: string): string | null {
    const cached = this.getCachedData(companyId);
    if (!cached) return null;
    
    return `
COMPANY: ${cached.companyName}
CURRENCY: ${cached.currency}
DATA FRESHNESS: ${cached.lastUpdated}

📊 FINANCIAL TOTALS (PRE-CALCULATED):
✅ Total Revenue: ${cached.totalRevenue.toLocaleString()} ${cached.currency}
✅ Total Expenses: ${cached.totalExpenses.toLocaleString()} ${cached.currency}
✅ Total EBITDA: ${cached.totalEBITDA.toLocaleString()} ${cached.currency}
✅ Total Net Income: ${cached.totalNetIncome.toLocaleString()} ${cached.currency}

📈 MONTHLY METRICS (${cached.stats.periodsAvailable} periods):
${cached.monthlyMetrics.map(m => 
  `${m.month}: Revenue ${m.revenue.toLocaleString()}, EBITDA ${m.ebitda.toLocaleString()}, Net Income ${m.netIncome.toLocaleString()} ${cached.currency}`
).join('\n')}

📁 CATEGORY BREAKDOWNS AVAILABLE:
${Object.entries(cached.categoryBreakdowns).map(([category, data]: [string, any]) => 
  `${category}: ${data.total.toLocaleString()} ${cached.currency} (${data.items.length} items)`
).join('\n')}

🔝 TOP EXPENSE CATEGORIES:
${cached.stats.topExpenseCategories.map(cat => 
  `${cat.category}: ${cat.amount.toLocaleString()} ${cached.currency}`
).join('\n')}

DATA STATS:
- Periods: ${cached.stats.availablePeriods.join(', ')}
- Total Data Points: ${cached.stats.totalDataPoints}
- Has Revenue: ${cached.stats.hasRevenue ? '✅' : '❌'}
- Has EBITDA: ${cached.stats.hasEBITDA ? '✅' : '❌'}
`;
  }
  
  private formatPeriodToMonth(period: string): string {
    // Convert "2025-01-01 to 2025-01-31" to "Jan-25"
    const match = period.match(/(\d{4})-(\d{2})/);
    if (!match) return period;
    
    const year = match[1].slice(-2); // Last 2 digits
    const monthNum = parseInt(match[2]);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${months[monthNum - 1]}-${year}`;
  }
}

// Singleton instance
export const financialDataCache = new FinancialDataCacheService();