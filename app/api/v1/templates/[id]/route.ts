import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

// GET /api/v1/templates/[id] - Get template details
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
            error: {
              code: 'NOT_FOUND',
              message: 'Template not found'
            }
          },
          { status: 404 }
        );
      }
      
      // Check user has access to this company's templates
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, template.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to view this template'
            }
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: template
      });

    } catch (error) {
      console.error('Template GET error:', error);
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

// PUT /api/v1/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const templateId = params.id;
      const body = await req.json();
      
      // Fetch existing template
      const [existingTemplate] = await db
        .select()
        .from(mappingTemplates)
        .where(eq(mappingTemplates.id, templateId))
        .limit(1);
      
      if (!existingTemplate) {
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
      
      // Check permissions
      if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, existingTemplate.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to update this template'
            }
          },
          { status: 403 }
        );
      }
      
      // Build update data
      const updateData: any = {
        updatedAt: new Date()
      };
      
      // Only update provided fields
      if (body.templateName !== undefined) updateData.templateName = body.templateName;
      if (body.filePattern !== undefined) updateData.filePattern = body.filePattern;
      if (body.columnMappings !== undefined) updateData.columnMappings = body.columnMappings;
      if (body.validationRules !== undefined) updateData.validationRules = body.validationRules;
      if (body.locale !== undefined) updateData.locale = body.locale;
      
      // Handle default flag
      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
        
        // If setting as default, unset other defaults
        if (body.isDefault) {
          // First unset all defaults for this company/statement type
          await db.transaction(async (tx: any) => {
            await tx
              .update(mappingTemplates)
              .set({ isDefault: false })
              .where(eq(mappingTemplates.companyId, existingTemplate.companyId))
              .where(eq(mappingTemplates.statementType, existingTemplate.statementType));
          });
        }
      }
      
      // Update template
      const [updatedTemplate] = await db
        .update(mappingTemplates)
        .set(updateData)
        .where(eq(mappingTemplates.id, templateId))
        .returning();
      
      return NextResponse.json({
        success: true,
        data: updatedTemplate
      });

    } catch (error) {
      console.error('Template PUT error:', error);
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

// DELETE /api/v1/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const templateId = params.id;
      
      // Fetch template to check permissions
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
      
      // Check permissions
      if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, template.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to delete this template'
            }
          },
          { status: 403 }
        );
      }
      
      // Delete template
      await db
        .delete(mappingTemplates)
        .where(eq(mappingTemplates.id, templateId));
      
      return NextResponse.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } catch (error) {
      console.error('Template DELETE error:', error);
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