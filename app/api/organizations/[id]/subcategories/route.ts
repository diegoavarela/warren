import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, organizationSubcategories, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user has permission to view organization subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION, organizationId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view organization subcategories" },
        { status: 403 }
      );
    }

    try {
      const subcategories = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.organizationId, organizationId),
            eq(organizationSubcategories.isActive, true)
          )
        )
        .orderBy(organizationSubcategories.label);

      return NextResponse.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      console.error("Error fetching organization subcategories:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategories" },
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

    // Check if user has permission to manage organization subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION, organizationId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create organization subcategories" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { value, label, mainCategories } = body;

      if (!value || !label) {
        return NextResponse.json(
          { error: "Value and label are required" },
          { status: 400 }
        );
      }

      // Check if subcategory with same value already exists
      const existing = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.organizationId, organizationId),
            eq(organizationSubcategories.value, value)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Subcategory with this value already exists" },
          { status: 409 }
        );
      }

      const [newSubcategory] = await db
        .insert(organizationSubcategories)
        .values({
          organizationId,
          value,
          label,
          mainCategories: mainCategories || null,
          createdBy: user.id,
          isActive: true
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newSubcategory
      });
    } catch (error) {
      console.error("Error creating organization subcategory:", error);
      return NextResponse.json(
        { error: "Failed to create subcategory" },
        { status: 500 }
      );
    }
  });
}