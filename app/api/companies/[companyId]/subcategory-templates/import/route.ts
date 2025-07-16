import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { 
  db, 
  subcategoryTemplates, 
  organizationSubcategories, 
  companySubcategoryTemplates,
  companySubcategories,
  eq, 
  and 
} from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  return withRBAC(request, async (req, user) => {
    const companyId = params.companyId;

    // Check if user has permission to manage company subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_COMPANY)) {
      return NextResponse.json(
        { error: "Insufficient permissions to import subcategory templates" },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { organizationTemplateId } = body;

      if (!organizationTemplateId) {
        return NextResponse.json(
          { error: "Organization template ID is required" },
          { status: 400 }
        );
      }

      // Get the organization template
      const [orgTemplate] = await db
        .select()
        .from(subcategoryTemplates)
        .where(eq(subcategoryTemplates.id, organizationTemplateId))
        .limit(1);

      if (!orgTemplate) {
        return NextResponse.json(
          { error: "Organization template not found" },
          { status: 404 }
        );
      }

      // Generate unique name if template with same name already exists in company
      let templateName = orgTemplate.name;
      let counter = 1;
      
      while (true) {
        const existingTemplate = await db
          .select()
          .from(companySubcategoryTemplates)
          .where(
            and(
              eq(companySubcategoryTemplates.companyId, companyId),
              eq(companySubcategoryTemplates.name, templateName)
            )
          )
          .limit(1);

        if (existingTemplate.length === 0) {
          break; // Name is unique, we can use it
        }

        // Generate new name with counter
        templateName = `${orgTemplate.name} (Copy ${counter})`;
        counter++;
      }

      // Create the company template
      const [companyTemplate] = await db
        .insert(companySubcategoryTemplates)
        .values({
          companyId,
          templateId: organizationTemplateId,
          name: templateName,
          description: orgTemplate.description,
          isActive: true,
          isDefault: false,
          createdBy: user.id,
        })
        .returning();

      // Get all subcategories from the organization template
      const orgSubcategories = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.templateId, organizationTemplateId),
            eq(organizationSubcategories.isActive, true)
          )
        );

      // Import subcategories to company
      if (orgSubcategories.length > 0) {
        const companySubcategoriesToInsert = orgSubcategories.map((sub: any) => ({
          companyId,
          companyTemplateId: companyTemplate.id,
          organizationSubcategoryId: sub.id,
          value: sub.value,
          label: sub.label,
          mainCategories: sub.mainCategories,
          isActive: true,
          isOverride: false,
          createdBy: user.id,
        }));

        await db
          .insert(companySubcategories)
          .values(companySubcategoriesToInsert);
      }

      return NextResponse.json({
        success: true,
        message: "Template imported successfully",
        data: {
          templateId: companyTemplate.id,
          subcategoriesCount: orgSubcategories.length,
        }
      });
    } catch (error) {
      console.error("Error importing organization template:", error);
      return NextResponse.json(
        { error: "Failed to import template" },
        { status: 500 }
      );
    }
  });
}