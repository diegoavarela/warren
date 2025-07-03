import { NextRequest, NextResponse } from "next/server";
import { db, companies, organizations, eq } from "@/lib/db";
import { withAuth } from "@/lib/auth/middleware";

// GET /api/v1/companies - List companies for organization
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const companyList = await db
        .select()
        .from(companies)
        .where(eq(companies.organizationId, user.organizationId))
        .where(eq(companies.isActive, true));

      return NextResponse.json({
        success: true,
        data: companyList,
        meta: {
          total: companyList.length
        }
      });

    } catch (error) {
      console.error('Companies GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
          }
        },
        { status: 500 }
      );
    }
  });
}

// POST /api/v1/companies - Create new company
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { name, taxId, industry, locale, baseCurrency, fiscalYearStart } = body;

      if (!name) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Company name is required'
            }
          },
          { status: 400 }
        );
      }

      // Check organization exists and is active
      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .where(eq(organizations.isActive, true))
        .limit(1);

      if (organization.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'ORGANIZATION_NOT_FOUND',
              message: 'Organization not found or inactive'
            }
          },
          { status: 404 }
        );
      }

      // Create company
      const [newCompany] = await db.insert(companies).values({
        organizationId: user.organizationId,
        name,
        taxId,
        industry,
        locale: locale || organization[0].locale,
        baseCurrency: baseCurrency || organization[0].baseCurrency,
        fiscalYearStart: fiscalYearStart || organization[0].fiscalYearStart
      }).returning();

      return NextResponse.json({
        success: true,
        data: newCompany
      }, { status: 201 });

    } catch (error) {
      console.error('Companies POST error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error'
          }
        },
        { status: 500 }
      );
    }
  });
}