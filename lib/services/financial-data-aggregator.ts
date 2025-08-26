/**
 * Financial Data Aggregator Service
 * Aggregates P&L and Cash Flow data for a specific company to provide context for AI chat
 */

import { db } from '@/lib/db';
import { 
  financialStatements, 
  financialLineItems, 
  companies 
} from '@/lib/db/actual-schema';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export interface CompanyFinancialSummary {
  companyId: string;
  companyName: string;
  availableStatements: {
    pnl: StatementSummary[];
    cashflow: StatementSummary[];
  };
  recentPeriods: string[];
  totalDataPoints: number;
  lastUpdated: string;
}

export interface StatementSummary {
  id: string;
  statementType: 'profit_loss' | 'cash_flow';
  periodStart: string;
  periodEnd: string;
  currency: string;
  totalLineItems: number;
  categories: string[];
  sourceFile: string | null;
}

export interface DetailedFinancialData {
  company: {
    id: string;
    name: string;
  };
  statements: {
    id: string;
    type: 'profit_loss' | 'cash_flow';
    period: string;
    currency: string;
    lineItems: {
      accountName: string;
      category: string | null;
      subcategory: string | null;
      amount: number;
      isInflow: boolean;
      percentageOfRevenue: number | null;
    }[];
  }[];
  aggregatedData: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    topCategories: { category: string; amount: number; type: 'revenue' | 'expense' }[];
    periodAnalysis: {
      period: string;
      revenue: number;
      expenses: number;
      netIncome: number;
      ebitda?: number;
      grossProfit?: number;
      currency?: string;
      categoryBreakdown?: {
        [category: string]: {
          total: number;
          items: Array<{
            accountName: string;
            subcategory: string | null;
            amount: number;
            isCalculated: boolean;
            isTotal: boolean;
          }>;
        };
      };
    }[];
  };
}

export class FinancialDataAggregator {
  /**
   * Determine if a category represents revenue/income (inflow) or expense (outflow)
   */
  private isRevenueCategory(category: string | null): boolean {
    if (!category) return false;
    
    const revenueCategories = [
      'revenue',
      'service_revenue', 
      'other_revenue',
      'interest_income',
      'sales',
      'income'
    ];
    
    const expenseCategories = [
      'cogs', // Cost of Goods Sold
      'cost_of_sales',
      'salaries_wages',
      'payroll_taxes',
      'benefits',
      'rent_utilities',
      'marketing_advertising',
      'professional_services',
      'office_supplies',
      'depreciation',
      'insurance',
      'travel_entertainment',
      'interest_expense',
      'income_tax',
      'other_taxes',
      'operating_expenses',
      'administrative_expenses'
    ];

    // Check for revenue first
    if (revenueCategories.includes(category.toLowerCase())) {
      return true;
    }
    
    // Check for expenses
    if (expenseCategories.includes(category.toLowerCase())) {
      return false;
    }
    
    // Handle "total" category - skip these in aggregation to avoid double counting
    if (category.toLowerCase() === 'total') {
      return false; // Don't count totals as they're already summed
    }
    
    // For unknown categories, default to expense (safer assumption)
    return false;
  }

  /**
   * Get high-level financial summary for a company
   */
  async getCompanyFinancialSummary(companyId: string): Promise<CompanyFinancialSummary> {
    try {
      // Get company info
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company.length) {
        throw new Error('Company not found');
      }

      // Get all financial statements for the company
      const statements = await db
        .select({
          id: financialStatements.id,
          statementType: financialStatements.statementType,
          periodStart: financialStatements.periodStart,
          periodEnd: financialStatements.periodEnd,
          currency: financialStatements.currency,
          sourceFile: financialStatements.sourceFile,
          updatedAt: financialStatements.updatedAt,
        })
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId))
        .orderBy(desc(financialStatements.periodEnd));
      statements.forEach((stmt: any) => {
      });

      // Get line item counts and categories for each statement
      const statementSummaries: { [key: string]: StatementSummary } = {};
      const allPeriods = new Set<string>();
      let totalDataPoints = 0;

      for (const statement of statements) {
        const lineItems = await db
          .select({
            category: financialLineItems.category,
          })
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, statement.id));

        const categories = Array.from(new Set(lineItems.map((item: any) => item.category).filter(Boolean))) as string[];
        const periodLabel = `${statement.periodStart} to ${statement.periodEnd}`;
        
        allPeriods.add(periodLabel);
        totalDataPoints += lineItems.length;

        statementSummaries[statement.id] = {
          id: statement.id,
          statementType: statement.statementType as 'profit_loss' | 'cash_flow',
          periodStart: statement.periodStart,
          periodEnd: statement.periodEnd,
          currency: statement.currency,
          totalLineItems: lineItems.length,
          categories,
          sourceFile: statement.sourceFile,
        };
      }

      // Group by statement type
      const pnlStatements = Object.values(statementSummaries).filter(s => s.statementType === 'profit_loss');
      const cashflowStatements = Object.values(statementSummaries).filter(s => s.statementType === 'cash_flow');

      // Get most recent update
      const lastUpdated = statements.length > 0 
        ? statements[0].updatedAt?.toISOString() || new Date().toISOString()
        : new Date().toISOString();

      return {
        companyId,
        companyName: company[0].name,
        availableStatements: {
          pnl: pnlStatements,
          cashflow: cashflowStatements,
        },
        recentPeriods: Array.from(allPeriods) as string[],
        totalDataPoints,
        lastUpdated,
      };

    } catch (error) {
      console.error('Error getting company financial summary:', error);
      throw new Error('Failed to retrieve financial summary');
    }
  }

  /**
   * Get detailed financial data - ONLY READ STORED VALUES FROM DATABASE
   */
  async getDetailedFinancialData(
    companyId: string, 
    options: {
      statementTypes?: ('profit_loss' | 'cash_flow')[];
      periodLimit?: number;
      includeCategories?: string[];
    } = {}
  ): Promise<DetailedFinancialData> {
    try {
      const { statementTypes = ['profit_loss', 'cash_flow'], periodLimit = 12 } = options;

      // Get company info
      const company = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company.length) {
        throw new Error('Company not found');
      }

      // Get financial statements
      let statementsQuery = db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId))
        .orderBy(desc(financialStatements.periodEnd));

      if (periodLimit) {
        statementsQuery = statementsQuery.limit(periodLimit);
      }

      const statements = await statementsQuery;

      // Filter by statement types
      const filteredStatements = statements.filter((s: any) => 
        statementTypes.includes(s.statementType as 'profit_loss' | 'cash_flow')
      );

      // Process each statement - READ STORED VALUES ONLY
      const detailedStatements = [];
      const periodAnalysis = [];

      for (const statement of filteredStatements) {
        
        // Get ALL line items for this statement
        const lineItems = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, statement.id));

        // Process line items and extract STORED calculated values ONLY
        const processedLineItems = [];
        let storedRevenue: number | undefined;
        let storedCOGS: number | undefined;
        let storedGrossProfit: number | undefined;
        let storedOperatingExpenses: number | undefined;
        let storedEBITDA: number | undefined;
        let storedNetIncome: number | undefined;

        for (const item of lineItems) {
          const amount = parseFloat(item.amount.toString());
          const accountName = item.originalText || item.accountName;
          
          processedLineItems.push({
            accountName,
            category: item.category,
            subcategory: item.subcategory,
            amount,
            isInflow: item.category === 'revenue',
            percentageOfRevenue: item.percentageOfRevenue ? parseFloat(item.percentageOfRevenue.toString()) : null,
          });

          // Extract STORED calculated values - NO CALCULATIONS
          if (item.category === 'calculation' || item.isCalculated) {
            const lowerAccountName = accountName.toLowerCase();
            
            if (lowerAccountName.includes('ebitda') && !lowerAccountName.includes('margin')) {
              storedEBITDA = amount;
            } else if (lowerAccountName.includes('gross profit')) {
              storedGrossProfit = amount;
            } else if (lowerAccountName.includes('net income')) {
              storedNetIncome = amount;
            }
          } else if (item.category === 'revenue' && (item.isTotal || accountName.toLowerCase().includes('total revenue'))) {
            storedRevenue = amount;
          } else if (item.category === 'cogs' && (item.isTotal || accountName.toLowerCase().includes('total cost'))) {
            storedCOGS = amount;
          } else if (item.category === 'operating_expenses' && (item.isTotal || accountName.toLowerCase().includes('total operating'))) {
            storedOperatingExpenses = amount;
          }
        }

        // Add period analysis with STORED values only - NO CALCULATIONS
        periodAnalysis.push({
          period: `${statement.periodStart} to ${statement.periodEnd}`,
          revenue: storedRevenue || 0,
          expenses: (storedCOGS || 0) + (storedOperatingExpenses || 0),
          netIncome: storedNetIncome || 0,
          ebitda: storedEBITDA || 0,
          grossProfit: storedGrossProfit || 0,
          currency: statement.currency,
        });

        detailedStatements.push({
          id: statement.id,
          type: statement.statementType as 'profit_loss' | 'cash_flow',
          period: `${statement.periodStart} to ${statement.periodEnd}`,
          currency: statement.currency,
          lineItems: processedLineItems,
        });
      }

      // Use STORED values for aggregation - NO CALCULATIONS
      const totalRevenue = periodAnalysis.reduce((sum, p) => sum + (p.revenue || 0), 0);
      const totalExpenses = periodAnalysis.reduce((sum, p) => sum + (p.expenses || 0), 0);
      const netIncome = periodAnalysis.reduce((sum, p) => sum + (p.netIncome || 0), 0);

      return {
        company: company[0],
        statements: detailedStatements,
        aggregatedData: {
          totalRevenue,
          totalExpenses,
          netIncome,
          topCategories: [], // Not calculated
          periodAnalysis,
        },
      };

    } catch (error) {
      console.error('Error getting detailed financial data:', error);
      throw new Error('Failed to retrieve detailed financial data');
    }
  }

  /**
   * Search financial data by query
   */
  async searchFinancialData(
    companyId: string,
    query: string,
    options: {
      statementTypes?: ('profit_loss' | 'cash_flow')[];
      categories?: string[];
      limit?: number;
    } = {}
  ): Promise<{
    accounts: { name: string; category: string | null; amount: number; period: string }[];
    categories: { name: string; total: number; count: number }[];
    periods: { period: string; matchingItems: number }[];
  }> {
    try {
      const { statementTypes = ['profit_loss', 'cash_flow'], limit = 50 } = options;
      
      // Get statements for the company
      const statements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId))
        .orderBy(desc(financialStatements.periodEnd));

      const filteredStatements = statements.filter((s: any) => 
        statementTypes.includes(s.statementType as 'profit_loss' | 'cash_flow')
      );

      const searchResults = {
        accounts: [] as any[],
        categories: new Map<string, { total: number; count: number }>(),
        periods: new Map<string, number>(),
      };

      const queryLower = query.toLowerCase();

      for (const statement of filteredStatements) {
        const lineItems = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, statement.id));

        const period = `${statement.periodStart} to ${statement.periodEnd}`;

        for (const item of lineItems) {
          try {
            // Decrypt account name for search
            const decryptedName = item.accountName.startsWith('enc_') 
              ? decrypt(item.accountName) 
              : item.accountName;

            // Check if item matches query
            const matchesName = decryptedName.toLowerCase().includes(queryLower);
            const matchesCategory = item.category?.toLowerCase().includes(queryLower);
            const matchesSubcategory = item.subcategory?.toLowerCase().includes(queryLower);

            if (matchesName || matchesCategory || matchesSubcategory) {
              const amount = parseFloat(item.amount.toString());

              searchResults.accounts.push({
                name: decryptedName,
                category: item.category,
                amount,
                period,
              });

              // Update category aggregation
              if (item.category) {
                const existing = searchResults.categories.get(item.category) || { total: 0, count: 0 };
                existing.total += Math.abs(amount);
                existing.count += 1;
                searchResults.categories.set(item.category, existing);
              }

              // Update period counts
              const periodCount = searchResults.periods.get(period) || 0;
              searchResults.periods.set(period, periodCount + 1);
            }

          } catch (decryptError) {
          }
        }
      }

      return {
        accounts: searchResults.accounts.slice(0, limit),
        categories: Array.from(searchResults.categories.entries()).map(([name, data]) => ({ name, ...data })),
        periods: Array.from(searchResults.periods.entries()).map(([period, matchingItems]) => ({ period, matchingItems })),
      };

    } catch (error) {
      console.error('Error searching financial data:', error);
      throw new Error('Failed to search financial data');
    }
  }

  /**
   * Smart category detail builder - knows when to browse vs calculate
   */
  private buildCategoryDetails(lineItems: any[]) {
    const categoryDetails: any = {};

    for (const item of lineItems) {
      const accountName = item.originalText || item.accountName;
      const amount = parseFloat(item.amount.toString());
      const category = item.category || 'uncategorized';

      // Initialize category if not exists
      if (!categoryDetails[category]) {
        categoryDetails[category] = {
          total: 0,
          items: [],
        };
      }

      // Add item to category
      categoryDetails[category].items.push({
        accountName,
        subcategory: item.subcategory,
        amount,
        isCalculated: item.isCalculated || false,
        isTotal: item.isTotal || false,
      });

      // Smart totaling logic:
      // - For calculated/total items: don't add to total (they ARE the total)
      // - For regular line items: add to category total
      if (!item.isCalculated && !item.isTotal) {
        categoryDetails[category].total += Math.abs(amount);
      }
    }

    // For categories with totals, use the stored total instead of calculated
    Object.keys(categoryDetails).forEach(category => {
      const totalItems = categoryDetails[category].items.filter((item: any) => item.isTotal);
      if (totalItems.length > 0) {
        // Use the stored total, not the calculated sum
        categoryDetails[category].total = totalItems[0].amount;
      }
    });

    return categoryDetails;
  }
}

// Singleton instance
export const financialDataAggregator = new FinancialDataAggregator();