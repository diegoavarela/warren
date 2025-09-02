import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS, ROLES } from "@/lib/auth/rbac";
import { db, subcategoryTemplates, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user has permission to view organization subcategory templates
    // For organization admins, allow access to their own organization
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view organization subcategory templates" },
        { status: 403 }
      );
    }
    
    // Additional check: ensure user belongs to this organization
    if (user.role === ROLES.ORGANIZATION_ADMIN && user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Access denied: User does not belong to this organization" },
        { status: 403 }
      );
    }

    try {
      const templates = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, organizationId),
            eq(subcategoryTemplates.isActive, true)
          )
        )
        .orderBy(subcategoryTemplates.name);

      return NextResponse.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error("Error fetching organization subcategory templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategory templates" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user has permission to manage organization subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create organization subcategory templates" },
        { status: 403 }
      );
    }
    
    // Additional check: ensure user belongs to this organization
    if (user.role === ROLES.ORGANIZATION_ADMIN && user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Access denied: User does not belong to this organization" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { name, description, isDefault } = body;

      if (!name) {
        return NextResponse.json(
          { error: "Template name is required" },
          { status: 400 }
        );
      }

      // Check if template with same name already exists
      const existing = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, organizationId),
            eq(subcategoryTemplates.name, name)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Template with this name already exists" },
          { status: 409 }
        );
      }

      // If this is being set as default, unset other defaults
      if (isDefault) {
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

      const [newTemplate] = await db
        .insert(subcategoryTemplates)
        .values({
          organizationId,
          name,
          description: description || null,
          isDefault: isDefault || false,
          createdBy: user.id,
          isActive: true
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newTemplate
      });
    } catch (error) {
      console.error("Error creating organization subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to create subcategory template" },
        { status: 500 }
      );
    }
  });
}