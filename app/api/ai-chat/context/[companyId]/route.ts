/**
 * AI Chat Context Endpoint
 * 
 * This endpoint loads ALL financial data for a company into memory
 * to provide comprehensive context for AI chat analysis.
 * NEVER returns mocked data - only real Excel data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { configurationService } from '@/lib/services/configuration-service';
import { excelProcessingService } from '@/lib/services/excel-processing-service';

interface FinancialContext {
  companyId: string;
  companyName: string;
  pnl: {
    available: boolean;
    data: any;
    periods: string[];
    categories: {
      revenue: string[];
      cogs: string[];
      opex: string[];
      taxes: string[];
    };
    metrics: string[];
  };
  cashflow: {
    available: boolean;
    data: any;
    periods: string[];
    categories: {
      inflows: string[];
      outflows: string[];
    };
    metrics: string[];
  };
  metadata: {
    currency: string;
    units: string;
    lastUpdated: string;
    dataQuality: {
      completeness: number;
      periodsWithData: number;
      totalPeriods: number;
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Authentication & Authorization
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasCompanyAccess(user.id, params.companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('🤖 [AI Context] Loading comprehensive financial data for company:', params.companyId);

    // Get company details
    const { db, companies, financialDataFiles } = await import('@/lib/db');
    const { eq, desc } = await import('drizzle-orm');
    
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, params.companyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get all configurations for the company
    const configurations = await configurationService.getConfigurationsByCompany(params.companyId);
    
    // Get the latest Excel file
    const fileResult = await db
      .select({
        fileContent: financialDataFiles.fileContent,
        uploadedAt: financialDataFiles.uploadedAt
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, params.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt))
      .limit(1);

    if (fileResult.length === 0) {
      return NextResponse.json({ 
        error: 'No Excel files found. Please upload financial data first.' 
      }, { status: 404 });
    }

    const context: FinancialContext = {
      companyId: params.companyId,
      companyName: company[0].name,
      pnl: {
        available: false,
        data: null,
        periods: [],
        categories: {
          revenue: [],
          cogs: [],
          opex: [],
          taxes: []
        },
        metrics: []
      },
      cashflow: {
        available: false,
        data: null,
        periods: [],
        categories: {
          inflows: [],
          outflows: []
        },
        metrics: []
      },
      metadata: {
        currency: company[0].defaultCurrency || 'USD',
        units: 'normal',
        lastUpdated: fileResult[0].uploadedAt?.toISOString() || new Date().toISOString(),
        dataQuality: {
          completeness: 0,
          periodsWithData: 0,
          totalPeriods: 0
        }
      }
    };

    // Process P&L data if configuration exists
    const pnlConfig = configurations.find((c: any) => c.type === 'pnl' && c.isActive);
    if (pnlConfig && pnlConfig.configJson) {
      console.log('🤖 [AI Context] Processing P&L data with configuration:', pnlConfig.name);
      
      const pnlData = await excelProcessingService.processExcelWithConfiguration(
        fileResult[0].fileContent,
        pnlConfig.configJson as any,
        'pnl',
        pnlConfig.configJson?.metadata?.selectedSheet
      );

      if (pnlData) {
        // Extract categories from configuration
        const pnlCategories = pnlConfig.configJson?.categories || {};
        
        context.pnl = {
          available: true,
          data: pnlData,
          periods: pnlData.periods || [],
          categories: {
            revenue: Object.keys(pnlCategories.revenue || {}),
            cogs: Object.keys(pnlCategories.cogs || {}),
            opex: Object.keys(pnlCategories.opex || {}),
            taxes: Object.keys(pnlCategories.taxes || {})
          },
          metrics: [
            'revenue', 'cogs', 'grossProfit', 'grossMargin',
            'operatingExpenses', 'operatingIncome', 'operatingMargin',
            'ebitda', 'ebitdaMargin', 'taxes', 'netIncome', 'netMargin'
          ]
        };

        // Update metadata currency and units from config
        if (pnlConfig.configJson?.metadata) {
          context.metadata.currency = pnlConfig.configJson.metadata.currency || context.metadata.currency;
          context.metadata.units = pnlConfig.configJson.metadata.units || context.metadata.units;
        }
      }
    }

    // Process Cash Flow data if configuration exists
    const cashflowConfig = configurations.find((c: any) => c.type === 'cashflow' && c.isActive);
    if (cashflowConfig && cashflowConfig.configJson) {
      console.log('🤖 [AI Context] Processing Cash Flow data with configuration:', cashflowConfig.name);
      
      const cashflowData = await excelProcessingService.processExcelWithConfiguration(
        fileResult[0].fileContent,
        cashflowConfig.configJson as any,
        'cashflow',
        cashflowConfig.configJson?.metadata?.selectedSheet
      );

      if (cashflowData) {
        // Extract categories from configuration
        const cashflowCategories = cashflowConfig.configJson?.categories || {};
        
        context.cashflow = {
          available: true,
          data: cashflowData,
          periods: cashflowData.periods || [],
          categories: {
            inflows: Object.keys(cashflowCategories.inflows || {}),
            outflows: Object.keys(cashflowCategories.outflows || {})
          },
          metrics: [
            'totalInflows', 'totalOutflows', 'netCashFlow',
            'openingBalance', 'closingBalance', 'cashBurn',
            'runway', 'averageBurn', 'cumulativeCashFlow'
          ]
        };
      }
    }

    // Calculate data quality metrics
    const totalPeriods = Math.max(
      context.pnl.periods.length,
      context.cashflow.periods.length
    );
    
    const periodsWithData = Math.max(
      context.pnl.periods.filter(p => p && p !== '23' && p !== 'null').length,
      context.cashflow.periods.filter(p => p && p !== '23' && p !== 'null').length
    );

    context.metadata.dataQuality = {
      completeness: totalPeriods > 0 ? (periodsWithData / totalPeriods) * 100 : 0,
      periodsWithData,
      totalPeriods
    };

    console.log('🤖 [AI Context] Data loaded successfully:', {
      pnlAvailable: context.pnl.available,
      cashflowAvailable: context.cashflow.available,
      totalPeriods: context.metadata.dataQuality.totalPeriods,
      completeness: `${context.metadata.dataQuality.completeness.toFixed(1)}%`
    });

    return NextResponse.json(context);

  } catch (error) {
    console.error('❌ [AI Context] Error loading financial context:', error);
    return NextResponse.json({
      error: 'Failed to load financial context',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}