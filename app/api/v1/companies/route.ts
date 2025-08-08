import { NextRequest, NextResponse } from "next/server";
import { db, companies, organizations, companyUsers, eq, and } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS, getAccessibleCompanies } from "@/lib/auth/rbac";

// GET /api/v1/companies - List companies accessible to user
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      // Get companies accessible to this user based on RBAC
      const accessibleCompanyIds = getAccessibleCompanies(user);
      console.log('User:', user.email, 'Role:', user.role, 'Accessible companies:', accessibleCompanyIds);
      
      let companyList;
      
      if (accessibleCompanyIds.includes('*')) {
        // Super admin can see ALL companies, org admin can see companies in their organization
        console.log(`🔍 Fetching companies for admin user ${user.email} (role: ${user.role}, org: ${user.organizationId})`);
        
        if (user.role === 'super_admin') {
          // Platform admin sees ALL companies across ALL organizations
          companyList = await db
            .select()
            .from(companies)
            .where(eq(companies.isActive, true))
            .orderBy(companies.organizationId, companies.name);
        } else {
          // Org admin sees only companies in their organization
          companyList = await db
            .select()
            .from(companies)
            .where(and(
              eq(companies.organizationId, user.organizationId),
              eq(companies.isActive, true)
            ));
        }
        
        console.log(`📊 Admin query result: Found ${companyList.length} companies`);
        console.log('Companies found:', companyList.map((c: any) => ({
          id: c.id,
          name: c.name,
          organizationId: c.organizationId,
          matchesUserOrg: c.organizationId === user.organizationId
        })));
      } else {
        // Regular user - only see companies they have explicit access to
        if (accessibleCompanyIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            meta: { total: 0 }
          });
        }

        // Join with company_users to get only accessible companies
        companyList = await db
          .select({
            id: companies.id,
            organizationId: companies.organizationId,
            name: companies.name,
            taxId: companies.taxId,
            industry: companies.industry,
            locale: companies.locale,
            baseCurrency: companies.baseCurrency,
            fiscalYearStart: companies.fiscalYearStart,
            isActive: companies.isActive,
            createdAt: companies.createdAt,
            updatedAt: companies.updatedAt
          })
          .from(companies)
          .innerJoin(companyUsers, eq(companies.id, companyUsers.companyId))
          .where(eq(companyUsers.userId, user.id))
          .where(eq(companyUsers.isActive, true))
          .where(eq(companies.isActive, true));
      }

      console.log(`Companies API: Found ${companyList.length} companies for user ${user.email}`);

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
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { name, taxId, industry, locale, baseCurrency, displayUnits, fiscalYearStart } = body;

      // Check if user has permission to create companies
      if (!hasPermission(user, PERMISSIONS.CREATE_COMPANY)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to create companies',
              required: PERMISSIONS.CREATE_COMPANY
            }
          },
          { status: 403 }
        );
      }

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

      // Create company and automatically add creator as company admin
      console.log('Creating company with data:', {
        organizationId: user.organizationId,
        name,
        taxId,
        industry,
        locale: locale || organization[0].locale,
        baseCurrency: baseCurrency || organization[0].baseCurrency,
        displayUnits: displayUnits || 'units',
        fiscalYearStart: parseInt(fiscalYearStart) || parseInt(organization[0].fiscalYearStart) || 1
      });

      // Create the company first (no transaction support in neon-http)
      const [newCompany] = await db.insert(companies).values({
        organizationId: user.organizationId,
        name,
        taxId,
        industry,
        locale: locale || organization[0].locale,
        baseCurrency: baseCurrency || organization[0].baseCurrency,
        displayUnits: displayUnits || 'units',
        fiscalYearStart: parseInt(fiscalYearStart) || parseInt(organization[0].fiscalYearStart) || 1
      }).returning();

      console.log('Created company:', newCompany);

      // Automatically add the creator as company admin
      await db.insert(companyUsers).values({
        companyId: newCompany.id,
        userId: user.id,
        role: 'company_admin',
        isActive: true,
        invitedBy: null // self-invited as creator
      });

      const result = newCompany;

      return NextResponse.json({
        success: true,
        data: result
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