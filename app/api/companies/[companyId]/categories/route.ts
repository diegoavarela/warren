import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customFinancialCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { createCustomCategory, validateCustomCategory } from "@/lib/custom-categories";

// GET /api/companies/[companyId]/categories - Get custom categories for a company
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const { companyId } = params;

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    try {
      console.log(`[GET] Fetching custom categories for company: ${companyId}`);
      
      // Fetch custom categories for the company (only active ones)
      const customCategories = await db
        .select()
        .from(customFinancialCategories)
        .where(
          and(
            eq(customFinancialCategories.companyId, companyId),
            eq(customFinancialCategories.isActive, true)
          )
        );

      console.log(`[GET] Found ${customCategories.length} active custom categories`);

      return NextResponse.json({
        success: true,
        data: customCategories
      });
    } catch (error) {
      console.error("Error fetching custom categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch custom categories" },
        { status: 500 }
      );
    }
  });
}

// POST /api/companies/[companyId]/categories - Create a new custom category
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const { companyId } = params;

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.EDIT_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const {
        categoryKey,
        label,
        isInflow,
        statementType,
        categoryType,
        description,
        parentCategory,
        sortOrder
      } = body;

      // Validate required fields
      if (!categoryKey || !label || isInflow === undefined || !statementType) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Check if category already exists
      const existing = await db
        .select()
        .from(customFinancialCategories)
        .where(
          and(
            eq(customFinancialCategories.companyId, companyId),
            eq(customFinancialCategories.categoryKey, categoryKey)
          )
        );

      if (existing.length > 0) {
        // Update existing category instead of creating duplicate
        const [updated] = await db
          .update(customFinancialCategories)
          .set({
            label,
            isInflow,
            statementType,
            categoryType: categoryType || 'account',
            description,
            parentCategory,
            sortOrder,
            isActive: true,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(customFinancialCategories.companyId, companyId),
              eq(customFinancialCategories.categoryKey, categoryKey)
            )
          )
          .returning();

        return NextResponse.json({
          success: true,
          data: updated,
          message: "Category updated successfully"
        });
      }

      // Create new category
      console.log(`[POST] Creating new category:`, { companyId, categoryKey, label });
      
      const newCategory = createCustomCategory(companyId, {
        categoryKey,
        label,
        isInflow,
        statementType,
        categoryType: categoryType || 'account',
        description,
        parentCategory,
        sortOrder
      });

      const [created] = await db
        .insert(customFinancialCategories)
        .values(newCategory)
        .returning();

      console.log(`[POST] Successfully created category:`, created.id, created.label);

      return NextResponse.json({
        success: true,
        data: created,
        message: "Category created successfully"
      });
    } catch (error) {
      console.error("Error creating custom category:", error);
      return NextResponse.json(
        { error: "Failed to create custom category" },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/companies/[companyId]/categories/[categoryId] - Soft delete a custom category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; categoryId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const { companyId, categoryId } = params;

    // Check permissions
    if (!hasPermission(user, PERMISSIONS.EDIT_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    try {
      // Soft delete by setting isActive to false
      const [deleted] = await db
        .update(customFinancialCategories)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(customFinancialCategories.id, categoryId),
            eq(customFinancialCategories.companyId, companyId)
          )
        )
        .returning();

      if (!deleted) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: deleted,
        message: "Category deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting custom category:", error);
      return NextResponse.json(
        { error: "Failed to delete custom category" },
        { status: 500 }
      );
    }
  });
}