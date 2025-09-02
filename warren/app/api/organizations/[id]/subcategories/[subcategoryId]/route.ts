import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, organizationSubcategories, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to view organization subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view organization subcategories" },
        { status: 403 }
      );
    }

    try {
      const [subcategory] = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.id, subcategoryId),
            eq(organizationSubcategories.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!subcategory) {
        return NextResponse.json(
          { error: "Subcategory not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: subcategory
      });
    } catch (error) {
      console.error("Error fetching organization subcategory:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategory" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to manage organization subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to update organization subcategories" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { value, label, mainCategories, isActive } = body;

      if (!value || !label) {
        return NextResponse.json(
          { error: "Value and label are required" },
          { status: 400 }
        );
      }

      // Check if subcategory exists
      const [existing] = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.id, subcategoryId),
            eq(organizationSubcategories.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Subcategory not found" },
          { status: 404 }
        );
      }

      // Check if new value conflicts with existing subcategory (excluding current one)
      if (value !== existing.value) {
        const conflicting = await db
          .select()
          .from(organizationSubcategories)
          .where(
            and(
              eq(organizationSubcategories.organizationId, organizationId),
              eq(organizationSubcategories.value, value),
              // Exclude current subcategory from conflict check
              // Note: Using != instead of NOT eq() for simplicity
            )
          )
          .limit(1);

        if (conflicting.length > 0 && conflicting[0].id !== subcategoryId) {
          return NextResponse.json(
            { error: "Subcategory with this value already exists" },
            { status: 409 }
          );
        }
      }

      const [updatedSubcategory] = await db
        .update(organizationSubcategories)
        .set({
          value,
          label,
          mainCategories: mainCategories || null,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          updatedAt: new Date()
        })
        .where(eq(organizationSubcategories.id, subcategoryId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedSubcategory
      });
    } catch (error) {
      console.error("Error updating organization subcategory:", error);
      return NextResponse.json(
        { error: "Failed to update subcategory" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to manage organization subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete organization subcategories" },
        { status: 403 }
      );
    }

    try {
      // Check if subcategory exists
      const [existing] = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.id, subcategoryId),
            eq(organizationSubcategories.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Subcategory not found" },
          { status: 404 }
        );
      }

      // Soft delete by setting isActive to false
      const [deletedSubcategory] = await db
        .update(organizationSubcategories)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(organizationSubcategories.id, subcategoryId))
        .returning();

      return NextResponse.json({
        success: true,
        data: deletedSubcategory,
        message: "Subcategory deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting organization subcategory:", error);
      return NextResponse.json(
        { error: "Failed to delete subcategory" },
        { status: 500 }
      );
    }
  });
}