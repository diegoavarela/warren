import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financialStatements, financialLineItems, companies } from "@/lib/db/actual-schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decrypt, decryptObject, encrypt, encryptObject } from "@/lib/encryption";
import { v4 as uuidv4 } from "uuid";
import { validatePeriods, getPeriodValidationStatus } from "@/lib/utils/period-validation";
import { parsePeriodLabel } from "@/lib/utils/period-detection";

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

// POST /api/v1/companies/[id]/statements - Create a new financial statement from mapped data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      const body = await request.json();

      // Check permissions - use UPLOAD_FILES permission
      if (!hasPermission(user, PERMISSIONS.UPLOAD_FILES, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient permissions to upload financial data'
          },
          { status: 403 }
        );
      }

      const {
        mappingData,
        statementType = 'profit_loss',
        currency,
        units,
        sourceFile,
        uploadSession
      } = body;

      if (!mappingData || !currency || !units) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Missing required fields: mappingData, currency, units'
          },
          { status: 400 }
        );
      }

      const { periods, classifications, fullExcelData } = mappingData;
      
      // Convert period format from "Jan-25" to "2025-01-01"
      const convertPeriodToDate = (period: string): string => {
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
          'Ene': '01', 'Abr': '04', 'Ago': '08', 'Dic': '12' // Spanish months
        };
        
        const [monthName, yearStr] = period.split('-');
        const month = monthMap[monthName] || '01';
        const year = `20${yearStr}`; // Convert "25" to "2025"
        
        return `${year}-${month}-01`;
      };
      
      // Validate periods before processing
      const detectedPeriods = periods.map((period: string) => {
        const parseResult = parsePeriodLabel(period);
        return {
          columnIndex: 0,
          label: period,
          parsedDate: parseResult.date,
          month: parseResult.date ? parseResult.date.getMonth() + 1 : 0,
          year: parseResult.date ? parseResult.date.getFullYear() : 0,
          periodType: parseResult.type,
          confidence: parseResult.confidence,
          hasData: true, // Assume has data since it's being uploaded
          dataPoints: 1,
          classification: 'ACTUAL' as const
        };
      });

      // Get existing periods for this company
      const existingStatements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId));
      
      const existingPeriods = existingStatements.map((stmt: any) => ({
        periodEnd: stmt.periodEnd,
        createdAt: stmt.createdAt,
        updatedAt: stmt.updatedAt,
        id: stmt.id
      }));

      // Validate periods
      const validationResult = validatePeriods(detectedPeriods, existingPeriods);
      
      if (!validationResult.isValid) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Period validation failed',
            details: {
              errors: validationResult.errors,
              warnings: validationResult.warnings
            }
          },
          { status: 400 }
        );
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('Period validation warnings:', validationResult.warnings);
      }
      
      // Determine period range
      const periodStart = convertPeriodToDate(periods[0]);
      const periodEnd = convertPeriodToDate(periods[periods.length - 1]);

      // Get company details to find organizationId
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Company not found'
          },
          { status: 404 }
        );
      }

      // Create financial statement
      const statementId = uuidv4();
      const [statement] = await db.insert(financialStatements).values({
        id: statementId,
        companyId,
        organizationId: company.organizationId,
        statementType,
        periodStart,
        periodEnd,
        currency,
        sourceFile: sourceFile || uploadSession,
        isAudited: false
      }).returning();

      // Process classifications and create line items
      const lineItemsToInsert = [];
      let displayOrder = 0;

      // Sort classifications by row index to maintain order
      const sortedClassifications = Object.entries(classifications as Record<string, any>)
        .sort(([a], [b]) => Number(a) - Number(b));

      for (const [rowIdx, classification] of sortedClassifications) {
        if (classification.type === 'section') continue; // Skip section headers

        const row = fullExcelData.rows[Number(rowIdx)];
        if (!row) continue;

        // Get period values and convert period keys to proper date format
        const originalPeriodValues = classification.periodValues || {};
        const periodValues: Record<string, number> = {};
        
        // Convert period keys from "Jan-25" to "2025-01"
        Object.entries(originalPeriodValues).forEach(([period, value]) => {
          const dateKey = convertPeriodToDate(period).substring(0, 7); // "2025-01"
          periodValues[dateKey] = value as number;
        });
        
        // Calculate total across all periods
        const totalAmount = Object.values(periodValues).reduce((sum: number, val: any) => sum + (val || 0), 0);

        // Determine category based on flowType and classification content
        let category = 'other';
        if (classification.flowType === 'inbound') {
          category = 'revenue';
        } else if (classification.flowType === 'outbound') {
          const categoryLower = classification.category.toLowerCase();
          
          // Enhanced COGS detection
          if (categoryLower.includes('cost of') || 
              categoryLower.includes('cogs') ||
              categoryLower.includes('cost of sales') ||
              categoryLower.includes('cost of goods') ||
              categoryLower.includes('cost of revenue') ||
              categoryLower.includes('direct cost') ||
              categoryLower.includes('costo de') ||
              categoryLower.includes('costo de ventas')) {
            category = 'cogs';
          }
          // Enhanced Operating Expenses detection
          else if (categoryLower.includes('operating') ||
                   categoryLower.includes('administrative') ||
                   categoryLower.includes('selling') ||
                   categoryLower.includes('general') ||
                   categoryLower.includes('opex') ||
                   categoryLower.includes('gastos') ||
                   categoryLower.includes('personnel') ||
                   categoryLower.includes('salary') ||
                   categoryLower.includes('marketing') ||
                   categoryLower.includes('office') ||
                   categoryLower.includes('rent') ||
                   categoryLower.includes('utilities')) {
            category = 'operating_expenses';
          }
          // Tax expenses
          else if (categoryLower.includes('tax') ||
                   categoryLower.includes('impuesto') ||
                   categoryLower.includes('fiscal')) {
            category = 'taxes';
          }
          // Other income/expenses
          else if (categoryLower.includes('other income') ||
                   categoryLower.includes('interest income') ||
                   categoryLower.includes('otros ingresos')) {
            category = 'other_income';
          }
          else if (categoryLower.includes('other expense') ||
                   categoryLower.includes('interest expense') ||
                   categoryLower.includes('otros gastos')) {
            category = 'other_expenses';
          }
          // Depreciation and amortization
          else if (categoryLower.includes('depreciation') ||
                   categoryLower.includes('depreciación') ||
                   categoryLower.includes('amortization') ||
                   categoryLower.includes('amortización')) {
            category = 'depreciation';
          }
          // Default to operating expenses for most outbound flows
          else {
            category = 'operating_expenses';
          }
        }

        lineItemsToInsert.push({
          id: uuidv4(),
          statementId,
          accountCode: `ACC${String(displayOrder + 1).padStart(4, '0')}`,
          accountName: encrypt(classification.category),
          category,
          subcategory: classification.type,
          amount: totalAmount,
          isCalculated: classification.type === 'calculated',
          isSubtotal: classification.type === 'subtotal',
          isTotal: classification.type === 'total',
          displayOrder: displayOrder++,
          originalText: row.rowData[0]?.toString() || '',
          confidenceScore: 1.0, // Since it's manually mapped
          metadata: encryptObject({
            periodValues,
            rowIndex: rowIdx,
            indentLevel: classification.indentLevel,
            children: classification.children,
            originalRow: row.rowData,
            units: units // Store units in metadata for each line item
          })
        });
      }

      // Insert all line items
      if (lineItemsToInsert.length > 0) {
        await db.insert(financialLineItems).values(lineItemsToInsert);
      }

      return NextResponse.json({
        success: true,
        data: {
          statementId,
          message: 'Financial statement created successfully',
          summary: {
            totalLineItems: lineItemsToInsert.length,
            periods: periods.length,
            currency,
            units
          }
        }
      });

    } catch (error) {
      console.error('Financial statement POST error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create financial statement',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  });
}

