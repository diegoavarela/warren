import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, companySubcategories, organizationSubcategories, companies, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;

    // Check if user has permission to view company subcategories
    if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view company subcategories" },
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

      // Get organization subcategories (inherited)
      const orgSubcategories = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.organizationId, company.organizationId),
            eq(organizationSubcategories.isActive, true)
          )
        );

      // Get company-specific subcategories
      const companySpecificSubcategories = await db
        .select()
        .from(companySubcategories)
        .where(
          and(
            eq(companySubcategories.companyId, companyId),
            eq(companySubcategories.isActive, true)
          )
        );

      // Combine and deduplicate (company overrides take precedence)
      const allSubcategories = companySpecificSubcategories.map((sub: any) => ({
        ...sub,
        source: 'company' as const
      }));
      
      const overriddenValues = new Set(
        companySpecificSubcategories
          .filter((sub: any) => sub.isOverride)
          .map((sub: any) => sub.value)
      );

      // Add organization subcategories that are not overridden
      orgSubcategories.forEach((orgSub: any) => {
        if (!overriddenValues.has(orgSub.value)) {
          allSubcategories.push({
            ...orgSub,
            source: 'organization' as const,
            isOverride: false
          });
        }
      });

      // Sort by label
      allSubcategories.sort((a: any, b: any) => a.label.localeCompare(b.label));

      return NextResponse.json({
        success: true,
        data: allSubcategories
      });
    } catch (error) {
      console.error("Error fetching company subcategories:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategories" },
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

    // Check if user has permission to manage company subcategories
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create company subcategories" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { value, label, mainCategories, organizationSubcategoryId, isOverride, companyTemplateId } = body;

      if (!value || !label) {
        return NextResponse.json(
          { error: "Value and label are required" },
          { status: 400 }
        );
      }

      // Check if subcategory with same value already exists
      const existing = await db
        .select()
        .from(companySubcategories)
        .where(
          and(
            eq(companySubcategories.companyId, companyId),
            eq(companySubcategories.value, value)
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
        .insert(companySubcategories)
        .values({
          companyId,
          companyTemplateId: companyTemplateId || null,
          organizationSubcategoryId: organizationSubcategoryId || null,
          value,
          label,
          mainCategories: mainCategories || null,
          isOverride: isOverride || false,
          createdBy: user.id,
          isActive: true
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newSubcategory
      });
    } catch (error) {
      console.error("Error creating company subcategory:", error);
      return NextResponse.json(
        { error: "Failed to create subcategory" },
        { status: 500 }
      );
    }
  });
}