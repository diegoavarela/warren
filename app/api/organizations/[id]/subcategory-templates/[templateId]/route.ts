import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, subcategoryTemplates, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const templateId = params.templateId;

    // Check if user has permission to view organization subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view organization subcategory templates" },
        { status: 403 }
      );
    }

    try {
      const [template] = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.id, templateId),
            eq(subcategoryTemplates.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error("Error fetching organization subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategory template" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const templateId = params.templateId;

    // Check if user has permission to manage organization subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to update organization subcategory templates" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { name, description, isDefault, isActive } = body;

      if (!name) {
        return NextResponse.json(
          { error: "Template name is required" },
          { status: 400 }
        );
      }

      // Check if template exists
      const [existing] = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.id, templateId),
            eq(subcategoryTemplates.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      // Check if new name conflicts with existing template (excluding current one)
      if (name !== existing.name) {
        const conflicting = await db
          .select()
          .from(subcategoryTemplates)
          .where(
            and(
              eq(subcategoryTemplates.organizationId, organizationId),
              eq(subcategoryTemplates.name, name)
            )
          )
          .limit(1);

        if (conflicting.length > 0 && conflicting[0].id !== templateId) {
          return NextResponse.json(
            { error: "Template with this name already exists" },
            { status: 409 }
          );
        }
      }

      // If this is being set as default, unset other defaults
      if (isDefault && !existing.isDefault) {
        await db
          .update(subcategoryTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(subcategoryTemplates.organizationId, organizationId),
              eq(subcategoryTemplates.isDefault, true)
            )
          );
      }

      const [updatedTemplate] = await db
        .update(subcategoryTemplates)
        .set({
          name,
          description: description || null,
          isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          updatedAt: new Date()
        })
        .where(eq(subcategoryTemplates.id, templateId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedTemplate
      });
    } catch (error) {
      console.error("Error updating organization subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to update subcategory template" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const templateId = params.templateId;

    // Check if user has permission to manage organization subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete organization subcategory templates" },
        { status: 403 }
      );
    }

    try {
      // Check if template exists
      const [existing] = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.id, templateId),
            eq(subcategoryTemplates.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      // Soft delete by setting isActive to false
      const [deletedTemplate] = await db
        .update(subcategoryTemplates)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(subcategoryTemplates.id, templateId))
        .returning();

      return NextResponse.json({
        success: true,
        data: deletedTemplate,
        message: "Template deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting organization subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to delete subcategory template" },
        { status: 500 }
      );
    }
  });
}