/**
 * Period Data Dumper - Creates JSON files with raw financial data per period
 * 
 * This utility creates separate JSON files for each period containing only
 * raw financial data without any pre-calculated metrics, allowing the AI
 * to calculate everything on-demand based on queries.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ProcessedFinancialItem } from '@/lib/services/financial-data-service';

export interface PeriodFinancialData {
  period: string;
  companyId: string;
  companyName: string;
  currency: string;
  lineItems: {
    accountName: string;
    category: string;
    subcategory?: string;
    amount: number;
    accountCode?: string;
  }[];
  metadata: {
    totalLineItems: number;
    statementType: 'profit_loss' | 'cash_flow';
    periodStart: string;
    periodEnd: string;
    lastUpdated: string;
  };
}

export class PeriodDataDumper {
  private static dataDir = join(process.cwd(), 'period-data');

  /**
   * Dump raw financial data for each period as separate JSON files
   */
  public static dumpPeriodData(
    companyId: string,
    companyName: string,
    currency: string,
    dataPoints: ProcessedFinancialItem[]
  ): string[] {
    // Ensure data directory exists
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    // Group data by period
    const periodGroups = this.groupByPeriod(dataPoints);
    const createdFiles: string[] = [];

    for (const [period, items] of Object.entries(periodGroups)) {
      // Filter out calculation artifacts - only keep actual line items
      const cleanItems = items.filter(item => 
        item.category !== 'total' &&
        item.category !== 'calculation' &&
        item.category !== 'margin' &&
        item.category !== 'earnings_before_tax' &&
        item.category !== 'net_income' &&
        item.amount !== 0
      );

      const periodData: PeriodFinancialData = {
        period,
        companyId,
        companyName,
        currency,
        lineItems: cleanItems.map(item => ({
          accountName: item.accountName,
          category: item.category,
          subcategory: item.subcategory,
          amount: item.amount,
          accountCode: item.originalData?.accountCode
        })),
        metadata: {
          totalLineItems: cleanItems.length,
          statementType: 'profit_loss', // TODO: Support cash flow when available
          periodStart: this.extractPeriodStart(period),
          periodEnd: this.extractPeriodEnd(period),
          lastUpdated: new Date().toISOString()
        }
      };

      // Create filename based on period
      const filename = this.createFilename(companyId, period);
      const filepath = join(this.dataDir, filename);

      try {
        writeFileSync(filepath, JSON.stringify(periodData, null, 2), 'utf8');
        createdFiles.push(filepath);
      } catch (error) {
        console.error(`❌ Failed to dump period data for ${period}:`, error);
      }
    }

    return createdFiles;
  }

  /**
   * Create index file with all available periods
   */
  public static createPeriodsIndex(
    companyId: string,
    companyName: string,
    periods: string[]
  ): string {
    const indexData = {
      companyId,
      companyName,
      totalPeriods: periods.length,
      availablePeriods: periods.sort(),
      dataFiles: periods.map(period => this.createFilename(companyId, period)),
      lastUpdated: new Date().toISOString(),
      instructions: {
        usage: "Each period file contains raw financial data for that specific period",
        note: "No pre-calculated metrics - AI should calculate everything on-demand",
        structure: "lineItems array contains all transactions for the period"
      }
    };

    const filename = `${companyId.substring(0, 8)}-periods-index.json`;
    const filepath = join(this.dataDir, filename);

    writeFileSync(filepath, JSON.stringify(indexData, null, 2), 'utf8');
    
    return filepath;
  }

  private static groupByPeriod(items: ProcessedFinancialItem[]): Record<string, ProcessedFinancialItem[]> {
    const groups: Record<string, ProcessedFinancialItem[]> = {};
    
    for (const item of items) {
      if (!groups[item.period]) {
        groups[item.period] = [];
      }
      groups[item.period].push(item);
    }
    
    return groups;
  }

  private static createFilename(companyId: string, period: string): string {
    // Convert period like "2025-01-01 to 2025-01-31" to "2025-01"
    const periodCode = period.split(' ')[0].substring(0, 7); // "2025-01"
    return `${companyId.substring(0, 8)}-${periodCode}.json`;
  }

  private static extractPeriodStart(period: string): string {
    return period.split(' to ')[0];
  }

  private static extractPeriodEnd(period: string): string {
    return period.split(' to ')[1];
  }

  /**
   * Clean up old data files
   */
  public static cleanupOldData(companyId: string): void {
    if (!existsSync(this.dataDir)) {
      return;
    }

    const fs = require('fs');
    const files = fs.readdirSync(this.dataDir);
    const companyPrefix = companyId.substring(0, 8);
    
    files.forEach((file: string) => {
      if (file.startsWith(companyPrefix)) {
        fs.unlinkSync(join(this.dataDir, file));
      }
    });
  }
}

export const periodDataDumper = PeriodDataDumper;