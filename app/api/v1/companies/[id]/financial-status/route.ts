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
            currency: financialStatements.currency
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
            
            // Simple date range format
            if (startDate.getTime() === endDate.getTime()) {
              // Same date - probably placeholder
              coverage = startDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
            } else {
              // Date range
              coverage = `${startDate.toLocaleDateString('es-ES', { month: 'short' })}-${endDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
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