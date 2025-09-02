import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, companySubcategories, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to view company subcategories
    if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view company subcategories" },
        { status: 403 }
      );
    }

    try {
      const [subcategory] = await db
        .select()
        .from(companySubcategories)
        .where(
          and(
            eq(companySubcategories.id, subcategoryId),
            eq(companySubcategories.companyId, companyId)
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
      console.error("Error fetching company subcategory:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategory" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { companyId: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to manage company subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to update company subcategories" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { value, label, mainCategories, isActive, isOverride } = body;

      if (!value || !label) {
        return NextResponse.json(
          { error: "Value and label are required" },
          { status: 400 }
        );
      }

      // Check if subcategory exists
      const [existing] = await db
        .select()
        .from(companySubcategories)
        .where(
          and(
            eq(companySubcategories.id, subcategoryId),
            eq(companySubcategories.companyId, companyId)
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
          .from(companySubcategories)
          .where(
            and(
              eq(companySubcategories.companyId, companyId),
              eq(companySubcategories.value, value)
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
        .update(companySubcategories)
        .set({
          value,
          label,
          mainCategories: mainCategories || null,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          isOverride: isOverride !== undefined ? isOverride : existing.isOverride,
          updatedAt: new Date()
        })
        .where(eq(companySubcategories.id, subcategoryId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedSubcategory
      });
    } catch (error) {
      console.error("Error updating company subcategory:", error);
      return NextResponse.json(
        { error: "Failed to update subcategory" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; subcategoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;
    const subcategoryId = params.subcategoryId;

    // Check if user has permission to manage company subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete company subcategories" },
        { status: 403 }
      );
    }

    try {
      // Check if subcategory exists
      const [existing] = await db
        .select()
        .from(companySubcategories)
        .where(
          and(
            eq(companySubcategories.id, subcategoryId),
            eq(companySubcategories.companyId, companyId)
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
        .update(companySubcategories)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(companySubcategories.id, subcategoryId))
        .returning();

      return NextResponse.json({
        success: true,
        data: deletedSubcategory,
        message: "Subcategory deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting company subcategory:", error);
      return NextResponse.json(
        { error: "Failed to delete subcategory" },
        { status: 500 }
      );
    }
  });
}