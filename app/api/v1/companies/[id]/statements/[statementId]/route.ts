import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, eq, and } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decrypt } from "@/lib/encryption";

// GET /api/v1/companies/[id]/statements/[statementId] - Get a specific financial statement with line items
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; statementId: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      const statementId = params.statementId;

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to view financial data'
            }
          },
          { status: 403 }
        );
      }

      // Get the financial statement
      const [statement] = await db
        .select()
        .from(financialStatements)
        .where(and(
          eq(financialStatements.id, statementId),
          eq(financialStatements.companyId, companyId)
        ))
        .limit(1);

      if (!statement) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Financial statement not found'
            }
          },
          { status: 404 }
        );
      }

      // Get line items for this statement
      const lineItems = await db
        .select()
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, statementId))
        .orderBy(financialLineItems.displayOrder);

      // Decrypt line items
      const decryptedLineItems = lineItems.map((item: any) => {
        let decryptedAccountName = item.accountName;
        try {
          if (item.accountName && item.accountName.includes(':')) {
            decryptedAccountName = decrypt(item.accountName);
          }
        } catch (e) {
          console.warn('Failed to decrypt account name:', e);
        }

        return {
          id: item.id,
          accountCode: item.accountCode || '',
          accountName: decryptedAccountName || 'Sin nombre',
          category: item.category || 'other',
          value: parseFloat(item.amount as any) || 0,
          isInflow: determineIsInflow(item.category, parseFloat(item.amount as any)),
          displayOrder: item.displayOrder
        };
      });

      // Prepare response
      const response = {
        id: statement.id,
        statementType: statement.statementType,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        currency: statement.currency || 'MXN',
        createdAt: statement.createdAt,
        sourceFile: statement.sourceFile,
        lineItems: decryptedLineItems
      };

      return NextResponse.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('Financial statement GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch financial statement',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
          }
        },
        { status: 500 }
      );
    }
  });
}

// Helper function to determine if an amount is inflow or outflow
function determineIsInflow(category: string | null, amount: number): boolean {
  const inflowCategories = ['revenue', 'sales', 'income', 'other_income'];
  const outflowCategories = ['expenses', 'costs', 'cost_of_sales', 'operating_expense', 'other_expense', 'tax'];
  
  if (category && inflowCategories.includes(category.toLowerCase())) {
    return true;
  }
  
  if (category && outflowCategories.includes(category.toLowerCase())) {
    return false;
  }
  
  // For balance sheet items
  if (category === 'asset') return amount > 0;
  if (category === 'liability' || category === 'equity') return amount < 0;
  
  // Default: positive amounts are inflows
  return amount > 0;
}