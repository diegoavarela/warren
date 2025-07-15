import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, companies, eq, desc, and, sql } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

// GET /api/v1/companies/[id]/financial-status - Get financial data availability status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to view financial data for this company'
            }
          },
          { status: 403 }
        );
      }

      // Verify company exists and user has access
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Company not found'
            }
          },
          { status: 404 }
        );
      }

      // Get statement types and their latest data
      const statementTypes = ['profit_loss', 'cash_flow', 'balance_sheet', 'trial_balance'];
      const statements: Record<string, any> = {};

      for (const statementType of statementTypes) {
        // Get latest statement of this type
        const latestStatement = await db
          .select({
            id: financialStatements.id,
            statementType: financialStatements.statementType,
            createdAt: financialStatements.createdAt,
            periodStart: financialStatements.periodStart,
            periodEnd: financialStatements.periodEnd,
            currency: financialStatements.currency,
            metadata: financialStatements.metadata
          })
          .from(financialStatements)
          .where(and(
            eq(financialStatements.companyId, companyId),
            eq(financialStatements.statementType, statementType)
          ))
          .orderBy(desc(financialStatements.createdAt))
          .limit(1);

        if (latestStatement.length > 0) {
          const stmt = latestStatement[0];
          
          // Format period coverage
          let coverage = '';
          if (stmt.periodStart && stmt.periodEnd) {
            const startDate = new Date(stmt.periodStart);
            const endDate = new Date(stmt.periodEnd);
            
            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              // Invalid dates, try to extract from metadata
              console.warn('Invalid period dates, checking metadata');
              
              // Try to get period info from metadata
              if (stmt.metadata && typeof stmt.metadata === 'object') {
                const metadata = stmt.metadata as any;
                if (metadata.periodColumns && Array.isArray(metadata.periodColumns) && metadata.periodColumns.length > 0) {
                  const firstPeriod = metadata.periodColumns[0]?.label || metadata.periodColumns[0]?.periodLabel;
                  const lastPeriod = metadata.periodColumns[metadata.periodColumns.length - 1]?.label || metadata.periodColumns[metadata.periodColumns.length - 1]?.periodLabel;
                  
                  if (firstPeriod && lastPeriod) {
                    if (firstPeriod === lastPeriod) {
                      coverage = firstPeriod;
                    } else {
                      coverage = `${firstPeriod} - ${lastPeriod}`;
                    }
                  } else {
                    coverage = 'Period data available';
                  }
                } else {
                  coverage = 'Period info unavailable';
                }
              } else {
                coverage = 'No period data';
              }
            } else {
              // Use English month abbreviations for consistency
              const options: Intl.DateTimeFormatOptions = { month: 'short' };
              const yearOptions: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
              
              if (startDate.getTime() === endDate.getTime()) {
                // Same date - show single month
                coverage = startDate.toLocaleDateString('en-US', yearOptions);
              } else {
                // Date range - show start month to end month with year
                const startMonth = startDate.toLocaleDateString('en-US', options);
                const endMonth = endDate.toLocaleDateString('en-US', yearOptions);
                
                // If same year, show: Jan-Dec 2025
                if (startDate.getFullYear() === endDate.getFullYear()) {
                  coverage = `${startMonth}-${endMonth}`;
                } else {
                  // Different years: Jan 2024-Feb 2025
                  const startWithYear = startDate.toLocaleDateString('en-US', yearOptions);
                  coverage = `${startWithYear}-${endMonth}`;
                }
              }
            }
          }

          statements[statementType] = {
            available: true,
            latestPeriod: stmt.periodEnd || stmt.createdAt,
            coverage,
            lastUpload: stmt.createdAt,
            statementId: stmt.id
          };
        } else {
          statements[statementType] = {
            available: false,
            coverage: null,
            lastUpload: null,
            statementId: null
          };
        }
      }

      // Get total statements (since we don't have periods table)
      const totalPeriodsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId));

      const totalPeriods = totalPeriodsResult[0]?.count || 0;

      // Get last activity (most recent upload)
      const lastActivityResult = await db
        .select({ lastActivity: sql<string>`max(${financialStatements.createdAt})` })
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId));

      const lastActivity = lastActivityResult[0]?.lastActivity;

      // Check if company has any data at all
      const hasData = Object.values(statements).some((stmt: any) => stmt.available);

      return NextResponse.json({
        success: true,
        data: {
          hasData,
          statements,
          totalPeriods: Number(totalPeriods),
          lastActivity
        }
      });

    } catch (error) {
      console.error('Financial status GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch financial status'
          }
        },
        { status: 500 }
      );
    }
  });
}