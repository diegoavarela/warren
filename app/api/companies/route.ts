import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companies, organizations, users, companyUsers, eq } from '@/lib/db';
import { ROLES, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify JWT and check permissions
    const payload = await verifyJWT(token);
    
    // Check if user can create companies (super_admin, org_admin)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only platform and organization admins can create companies.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      organizationId,
      name,
      taxId,
      industry,
      locale = 'en-US',
      baseCurrency = 'USD',
      fiscalYearStart = 1,
      contactEmail,
      contactPhone,
      address,
      website,
      adminUserId // Optional: assign an existing user as company admin
    } = body;

    // Validate required fields
    if (!organizationId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, name' },
        { status: 400 }
      );
    }

    // Verify organization exists and user has access
    const orgQuery = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (orgQuery.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organization = orgQuery[0];

    // Check if user has access to this organization
    if (payload.role === ROLES.ORG_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'You can only create companies within your organization' },
        { status: 403 }
      );
    }

    // Create company
    const [newCompany] = await db
      .insert(companies)
      .values({
        organizationId,
        name,
        taxId,
        industry,
        locale,
        baseCurrency,
        fiscalYearStart,
        isActive: true
      })
      .returning();

    // If adminUserId provided, assign them as company admin
    if (adminUserId) {
      // Verify the user exists and belongs to the same organization
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.id, adminUserId))
        .where(eq(users.organizationId, organizationId))
        .limit(1);
      
      if (adminUser.length > 0) {
        await db
          .insert(companyUsers)
          .values({
            companyId: newCompany.id,
            userId: adminUserId,
            role: 'company_admin',
            isActive: true,
            invitedBy: payload.userId
          });
      }
    }

    // Log company creation
    console.log(`✅ Company created: ${name} in organization ${organization.name} by ${payload.email}`);

    return NextResponse.json({
      success: true,
      company: {
        id: newCompany.id,
        organizationId: newCompany.organizationId,
        name: newCompany.name,
        taxId: newCompany.taxId,
        industry: newCompany.industry,
        locale: newCompany.locale,
        baseCurrency: newCompany.baseCurrency,
        fiscalYearStart: newCompany.fiscalYearStart,
        createdAt: newCompany.createdAt
      }
    });

  } catch (error) {
    console.error('Company creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify JWT
    const payload = await verifyJWT(token);
    
    let companyList;
    
    // Super admins and org admins can see all companies in their organization
    if (payload.role === ROLES.SUPER_ADMIN || payload.role === ROLES.ORG_ADMIN || payload.role === 'admin') {
      // Get user's organization
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      
      if (userResult.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      const user = userResult[0];
      
      // Get all companies in the organization
      companyList = await db
        .select({
          id: companies.id,
          name: companies.name,
          taxId: companies.taxId,
          industry: companies.industry,
          locale: companies.locale,
          baseCurrency: companies.baseCurrency,
          fiscalYearStart: companies.fiscalYearStart,
          isActive: companies.isActive,
          createdAt: companies.createdAt
        })
        .from(companies)
        .where(eq(companies.organizationId, user.organizationId))
        .orderBy(companies.createdAt);
    } else {
      // Regular users only see companies they have access to
      const userCompanies = await db
        .select({
          company: companies,
          role: companyUsers.role
        })
        .from(companyUsers)
        .innerJoin(companies, eq(companyUsers.companyId, companies.id))
        .where(eq(companyUsers.userId, payload.userId))
        .where(eq(companyUsers.isActive, true));
      
      companyList = userCompanies.map((uc: any) => ({
        ...uc.company,
        userRole: uc.role
      }));
    }

    return NextResponse.json({
      success: true,
      companies: companyList
    });

  } catch (error) {
    console.error('Companies list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}