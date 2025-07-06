import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, companies, users, companyUsers, eq, count, sql } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

// GET /api/v1/companies/[id]/stats - Get company statistics
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
              message: 'Insufficient permissions to view company statistics'
            }
          },
          { status: 403 }
        );
      }

      // Get total users for the company by counting entries in company_users table
      const totalUsersResult = await db
        .select({ count: count() })
        .from(companyUsers)
        .where(eq(companyUsers.companyId, companyId))
        .where(eq(companyUsers.isActive, true));
      
      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get total templates for the company
      const totalTemplatesResult = await db
        .select({ count: count() })
        .from(mappingTemplates)
        .where(eq(mappingTemplates.companyId, companyId));
      
      const totalTemplates = totalTemplatesResult[0]?.count || 0;

      // Get active templates (templates that have been used)
      const activeTemplatesResult = await db
        .select({ count: count() })
        .from(mappingTemplates)
        .where(eq(mappingTemplates.companyId, companyId))
        .where(sql`${mappingTemplates.usageCount} > 0`);
      
      const activeTemplates = activeTemplatesResult[0]?.count || 0;

      // Get documents this month (placeholder until documents table is implemented)
      // TODO: Query actual documents/uploads table filtered by current month
      const documentsThisMonth = 0; // Return 0 until properly implemented

      // Get template usage stats for additional context
      const templateUsageResult = await db
        .select({ 
          totalUsage: sql<number>`sum(${mappingTemplates.usageCount})`,
          avgUsage: sql<number>`avg(${mappingTemplates.usageCount})`
        })
        .from(mappingTemplates)
        .where(eq(mappingTemplates.companyId, companyId));

      const templateStats = templateUsageResult[0] || { totalUsage: 0, avgUsage: 0 };

      return NextResponse.json({
        success: true,
        data: {
          totalUsers,
          totalTemplates,
          activeTemplates,
          documentsThisMonth,
          templateStats: {
            totalUsage: templateStats.totalUsage || 0,
            averageUsage: Number(templateStats.avgUsage) || 0
          }
        }
      });

    } catch (error) {
      console.error('Company stats GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
          }
        },
        { status: 500 }
      );
    }
  });
}