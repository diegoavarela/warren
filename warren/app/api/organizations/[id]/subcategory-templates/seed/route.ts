import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, subcategoryTemplates, organizationSubcategories, eq, and } from "@/lib/db";

const DEFAULT_TEMPLATE_NAME = "Default Financial Subcategories";
const DEFAULT_TEMPLATE_DESCRIPTION = "Standard financial subcategories for Excel mapping";

const DEFAULT_SUBCATEGORIES = [
  // Revenue subcategories
  { value: 'sales_revenue', label: 'Sales Revenue', mainCategories: ['revenue'] },
  { value: 'service_revenue', label: 'Service Revenue', mainCategories: ['revenue'] },
  { value: 'subscription_revenue', label: 'Subscription Revenue', mainCategories: ['revenue'] },
  { value: 'consulting_revenue', label: 'Consulting Revenue', mainCategories: ['revenue'] },
  { value: 'licensing_revenue', label: 'Licensing Revenue', mainCategories: ['revenue'] },
  { value: 'other_revenue', label: 'Other Revenue', mainCategories: ['revenue'] },
  
  // Cost of Goods Sold subcategories
  { value: 'direct_materials', label: 'Direct Materials', mainCategories: ['cost_of_goods_sold'] },
  { value: 'direct_labor', label: 'Direct Labor', mainCategories: ['cost_of_goods_sold'] },
  { value: 'manufacturing_overhead', label: 'Manufacturing Overhead', mainCategories: ['cost_of_goods_sold'] },
  { value: 'inventory_adjustments', label: 'Inventory Adjustments', mainCategories: ['cost_of_goods_sold'] },
  { value: 'shipping_costs', label: 'Shipping Costs', mainCategories: ['cost_of_goods_sold'] },
  { value: 'third_party_services', label: 'Third Party Services', mainCategories: ['cost_of_goods_sold'] },
  
  // Operating Expenses subcategories
  { value: 'rent_utilities', label: 'Rent & Utilities', mainCategories: ['operating_expenses'] },
  { value: 'marketing_advertising', label: 'Marketing & Advertising', mainCategories: ['operating_expenses'] },
  { value: 'professional_services', label: 'Professional Services', mainCategories: ['operating_expenses'] },
  { value: 'insurance', label: 'Insurance', mainCategories: ['operating_expenses'] },
  { value: 'travel_entertainment', label: 'Travel & Entertainment', mainCategories: ['operating_expenses'] },
  { value: 'office_supplies', label: 'Office Supplies', mainCategories: ['operating_expenses'] },
  { value: 'maintenance_repairs', label: 'Maintenance & Repairs', mainCategories: ['operating_expenses'] },
  { value: 'technology_software', label: 'Technology & Software', mainCategories: ['operating_expenses'] },
  { value: 'communications', label: 'Communications', mainCategories: ['operating_expenses'] },
  { value: 'research_development', label: 'Research & Development', mainCategories: ['operating_expenses'] },
  
  // Personnel Costs subcategories
  { value: 'salaries_wages', label: 'Salaries & Wages', mainCategories: ['personnel_costs'] },
  { value: 'benefits', label: 'Benefits', mainCategories: ['personnel_costs'] },
  { value: 'payroll_taxes', label: 'Payroll Taxes', mainCategories: ['personnel_costs'] },
  { value: 'bonuses_commissions', label: 'Bonuses & Commissions', mainCategories: ['personnel_costs'] },
  { value: 'training_development', label: 'Training & Development', mainCategories: ['personnel_costs'] },
  { value: 'recruitment_costs', label: 'Recruitment Costs', mainCategories: ['personnel_costs'] },
  { value: 'contractor_fees', label: 'Contractor Fees', mainCategories: ['personnel_costs'] },
  
  // Financial Income subcategories
  { value: 'interest_income', label: 'Interest Income', mainCategories: ['financial_income'] },
  { value: 'investment_income', label: 'Investment Income', mainCategories: ['financial_income'] },
  { value: 'dividend_income', label: 'Dividend Income', mainCategories: ['financial_income'] },
  { value: 'foreign_exchange_gains', label: 'Foreign Exchange Gains', mainCategories: ['financial_income'] },
  { value: 'other_financial_income', label: 'Other Financial Income', mainCategories: ['financial_income'] },
  
  // Financial Expenses subcategories
  { value: 'interest_expense', label: 'Interest Expense', mainCategories: ['financial_expenses'] },
  { value: 'bank_fees', label: 'Bank Fees', mainCategories: ['financial_expenses'] },
  { value: 'loan_fees', label: 'Loan Fees', mainCategories: ['financial_expenses'] },
  { value: 'foreign_exchange_losses', label: 'Foreign Exchange Losses', mainCategories: ['financial_expenses'] },
  { value: 'investment_losses', label: 'Investment Losses', mainCategories: ['financial_expenses'] },
  { value: 'other_financial_expenses', label: 'Other Financial Expenses', mainCategories: ['financial_expenses'] },
  
  // Taxes subcategories
  { value: 'income_tax', label: 'Income Tax', mainCategories: ['taxes'] },
  { value: 'vat_sales_tax', label: 'VAT / Sales Tax', mainCategories: ['taxes'] },
  { value: 'property_taxes', label: 'Property Taxes', mainCategories: ['taxes'] },
  { value: 'payroll_taxes_employer', label: 'Payroll Taxes (Employer)', mainCategories: ['taxes'] },
  { value: 'franchise_taxes', label: 'Franchise Taxes', mainCategories: ['taxes'] },
  { value: 'other_taxes', label: 'Other Taxes', mainCategories: ['taxes'] },
  
  // Extraordinary Items subcategories
  { value: 'asset_disposal_gains', label: 'Asset Disposal Gains', mainCategories: ['extraordinary_items'] },
  { value: 'asset_disposal_losses', label: 'Asset Disposal Losses', mainCategories: ['extraordinary_items'] },
  { value: 'restructuring_costs', label: 'Restructuring Costs', mainCategories: ['extraordinary_items'] },
  { value: 'legal_settlements', label: 'Legal Settlements', mainCategories: ['extraordinary_items'] },
  { value: 'impairment_charges', label: 'Impairment Charges', mainCategories: ['extraordinary_items'] },
  { value: 'one_time_charges', label: 'One-time Charges', mainCategories: ['extraordinary_items'] },
  { value: 'other_extraordinary', label: 'Other Extraordinary Items', mainCategories: ['extraordinary_items'] }
];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user has permission to manage organization subcategory templates
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: "Insufficient permissions to seed organization subcategory templates" },
        { status: 403 }
      );
    }

    try {
      // Check if default template already exists
      const existingTemplate = await db
        .select()
        .from(subcategoryTemplates)
        .where(
          and(
            eq(subcategoryTemplates.organizationId, organizationId),
            eq(subcategoryTemplates.name, DEFAULT_TEMPLATE_NAME)
          )
        )
        .limit(1);

      let templateId: string;

      if (existingTemplate.length === 0) {
        // Create default template
        const [newTemplate] = await db
          .insert(subcategoryTemplates)
          .values({
            organizationId,
            name: DEFAULT_TEMPLATE_NAME,
            description: DEFAULT_TEMPLATE_DESCRIPTION,
            isDefault: true,
            createdBy: user.id,
            isActive: true
          })
          .returning();

        templateId = newTemplate.id;
      } else {
        templateId = existingTemplate[0].id;
      }

      // Check if subcategories already exist for this template
      const existingSubcategories = await db
        .select()
        .from(organizationSubcategories)
        .where(
          and(
            eq(organizationSubcategories.organizationId, organizationId),
            eq(organizationSubcategories.templateId, templateId)
          )
        );

      if (existingSubcategories.length === 0) {
        // Insert default subcategories
        const subcategoriesToInsert = DEFAULT_SUBCATEGORIES.map(sub => ({
          organizationId,
          templateId,
          value: sub.value,
          label: sub.label,
          mainCategories: sub.mainCategories,
          createdBy: user.id,
          isActive: true
        }));

        await db
          .insert(organizationSubcategories)
          .values(subcategoriesToInsert);
      }

      return NextResponse.json({
        success: true,
        message: "Default subcategory template seeded successfully",
        data: {
          templateId,
          subcategoriesCount: DEFAULT_SUBCATEGORIES.length,
          created: existingTemplate.length === 0
        }
      });
    } catch (error) {
      console.error("Error seeding default subcategory template:", error);
      return NextResponse.json(
        { error: "Failed to seed default subcategory template" },
        { status: 500 }
      );
    }
  });
}