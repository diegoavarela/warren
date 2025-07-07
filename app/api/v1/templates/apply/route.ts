import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decryptObject } from "@/lib/encryption";

// POST /api/v1/templates/apply - Apply a template to new data
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { templateId, rawData, fileName } = body;

      if (!templateId || !rawData) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields: templateId and rawData'
            }
          },
          { status: 400 }
        );
      }

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
            error: {
              code: 'NOT_FOUND',
              message: 'Template not found'
            }
          },
          { status: 404 }
        );
      }
      
      // Check user has access to use this template
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, template.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to use this template'
            }
          },
          { status: 403 }
        );
      }

      // Check if column mappings are encrypted
      let columnMappings = template.columnMappings;
      if (typeof columnMappings === 'string' && columnMappings.includes(':')) {
        // Appears to be encrypted, try to decrypt
        try {
          columnMappings = decryptObject(columnMappings);
        } catch (error) {
          console.error('Failed to decrypt template mappings:', error);
          // Use as-is if decryption fails
        }
      }

      // Update usage statistics
      await db
        .update(mappingTemplates)
        .set({ 
          usageCount: (template.usageCount || 0) + 1,
          lastUsedAt: new Date()
        })
        .where(eq(mappingTemplates.id, templateId));

      // Return the template configuration
      return NextResponse.json({
        success: true,
        data: {
          templateId,
          templateName: template.templateName,
          statementType: template.statementType,
          locale: template.locale,
          columnMappings,
          validationRules: template.validationRules,
          filePattern: template.filePattern,
          appliedAt: new Date().toISOString(),
          message: `Template "${template.templateName}" applied successfully`
        }
      });

    } catch (error) {
      console.error('Template apply error:', error);
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