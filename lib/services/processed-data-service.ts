/**
 * Processed Data Service - Configuration-Based Data Layer
 * 
 * This service provides access to processed financial data stored in the
 * processedFinancialData table. It replaces the old hardcoded data sources
 * with a clean, configuration-driven approach.
 */

import { db, processedFinancialData, companyConfigurations } from '@/lib/db';
import type { ProcessedFinancialData, CompanyConfiguration } from '@/lib/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { ProcessedData, ProcessedDataRow, ProcessedDataCategory } from '@/lib/types/configurations';

export interface ProcessedDataQuery {
  companyId: string;
  type?: 'pnl' | 'cashflow';
  periodStart?: Date;
  periodEnd?: Date;
  currency?: string;
  units?: string;
  limit?: number;
}

export interface ProcessedDataSummary {
  companyId: string;
  type: 'pnl' | 'cashflow';
  periodCount: number;
  latestPeriod: string;
  currency: string;
  units: string;
  configurationName: string;
}

export interface ProcessedPeriodData {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  data: ProcessedData;
  configurationName: string;
  currency: string;
  units: string;
}

export class ProcessedDataService {
  
  /**
   * Get all processed financial data for a company
   */
  async getCompanyData(query: ProcessedDataQuery): Promise<ProcessedPeriodData[]> {
    try {
      console.log('🔍 ProcessedDataService: Getting company data', query);

      const conditions = [
        eq(processedFinancialData.companyId, query.companyId),
        eq(processedFinancialData.processingStatus, 'completed')
      ];

      // Add type filter if specified
      if (query.type) {
        conditions.push(eq(companyConfigurations.type, query.type));
      }

      // Add date range filters if specified
      if (query.periodStart) {
        conditions.push(gte(processedFinancialData.periodStart, query.periodStart.toISOString().split('T')[0]));
      }
      if (query.periodEnd) {
        conditions.push(lte(processedFinancialData.periodEnd, query.periodEnd.toISOString().split('T')[0]));
      }

      const results = await db
        .select({
          id: processedFinancialData.id,
          dataJson: processedFinancialData.dataJson,
          periodStart: processedFinancialData.periodStart,
          periodEnd: processedFinancialData.periodEnd,
          currency: processedFinancialData.currency,
          units: processedFinancialData.units,
          configurationName: companyConfigurations.name,
          configurationType: companyConfigurations.type,
          processedAt: processedFinancialData.processedAt
        })
        .from(processedFinancialData)
        .innerJoin(companyConfigurations, eq(processedFinancialData.configId, companyConfigurations.id))
        .where(and(...conditions))
        .orderBy(desc(processedFinancialData.periodStart))
        .limit(query.limit || 12);

      console.log(`✅ ProcessedDataService: Found ${results.length} records`);

      return results.map((result: any) => {
        // Ensure dates are properly converted to Date objects
        const periodStart = new Date(result.periodStart!);
        const periodEnd = new Date(result.periodEnd!);
        
        return {
          period: this.formatPeriod(periodStart, periodEnd),
          periodStart: periodStart,
          periodEnd: periodEnd,
          data: result.dataJson as ProcessedData,
          configurationName: result.configurationName,
          currency: result.currency || 'USD',
          units: result.units || 'normal'
        };
      });

    } catch (error) {
      console.error('❌ ProcessedDataService: Error getting company data', error);
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('company not found')) {
          throw new Error('Company not found or you do not have access to this company');
        } else if (error.message.includes('database')) {
          throw new Error('Database connection error. Please try again later.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Request timed out. Please try again.');
        } else {
          throw new Error(`Failed to get company data: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while retrieving company data');
      }
    }
  }

  /**
   * Get P&L data for dashboard
   */
  async getPnLData(companyId: string, limit: number = 12): Promise<ProcessedPeriodData[]> {
    return this.getCompanyData({
      companyId,
      type: 'pnl',
      limit
    });
  }

  /**
   * Get Cash Flow data for dashboard  
   */
  async getCashFlowData(companyId: string, limit: number = 12): Promise<ProcessedPeriodData[]> {
    return this.getCompanyData({
      companyId,
      type: 'cashflow',
      limit
    });
  }

  /**
   * Get available periods for a company
   */
  async getAvailablePeriods(companyId: string, type?: 'pnl' | 'cashflow'): Promise<{ period: string; periodStart: Date; periodEnd: Date; type: string }[]> {
    try {
      console.log('🔍 ProcessedDataService: Getting available periods', { companyId, type });

      const conditions = [
        eq(processedFinancialData.companyId, companyId),
        eq(processedFinancialData.processingStatus, 'completed')
      ];

      if (type) {
        conditions.push(eq(companyConfigurations.type, type));
      }

      const results = await db
        .selectDistinct({
          periodStart: processedFinancialData.periodStart,
          periodEnd: processedFinancialData.periodEnd,
          type: companyConfigurations.type
        })
        .from(processedFinancialData)
        .innerJoin(companyConfigurations, eq(processedFinancialData.configId, companyConfigurations.id))
        .where(and(...conditions))
        .orderBy(desc(processedFinancialData.periodStart));

      return results
        .filter((r: any) => r.periodStart && r.periodEnd)
        .map((result: any) => {
          const periodStart = new Date(result.periodStart!);
          const periodEnd = new Date(result.periodEnd!);
          
          return {
            period: this.formatPeriod(periodStart, periodEnd),
            periodStart: periodStart,
            periodEnd: periodEnd,
            type: result.type
          };
        });

    } catch (error) {
      console.error('❌ ProcessedDataService: Error getting periods', error);
      throw new Error(`Failed to get periods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get company summary statistics
   */
  async getCompanySummary(companyId: string): Promise<ProcessedDataSummary[]> {
    try {
      console.log('🔍 ProcessedDataService: Getting company summary', companyId);

      const results = await db
        .select({
          type: companyConfigurations.type,
          periodCount: sql<number>`count(*)`.as('period_count'),
          latestPeriod: sql<string>`max(to_char(${processedFinancialData.periodStart}, 'YYYY-MM'))`.as('latest_period'),
          currency: sql<string>`mode() within group (order by ${processedFinancialData.currency})`.as('currency'),
          units: sql<string>`mode() within group (order by ${processedFinancialData.units})`.as('units'),
          configurationName: sql<string>`mode() within group (order by ${companyConfigurations.name})`.as('configuration_name')
        })
        .from(processedFinancialData)
        .innerJoin(companyConfigurations, eq(processedFinancialData.configId, companyConfigurations.id))
        .where(and(
          eq(processedFinancialData.companyId, companyId),
          eq(processedFinancialData.processingStatus, 'completed')
        ))
        .groupBy(companyConfigurations.type);

      return results.map((result: any) => ({
        companyId,
        type: result.type as 'pnl' | 'cashflow',
        periodCount: result.periodCount,
        latestPeriod: result.latestPeriod,
        currency: result.currency || 'USD',
        units: result.units || 'normal',
        configurationName: result.configurationName
      }));

    } catch (error) {
      console.error('❌ ProcessedDataService: Error getting summary', error);
      throw new Error(`Failed to get summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific period data
   */
  async getPeriodData(
    companyId: string, 
    periodStart: Date, 
    periodEnd: Date, 
    type: 'pnl' | 'cashflow'
  ): Promise<ProcessedPeriodData | null> {
    try {
      console.log('🔍 ProcessedDataService: Getting specific period data', { companyId, periodStart, periodEnd, type });

      const result = await db
        .select({
          dataJson: processedFinancialData.dataJson,
          periodStart: processedFinancialData.periodStart,
          periodEnd: processedFinancialData.periodEnd,
          currency: processedFinancialData.currency,
          units: processedFinancialData.units,
          configurationName: companyConfigurations.name
        })
        .from(processedFinancialData)
        .innerJoin(companyConfigurations, eq(processedFinancialData.configId, companyConfigurations.id))
        .where(and(
          eq(processedFinancialData.companyId, companyId),
          eq(processedFinancialData.processingStatus, 'completed'),
          eq(companyConfigurations.type, type),
          eq(processedFinancialData.periodStart, periodStart.toISOString().split('T')[0]),
          eq(processedFinancialData.periodEnd, periodEnd.toISOString().split('T')[0])
        ))
        .limit(1);

      if (result.length === 0) {
        console.log('⚠️ ProcessedDataService: No data found for period');
        return null;
      }

      const data = result[0];
      const periodStart = new Date(data.periodStart!);
      const periodEnd = new Date(data.periodEnd!);
      
      return {
        period: this.formatPeriod(periodStart, periodEnd),
        periodStart: periodStart,
        periodEnd: periodEnd,
        data: data.dataJson as ProcessedData,
        configurationName: data.configurationName,
        currency: data.currency || 'USD',
        units: data.units || 'normal'
      };

    } catch (error) {
      console.error('❌ ProcessedDataService: Error getting period data', error);
      throw new Error(`Failed to get period data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper to format period display
   */
  private formatPeriod(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    
    if (startMonth === endMonth) {
      return startMonth;
    }
    
    return `${startMonth} - ${endMonth}`;
  }

  /**
   * Transform data for dashboard compatibility
   * This ensures data is in the format expected by existing dashboard components
   */
  transformForDashboard(periodsData: ProcessedPeriodData[], type: 'pnl' | 'cashflow') {
    if (periodsData.length === 0) {
      return {
        periods: [],
        data: {},
        metadata: {
          currency: 'USD',
          units: 'normal',
          type
        }
      };
    }

    // Use the most recent data for metadata
    const latestPeriod = periodsData[0];
    
    return {
      periods: periodsData.map(p => p.period),
      data: this.mergePeriodsData(periodsData),
      metadata: {
        currency: latestPeriod.currency,
        units: latestPeriod.units,
        type,
        configurationName: latestPeriod.configurationName
      }
    };
  }

  /**
   * Merge data from multiple periods into dashboard format
   */
  private mergePeriodsData(periodsData: ProcessedPeriodData[]) {
    if (periodsData.length === 0) return {};

    const merged: any = {
      dataRows: {},
      categories: {}
    };

    // Process each period
    periodsData.forEach((periodData, index) => {
      const data = periodData.data;
      
      // Merge dataRows
      Object.entries(data.dataRows || {}).forEach(([key, row]) => {
        if (!merged.dataRows[key]) {
          merged.dataRows[key] = {
            label: row.label,
            values: new Array(periodsData.length).fill(null),
            total: 0
          };
        }
        merged.dataRows[key].values[index] = row.values[0] || 0;
        merged.dataRows[key].total += row.values[0] || 0;
      });

      // Merge categories
      Object.entries(data.categories || {}).forEach(([sectionKey, section]) => {
        if (!merged.categories[sectionKey]) {
          merged.categories[sectionKey] = {};
        }
        
        Object.entries(section).forEach(([categoryKey, category]) => {
          if (!merged.categories[sectionKey][categoryKey]) {
            merged.categories[sectionKey][categoryKey] = {
              label: category.label,
              values: new Array(periodsData.length).fill(null),
              total: 0,
              subcategories: {}
            };
          }
          
          merged.categories[sectionKey][categoryKey].values[index] = category.values[0] || 0;
          merged.categories[sectionKey][categoryKey].total += category.values[0] || 0;
          
          // Merge subcategories if they exist
          if (category.subcategories) {
            Object.entries(category.subcategories).forEach(([subKey, subcategory]) => {
              if (!merged.categories[sectionKey][categoryKey].subcategories[subKey]) {
                merged.categories[sectionKey][categoryKey].subcategories[subKey] = {
                  label: subcategory.label,
                  values: new Array(periodsData.length).fill(null),
                  total: 0
                };
              }
              
              merged.categories[sectionKey][categoryKey].subcategories[subKey].values[index] = subcategory.values[0] || 0;
              merged.categories[sectionKey][categoryKey].subcategories[subKey].total += subcategory.values[0] || 0;
            });
          }
        });
      });
    });

    return merged;
  }
}

// Export singleton instance
export const processedDataService = new ProcessedDataService();