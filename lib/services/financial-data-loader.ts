/**
 * FinancialDataLoader - Load existing data from database into memory
 * 
 * This service ensures that existing database data is available in memory
 * for AI analysis, following the warren-lightsail pattern
 */

import { db, financialStatements, financialLineItems, companies, eq, desc } from "@/lib/db";
import { inArray } from "drizzle-orm";
import { financialDataService, type ProcessedFinancialItem, type CompanyFinancialData } from "./financial-data-service";
import { decrypt } from "@/lib/encryption";

class FinancialDataLoader {
  private static instance: FinancialDataLoader;
  private loadedCompanies: Set<string> = new Set();

  private constructor() {
    console.log('📥 FinancialDataLoader initialized');
  }

  public static getInstance(): FinancialDataLoader {
    if (!FinancialDataLoader.instance) {
      FinancialDataLoader.instance = new FinancialDataLoader();
    }
    return FinancialDataLoader.instance;
  }

  /**
   * Load financial data for a company from database into memory
   */
  public async loadCompanyData(companyId: string): Promise<boolean> {
    // Check if already loaded to avoid unnecessary database queries
    if (this.loadedCompanies.has(companyId)) {
      console.log(`📋 Company ${companyId} data already loaded in memory`);
      return true;
    }

    // Check if data exists in memory
    if (financialDataService.hasCompanyData(companyId)) {
      this.loadedCompanies.add(companyId);
      console.log(`📋 Company ${companyId} data found in memory`);
      return true;
    }

    try {
      console.log(`📥 Loading financial data for company ${companyId} from database...`);

      // Get company information
      const companyInfo = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (companyInfo.length === 0) {
        console.log(`❌ Company ${companyId} not found in database`);
        return false;
      }

      // Get financial statements for the company
      const statements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId))
        .orderBy(desc(financialStatements.periodStart));

      if (statements.length === 0) {
        console.log(`📋 No financial statements found for company ${companyId}`);
        return false;
      }

      console.log(`📊 Found ${statements.length} financial statements for company ${companyId}`);

      // Get all line items for these statements
      const statementIds = statements.map((s: any) => s.id);
      
      // Get items for each statement individually to avoid complex IN queries
      const allLineItems: any[] = [];
      for (const statement of statements) {
        console.log(`📋 Loading line items for statement: ${statement.id}`);
        const items = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, statement.id));
        
        console.log(`📋 Found ${items.length} line items for statement ${statement.id}`);
        
        allLineItems.push(...items.map((item: any) => ({
          ...item,
          statementInfo: statement
        })));
      }

      if (allLineItems.length === 0) {
        console.log(`📋 No line items found for company ${companyId}`);
        return false;
      }

      console.log(`💾 Processing ${allLineItems.length} line items for memory storage...`);

      // Convert database items to ProcessedFinancialItem format
      const processedItems: ProcessedFinancialItem[] = allLineItems.map((item, index) => {
        const statement = item.statementInfo;
        const period = `${statement.periodStart} to ${statement.periodEnd}`;
        
        // Decrypt account name if it was encrypted
        let accountName = item.accountName;
        if (typeof accountName === 'string' && accountName.includes(':')) {
          try {
            accountName = decrypt(item.accountName);
          } catch (decryptError) {
            console.warn(`Failed to decrypt account name for item ${index}: ${decryptError}`);
            accountName = `Encrypted_Account_${index}`;
          }
        }
        
        return {
          accountName: accountName,
          category: item.category || 'uncategorized',
          subcategory: item.subcategory || undefined,
          amount: Number(item.amount) || 0,
          currency: statement.currency || 'ARS',
          period: period,
          statementType: 'profit_loss' as const, // For now, assuming P&L
          originalData: {
            id: item.id,
            accountCode: item.accountCode,
            confidenceScore: item.confidenceScore,
            metadata: item.metadata
          }
        };
      });

      // Calculate comprehensive metrics
      const metrics = this.calculateMetrics(processedItems);
      
      // Create company financial data structure
      const companyName = companyInfo[0].name || `Company_${companyId.substring(0, 8)}`;
      const currency = statements[0].currency || 'ARS';
      const periods = Array.from(new Set(processedItems.map(item => item.period)));
      
      const companyFinancialData: CompanyFinancialData = {
        companyId,
        companyName,
        currency,
        dataPoints: processedItems,
        metrics,
        periods,
        lastUpdated: new Date().toISOString(),
        summary: {
          totalRevenue: processedItems
            .filter(item => item.category === 'revenue' || item.category === 'sales')
            .reduce((sum, item) => sum + Math.abs(item.amount), 0),
          totalExpenses: processedItems
            .filter(item => item.category !== 'revenue' && item.category !== 'sales')
            .reduce((sum, item) => sum + Math.abs(item.amount), 0),
          netIncome: processedItems
            .filter(item => item.category === 'revenue' || item.category === 'sales')
            .reduce((sum, item) => sum + Math.abs(item.amount), 0) - 
            processedItems
            .filter(item => item.category !== 'revenue' && item.category !== 'sales')
            .reduce((sum, item) => sum + Math.abs(item.amount), 0),
          statementCounts: {
            profitLoss: statements.length,
            cashFlow: 0
          }
        }
      };

      // Store in memory
      financialDataService.storeCompanyData(companyId, companyFinancialData);
      this.loadedCompanies.add(companyId);

      console.log(`✅ Successfully loaded financial data for ${companyName}:`, {
        companyId,
        dataPoints: processedItems.length,
        periods: periods.length,
        currency,
        statements: statements.length
      });

      return true;

    } catch (error) {
      console.error(`❌ Failed to load financial data for company ${companyId}:`, error);
      return false;
    }
  }

  /**
   * Load data for multiple companies
   */
  public async loadMultipleCompanies(companyIds: string[]): Promise<{
    loaded: string[];
    failed: string[];
  }> {
    const loaded: string[] = [];
    const failed: string[] = [];

    for (const companyId of companyIds) {
      const success = await this.loadCompanyData(companyId);
      if (success) {
        loaded.push(companyId);
      } else {
        failed.push(companyId);
      }
    }

    console.log(`📊 Bulk load complete:`, {
      requested: companyIds.length,
      loaded: loaded.length,
      failed: failed.length
    });

    return { loaded, failed };
  }

  /**
   * Check if company data needs to be loaded
   */
  public needsLoading(companyId: string): boolean {
    return !this.loadedCompanies.has(companyId) && !financialDataService.hasCompanyData(companyId);
  }

  /**
   * Force reload of company data (clears cache and reloads from database)
   */
  public async forceReloadCompanyData(companyId: string): Promise<boolean> {
    console.log(`🔄 Force reloading data for company: ${companyId}`);
    
    // Clear both loader cache and service cache
    this.loadedCompanies.delete(companyId);
    financialDataService.clearCompanyData(companyId);
    
    // Reload from database
    return await this.loadCompanyData(companyId);
  }

  /**
   * Get loading status
   */
  public getLoadingStatus(): {
    loadedCompanies: string[];
    totalCompanies: number;
    memoryStats: any;
  } {
    return {
      loadedCompanies: Array.from(this.loadedCompanies),
      totalCompanies: this.loadedCompanies.size,
      memoryStats: financialDataService.getMemoryStats()
    };
  }

  private calculateMetrics(items: ProcessedFinancialItem[]) {
    const revenueItems = items.filter(item => 
      item.category === 'revenue' || item.category === 'sales'
    );
    const expenseItems = items.filter(item => 
      item.category !== 'revenue' && item.category !== 'sales'
    );
    const opexItems = items.filter(item => 
      item.category === 'operating_expenses'
    );
    
    const totalRevenue = revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalExpenses = expenseItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const totalOpex = opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    return {
      revenue: {
        total: totalRevenue,
        byPeriod: items.reduce((acc, item) => {
          if (item.category === 'revenue' || item.category === 'sales') {
            acc[item.period] = (acc[item.period] || 0) + Math.abs(item.amount);
          }
          return acc;
        }, {} as Record<string, number>),
        byCategory: revenueItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
          return acc;
        }, {} as Record<string, number>)
      },
      expenses: {
        total: totalExpenses,
        byPeriod: expenseItems.reduce((acc, item) => {
          acc[item.period] = (acc[item.period] || 0) + Math.abs(item.amount);
          return acc;
        }, {} as Record<string, number>),
        byCategory: expenseItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
          return acc;
        }, {} as Record<string, number>),
        operatingExpenses: {
          total: totalOpex,
          bySubcategory: opexItems.reduce((acc, item) => {
            if (item.subcategory) {
              acc[item.subcategory] = (acc[item.subcategory] || 0) + Math.abs(item.amount);
            }
            return acc;
          }, {} as Record<string, number>)
        }
      },
      margins: {
        gross: totalRevenue - totalExpenses,
        operating: totalRevenue - totalOpex,
        net: totalRevenue - totalExpenses,
        ebitda: totalRevenue - totalExpenses // Simplified EBITDA calculation
      },
      cashflow: {
        operating: 0, // TODO: Implement when cash flow data is available
        investing: 0,
        financing: 0,
        netChange: 0
      }
    };
  }
}

// Export singleton instance
export const financialDataLoader = FinancialDataLoader.getInstance();