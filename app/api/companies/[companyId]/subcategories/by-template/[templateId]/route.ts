import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, companySubcategories, organizationSubcategories, companySubcategoryTemplates, companies, eq, and } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; templateId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;
    const templateId = params.templateId;

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

      // Get the template to determine if it's organization or company level
      const [companyTemplate] = await db
        .select()
        .from(companySubcategoryTemplates)
        .where(
          and(
            eq(companySubcategoryTemplates.id, templateId),
            eq(companySubcategoryTemplates.companyId, companyId)
          )
        )
        .limit(1);

      let subcategories: any[] = [];

      if (companyTemplate) {
        // Get subcategories from company template
        const companySubcats = await db
          .select()
          .from(companySubcategories)
          .where(
            and(
              eq(companySubcategories.companyId, companyId),
              eq(companySubcategories.companyTemplateId, templateId),
              eq(companySubcategories.isActive, true)
            )
          );

        subcategories = companySubcats.map((sub: any) => ({
          ...sub,
          source: 'company' as const
        }));

        // If this company template is based on an organization template, also get those subcategories
        if (companyTemplate.templateId) {
          const orgSubcats = await db
            .select()
            .from(organizationSubcategories)
            .where(
              and(
                eq(organizationSubcategories.templateId, companyTemplate.templateId),
                eq(organizationSubcategories.isActive, true)
              )
            );

          // Add organization subcategories that are not overridden by company
          const overriddenValues = new Set(
            companySubcats
              .filter((sub: any) => sub.isOverride)
              .map((sub: any) => sub.value)
          );

          orgSubcats.forEach((orgSub: any) => {
            if (!overriddenValues.has(orgSub.value)) {
              subcategories.push({
                ...orgSub,
                source: 'organization' as const,
                isOverride: false
              });
            }
          });
        }
      } else {
        // Check if it's an organization template
        const orgSubcats = await db
          .select()
          .from(organizationSubcategories)
          .where(
            and(
              eq(organizationSubcategories.templateId, templateId),
              eq(organizationSubcategories.organizationId, company.organizationId),
              eq(organizationSubcategories.isActive, true)
            )
          );

        subcategories = orgSubcats.map((sub: any) => ({
          ...sub,
          source: 'organization' as const
        }));
      }

      // Sort by label
      subcategories.sort((a: any, b: any) => a.label.localeCompare(b.label));

      return NextResponse.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      console.error("Error fetching subcategories by template:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcategories" },
        { status: 500 }
      );
    }
  });
}