import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, eq, desc, and, sql } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decrypt, decryptObject } from "@/lib/encryption";

// GET /api/v1/companies/[id]/statements - Get all financial statements for a company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = parseInt(searchParams.get('offset') || '0');
      const statementType = searchParams.get('type'); // Optional filter
      const includeLineItems = searchParams.get('includeLineItems') === 'true';

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient permissions to view financial data'
          },
          { status: 403 }
        );
      }

      // Build query conditions
      const conditions = [eq(financialStatements.companyId, companyId)];
      if (statementType) {
        conditions.push(eq(financialStatements.statementType, statementType));
      }

      // Get financial statements
      const statements = await db
        .select()
        .from(financialStatements)
        .where(and(...conditions))
        .orderBy(desc(financialStatements.createdAt))
        .limit(limit)
        .offset(offset);

      // Process statements and optionally include line items
      const processedStatements = await Promise.all(
        statements.map(async (statement: any) => {
          const result: any = {
            id: statement.id,
            companyId: statement.companyId,
            statementType: statement.statementType,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            currency: statement.currency,
            sourceFile: statement.sourceFile,
            isAudited: statement.isAudited,
            createdAt: statement.createdAt,
            updatedAt: statement.updatedAt
          };

          // Include line items if requested
          if (includeLineItems) {
            const lineItems = await db
              .select()
              .from(financialLineItems)
              .where(eq(financialLineItems.statementId, statement.id))
              .orderBy(financialLineItems.displayOrder);

            // Decrypt line items
            result.lineItems = lineItems.map((item: any) => {
              // Decrypt account name if it's encrypted
              let decryptedAccountName = item.accountName;
              try {
                if (item.accountName && item.accountName.includes(':')) {
                  decryptedAccountName = decrypt(item.accountName);
                }
              } catch (e) {
                // If decryption fails, use original value
                console.warn('Failed to decrypt account name:', e);
              }

              // Decrypt metadata if present
              let decryptedMetadata = item.metadata;
              try {
                if (item.metadata && typeof item.metadata === 'string') {
                  decryptedMetadata = decryptObject(item.metadata);
                }
              } catch (e) {
                // If decryption fails, use original value
              }

              return {
                id: item.id,
                accountCode: item.accountCode,
                accountName: decryptedAccountName,
                category: item.category,
                subcategory: item.subcategory,
                amount: parseFloat(item.amount as any),
                isCalculated: item.isCalculated,
                isSubtotal: item.isSubtotal,
                isTotal: item.isTotal,
                displayOrder: item.displayOrder,
                originalText: item.originalText,
                confidenceScore: item.confidenceScore ? parseFloat(item.confidenceScore as any) : null,
                metadata: decryptedMetadata
              };
            });

            // Calculate summary
            result.summary = {
              totalLineItems: lineItems.length,
              totalRevenue: lineItems
                .filter((item: any) => item.category === 'revenue' || item.category === 'sales')
                .reduce((sum: any, item: any) => sum + parseFloat(item.amount as any), 0),
              totalExpenses: lineItems
                .filter((item: any) => item.category === 'expenses' || item.category === 'costs')
                .reduce((sum: any, item: any) => sum + parseFloat(item.amount as any), 0),
              hasEncryptedData: lineItems.some((item: any) => item.accountName?.includes(':'))
            };
          }

          return result;
        })
      );

      // Get total count for pagination
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(financialStatements)
        .where(and(...conditions));

      return NextResponse.json({
        success: true,
        data: {
          statements: processedStatements,
          pagination: {
            total: Number(totalCount),
            limit,
            offset,
            hasMore: offset + limit < Number(totalCount)
          }
        }
      });

    } catch (error) {
      console.error('Financial statements GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch financial statements',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  });
}

