import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, companies, users, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

// GET /api/v1/templates - List templates for accessible companies
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const url = new URL(request.url);
      const companyId = url.searchParams.get('companyId');
      const statementType = url.searchParams.get('statementType');
      
      // Build query conditions
      const conditions = [];
      
      // If companyId provided, check user has access
      if (companyId) {
        if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
          return NextResponse.json(
            { 
              success: false,
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Insufficient permissions to view templates for this company'
              }
            },
            { status: 403 }
          );
        }
        conditions.push(eq(mappingTemplates.companyId, companyId));
      } else {
        // Return empty if no company specified
        return NextResponse.json({
          success: true,
          data: [],
          meta: { total: 0 }
        });
      }
      
      // Filter by statement type if provided
      if (statementType) {
        conditions.push(eq(mappingTemplates.statementType, statementType));
      }
      
      // Fetch templates with company info
      const templates = await db
        .select({
          id: mappingTemplates.id,
          companyId: mappingTemplates.companyId,
          templateName: mappingTemplates.templateName,
          statementType: mappingTemplates.statementType,
          filePattern: mappingTemplates.filePattern,
          locale: mappingTemplates.locale,
          currency: mappingTemplates.currency,
          units: mappingTemplates.units,
          isDefault: mappingTemplates.isDefault,
          usageCount: mappingTemplates.usageCount,
          lastUsedAt: mappingTemplates.lastUsedAt,
          periodStart: mappingTemplates.periodStart,
          periodEnd: mappingTemplates.periodEnd,
          periodType: mappingTemplates.periodType,
          detectedPeriods: mappingTemplates.detectedPeriods,
          createdAt: mappingTemplates.createdAt,
          updatedAt: mappingTemplates.updatedAt,
          companyName: companies.name
        })
        .from(mappingTemplates)
        .leftJoin(companies, eq(mappingTemplates.companyId, companies.id))
        .where(...conditions)
        .orderBy(mappingTemplates.isDefault, mappingTemplates.usageCount);
      
      return NextResponse.json({
        success: true,
        data: templates,
        meta: {
          total: templates.length,
          companyId,
          statementType
        }
      });

    } catch (error) {
      console.error('Templates GET error:', error);
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

// POST /api/v1/templates - Create new template
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { 
        companyId, 
        templateName, 
        statementType,
        filePattern,
        columnMappings,
        validationRules,
        locale,
        isDefault 
      } = body;

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to create templates for this company'
            }
          },
          { status: 403 }
        );
      }

      // Validate required fields
      if (!companyId || !templateName || !statementType || !columnMappings) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields'
            }
          },
          { status: 400 }
        );
      }

      // If setting as default, unset other defaults for same company/statement type
      if (isDefault) {
        await db
          .update(mappingTemplates)
          .set({ isDefault: false })
          .where(eq(mappingTemplates.companyId, companyId))
          .where(eq(mappingTemplates.statementType, statementType));
      }

      // Create template
      const [newTemplate] = await db
        .insert(mappingTemplates)
        .values({
          companyId,
          templateName,
          statementType,
          filePattern,
          columnMappings,
          validationRules,
          locale: locale || 'es-MX',
          isDefault: isDefault || false,
          usageCount: 0
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newTemplate
      }, { status: 201 });

    } catch (error) {
      console.error('Templates POST error:', error);
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