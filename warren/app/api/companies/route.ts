import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companies, organizations, users, companyUsers, eq, and } from '@/lib/db';
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
    
    // Check if user can create companies (platform_admin, organization_admin)
    if (payload.role !== ROLES.PLATFORM_ADMIN && payload.role !== ROLES.ORGANIZATION_ADMIN) {
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
    if (payload.role === ROLES.ORGANIZATION_ADMIN && payload.organizationId !== organizationId) {
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

    // Always associate the creator with the company
    let finalAdminUserId = payload.userId; // Default: creator becomes admin
    
    // If adminUserId provided, verify they exist and belong to same organization
    if (adminUserId && adminUserId !== payload.userId) {
      const adminUser = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, adminUserId),
          eq(users.organizationId, organizationId)
        ))
        .limit(1);
      
      if (adminUser.length > 0) {
        finalAdminUserId = adminUserId;
      }
      // If adminUserId invalid, fallback to creator
    }
    
    // Create company association for the admin (creator or specified admin)
    await db
      .insert(companyUsers)
      .values({
        companyId: newCompany.id,
        userId: finalAdminUserId,
        role: 'company_admin',
        isActive: true,
        invitedBy: payload.userId
      });

    // Auto-grant access to all organization admins in the same organization
    
    const orgAdmins = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.role, 'admin')
      ));
    
    for (const admin of orgAdmins) {
      // Skip if this admin is already the creator/specified admin
      if (admin.id === finalAdminUserId) {
        continue;
      }
      
      // Check if admin already has access (shouldn't happen, but safety check)
      const existingAccess = await db
        .select()
        .from(companyUsers)
        .where(and(
          eq(companyUsers.companyId, newCompany.id),
          eq(companyUsers.userId, admin.id)
        ))
        .limit(1);

      if (existingAccess.length === 0) {
        await db
          .insert(companyUsers)
          .values({
            companyId: newCompany.id,
            userId: admin.id,
            role: 'company_admin',
            isActive: true,
            invitedBy: payload.userId
          });
      }
    }

    // Log company creation

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
    
    // Platform admins and organization admins can see all companies in their organization
    if (payload.role === ROLES.PLATFORM_ADMIN || payload.role === ROLES.ORGANIZATION_ADMIN) {
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
      
      // Get companies in the organization (active by default, unless includeInactive=true)
      const { searchParams } = new URL(request.url);
      const includeInactive = searchParams.get('includeInactive') === 'true';
      
      let conditions = [eq(companies.organizationId, user.organizationId)];
      
      // Filter active companies unless includeInactive is requested
      if (!includeInactive) {
        conditions.push(eq(companies.isActive, true));
      }
      
      const query = db
        .select({
          id: companies.id,
          name: companies.name,
          taxId: companies.taxId,
          industry: companies.industry,
          locale: companies.locale,
          baseCurrency: companies.baseCurrency,
          fiscalYearStart: companies.fiscalYearStart,
          isActive: companies.isActive,
          organizationId: companies.organizationId,
          createdAt: companies.createdAt
        })
        .from(companies)
        .where(and(...conditions));
      
      companyList = await query.orderBy(companies.createdAt);
    } else {
      // Regular users only see active companies they have access to
      const { searchParams } = new URL(request.url);
      const includeInactive = searchParams.get('includeInactive') === 'true';
      
      let userQuery = db
        .select({
          company: companies,
          role: companyUsers.role
        })
        .from(companyUsers)
        .innerJoin(companies, eq(companyUsers.companyId, companies.id))
        .where(and(
          eq(companyUsers.userId, payload.userId),
          eq(companyUsers.isActive, true),
          ...(includeInactive ? [] : [eq(companies.isActive, true)])
        ));
      
      const userCompanies = await userQuery;
      
      companyList = userCompanies.map((uc: any) => ({
        ...uc.company,
        userRole: uc.role
      }));
    }

    return NextResponse.json({
      success: true,
      data: companyList
    });

  } catch (error) {
    console.error('Companies list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}