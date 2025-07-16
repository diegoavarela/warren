import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, companySubcategoryTemplates, subcategoryTemplates, companies, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;

    // Check if user has permission to view company subcategory templates
    if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view company subcategory templates" },
        { status: 403 }
      );
    }

    try {
      // Get company to find organization
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }

      // Get organization templates (inherited)
      const orgTemplates = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, company.organizationId),
            eq(subcategoryTemplates.isActive, true)
          )
        )
        .orderBy(subcategoryTemplates.name);

      // Get company-specific templates
      const companyTemplates = await db
        .select()
        .from(companySubcategoryTemplates)
        .where(
          and(
            eq(companySubcategoryTemplates.companyId, companyId),
            eq(companySubcategoryTemplates.isActive, true)
          )
        )
        .orderBy(companySubcategoryTemplates.name);

      // Combine templates
      const allTemplates = [
        ...orgTemplates.map((template: any) => ({
          ...template,
          source: 'organization' as const
        })),
        ...companyTemplates.map((template: any) => ({
          ...template,
          source: 'company' as const
        }))
      ];

      return NextResponse.json({
        success: true,
        data: allTemplates
      });
    } catch (error) {
      console.error("Error fetching company subcategory templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategory templates" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;

    // Check if user has permission to manage company subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create company subcategory templates" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { name, description, templateId, isDefault } = body;

      if (!name) {
        return NextResponse.json(
          { error: "Template name is required" },
          { status: 400 }
        );
      }

      // Check if template with same name already exists
      const existing = await db
        .select()
        .from(companySubcategoryTemplates)
        .where(
          and(
            eq(companySubcategoryTemplates.companyId, companyId),
            eq(companySubcategoryTemplates.name, name)
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
          .update(companySubcategoryTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(companySubcategoryTemplates.companyId, companyId),
              eq(companySubcategoryTemplates.isDefault, true)
            )
          );
      }

      const [newTemplate] = await db
        .insert(companySubcategoryTemplates)
        .values({
          companyId,
          templateId: templateId || null,
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
      console.error("Error creating company subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to create subcategory template" },
        { status: 500 }
      );
    }
  });
}