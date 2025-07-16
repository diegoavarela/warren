import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decryptObject } from "@/lib/encryption";

// GET /api/v1/templates/[id]/debug - Debug template data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const templateId = params.id;

      // Fetch template
      const [template] = await db
        .select()
        .from(mappingTemplates)
        .where(eq(mappingTemplates.id, templateId))
        .limit(1);
      
      if (!template) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Template not found'
          },
          { status: 404 }
        );
      }
      
      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, template.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient permissions'
          },
          { status: 403 }
        );
      }

      // Check if column mappings are encrypted
      let columnMappings = template.columnMappings;
      let isEncrypted = false;
      
      if (typeof columnMappings === 'string' && columnMappings.includes(':')) {
        isEncrypted = true;
        try {
          columnMappings = decryptObject(columnMappings);
        } catch (error) {
          console.error('Failed to decrypt template mappings:', error);
        }
      }

      // Analyze the template structure
      const analysis = {
        templateId: template.id,
        templateName: template.templateName,
        isEncrypted,
        currency: template.currency,
        statementType: template.statementType,
        columnMappingsType: typeof columnMappings,
        hasAccounts: !!(columnMappings?.accounts),
        accountsCount: columnMappings?.accounts?.length || 0,
        hasPeriodColumns: !!(columnMappings?.periodColumns),
        periodColumnsCount: columnMappings?.periodColumns?.length || 0,
        sampleAccounts: columnMappings?.accounts?.slice(0, 5).map((acc: any) => ({
          rowIndex: acc.rowIndex,
          accountName: acc.accountName,
          category: acc.category,
          subcategory: acc.subcategory,
          hasSubcategory: !!acc.subcategory,
          isTotal: acc.isTotal,
          isCalculated: acc.isCalculated
        })),
        accountsWithoutSubcategory: columnMappings?.accounts?.filter((acc: any) => 
          !acc.subcategory && !acc.isTotal && !acc.isCalculated && acc.category !== 'uncategorized'
        ).map((acc: any) => ({
          rowIndex: acc.rowIndex,
          accountName: acc.accountName,
          category: acc.category
        })),
        categorySummary: columnMappings?.accounts?.reduce((summary: any, acc: any) => {
          const category = acc.category || 'uncategorized';
          if (!summary[category]) {
            summary[category] = { count: 0, withSubcategory: 0, withoutSubcategory: 0 };
          }
          summary[category].count++;
          if (acc.subcategory) {
            summary[category].withSubcategory++;
          } else if (!acc.isTotal && !acc.isCalculated) {
            summary[category].withoutSubcategory++;
          }
          return summary;
        }, {})
      };

      return NextResponse.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Template debug error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Internal server error'
        },
        { status: 500 }
      );
    }
  });
}