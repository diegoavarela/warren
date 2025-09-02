import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { companies, organizations, companyConfigurations, financialDataFiles, processedFinancialData } from '@/shared/db';
import { eq, sql, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/copy-center/source-companies - Get all companies that can be used as sources for copying
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Build where conditions
    const whereClause = organizationId 
      ? and(eq(companies.isActive, true), eq(companies.organizationId, organizationId))
      : eq(companies.isActive, true);

    // Get companies with actual counts using subqueries
    const sourceCompaniesList = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
        isActive: companies.isActive,
        configurationsCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM company_configurations cc 
          WHERE cc.company_id = ${companies.id}
        ), 0)`,
        dataFilesCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM financial_data_files fd 
          WHERE fd.company_id = ${companies.id}
        ), 0)`,
        processedDataCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM processed_financial_data pd 
          WHERE pd.company_id = ${companies.id}
        ), 0)`,
        lastProcessedAt: sql<string>`(
          SELECT MAX(pd.processed_at)
          FROM processed_financial_data pd 
          WHERE pd.company_id = ${companies.id}
        )`
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(whereClause);

    // Format the response with proper null handling and sort by total data
    const formattedList = sourceCompaniesList
      .map(row => ({
        id: row.id,
        name: row.name,
        organizationId: row.organizationId,
        organizationName: row.organizationName || 'Unknown Organization',
        isActive: row.isActive,
        configurationsCount: Number(row.configurationsCount) || 0,
        dataFilesCount: Number(row.dataFilesCount) || 0,
        processedDataCount: Number(row.processedDataCount) || 0,
        lastProcessedAt: row.lastProcessedAt,
      }))
      .sort((a, b) => {
        const totalA = a.configurationsCount + a.dataFilesCount + a.processedDataCount;
        const totalB = b.configurationsCount + b.dataFilesCount + b.processedDataCount;
        return totalB - totalA; // Descending order
      });

    return NextResponse.json({
      success: true,
      data: formattedList,
    });
  } catch (error) {
    console.error('Source companies GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source companies' },
      { status: 500 }
    );
  }
});