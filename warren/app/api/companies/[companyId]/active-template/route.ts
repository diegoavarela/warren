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
        { error: "Insufficient permissions to view company templates" },
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

      // First try to get company's default template
      const [companyTemplate] = await db
        .select()
        .from(companySubcategoryTemplates)
        .where(
          and(
            eq(companySubcategoryTemplates.companyId, companyId),
            eq(companySubcategoryTemplates.isDefault, true),
            eq(companySubcategoryTemplates.isActive, true)
          )
        )
        .limit(1);

      if (companyTemplate) {
        return NextResponse.json({
          success: true,
          data: {
            ...companyTemplate,
            source: 'company' as const
          }
        });
      }

      // If no company template, try to get organization's default template
      const [orgTemplate] = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, company.organizationId),
            eq(subcategoryTemplates.isDefault, true),
            eq(subcategoryTemplates.isActive, true)
          )
        )
        .limit(1);

      if (orgTemplate) {
        return NextResponse.json({
          success: true,
          data: {
            ...orgTemplate,
            source: 'organization' as const
          }
        });
      }

      // If no default templates, return the first available template
      const [firstCompanyTemplate] = await db
        .select()
        .from(companySubcategoryTemplates)
        .where(
          and(
            eq(companySubcategoryTemplates.companyId, companyId),
            eq(companySubcategoryTemplates.isActive, true)
          )
        )
        .limit(1);

      if (firstCompanyTemplate) {
        return NextResponse.json({
          success: true,
          data: {
            ...firstCompanyTemplate,
            source: 'company' as const
          }
        });
      }

      const [firstOrgTemplate] = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, company.organizationId),
            eq(subcategoryTemplates.isActive, true)
          )
        )
        .limit(1);

      if (firstOrgTemplate) {
        return NextResponse.json({
          success: true,
          data: {
            ...firstOrgTemplate,
            source: 'organization' as const
          }
        });
      }

      // No templates found
      return NextResponse.json({
        success: true,
        data: null
      });
    } catch (error) {
      console.error("Error fetching active template:", error);
      return NextResponse.json(
        { error: "Failed to fetch active template" },
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

    // Check if user has permission to manage company templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
      return NextResponse.json(
        { error: "Insufficient permissions to set active template" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { templateId, source } = body;

      if (!templateId || !source) {
        return NextResponse.json(
          { error: "Template ID and source are required" },
          { status: 400 }
        );
      }

      // First, unset any existing default templates for this company
      await db
        .update(companySubcategoryTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(companySubcategoryTemplates.companyId, companyId),
            eq(companySubcategoryTemplates.isDefault, true)
          )
        );

      if (source === 'company') {
        // Set the company template as default
        const [updatedTemplate] = await db
          .update(companySubcategoryTemplates)
          .set({ isDefault: true })
          .where(
            and(
              eq(companySubcategoryTemplates.id, templateId),
              eq(companySubcategoryTemplates.companyId, companyId)
            )
          )
          .returning();

        if (!updatedTemplate) {
          return NextResponse.json(
            { error: "Template not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            ...updatedTemplate,
            source: 'company' as const
          }
        });
      } else if (source === 'organization') {
        // Create a company template referencing the organization template
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

        // Get the organization template
        const [orgTemplate] = await db
          .select()
          .from(subcategoryTemplates)
          .where(
            and(
              eq(subcategoryTemplates.id, templateId),
              eq(subcategoryTemplates.organizationId, company.organizationId)
            )
          )
          .limit(1);

        if (!orgTemplate) {
          return NextResponse.json(
            { error: "Organization template not found" },
            { status: 404 }
          );
        }

        // Check if a company template with this name already exists
        const existingCompanyTemplate = await db
          .select()
          .from(companySubcategoryTemplates)
          .where(
            and(
              eq(companySubcategoryTemplates.companyId, companyId),
              eq(companySubcategoryTemplates.name, orgTemplate.name)
            )
          )
          .limit(1);

        let companyTemplate;
        if (existingCompanyTemplate.length > 0) {
          // Update existing template to make it default
          [companyTemplate] = await db
            .update(companySubcategoryTemplates)
            .set({
              templateId,
              description: orgTemplate.description,
              isDefault: true,
              isActive: true,
              updatedAt: new Date()
            })
            .where(eq(companySubcategoryTemplates.id, existingCompanyTemplate[0].id))
            .returning();
        } else {
          // Create new company template
          [companyTemplate] = await db
            .insert(companySubcategoryTemplates)
            .values({
              companyId,
              templateId,
              name: orgTemplate.name,
              description: orgTemplate.description,
              isDefault: true,
              isActive: true,
              createdBy: user.id
            })
            .returning();
        }

        return NextResponse.json({
          success: true,
          data: {
            ...companyTemplate,
            source: 'organization' as const
          }
        });
      }

      return NextResponse.json(
        { error: "Invalid source" },
        { status: 400 }
      );
    } catch (error) {
      console.error("Error setting active template:", error);
      return NextResponse.json(
        { error: "Failed to set active template" },
        { status: 500 }
      );
    }
  });
}