import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, companyUsers, companies, eq, and } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';
import { hashPassword, generateSecurePassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Only org admins and super admins can view organization users
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can view organization users.' },
        { status: 403 }
      );
    }

    const { id: organizationId } = params;

    // Verify the requesting user belongs to this organization (except super admins)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied. You can only view users from your own organization.' },
        { status: 403 }
      );
    }

    // Get all users in the organization
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(users.createdAt);

    // For each user, get their company access
    const usersWithCompanyAccess = await Promise.all(
      orgUsers.map(async (user: any) => {
        const companyAccessList = await db
          .select({
            companyId: companyUsers.companyId,
            role: companyUsers.role,
            isActive: companyUsers.isActive,
            companyName: companies.name
          })
          .from(companyUsers)
          .innerJoin(companies, eq(companyUsers.companyId, companies.id))
          .where(and(
            eq(companyUsers.userId, user.id),
            eq(companyUsers.isActive, true)
          ));

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationRole: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          companyAccess: companyAccessList.map((ca: any) => ({
            companyId: ca.companyId,
            companyName: ca.companyName,
            role: ca.role,
            isActive: ca.isActive
          }))
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithCompanyAccess
    });

  } catch (error) {
    console.error('Organization users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization users' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Only org admins and super admins can invite users to organizations
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can invite users.' },
        { status: 403 }
      );
    }

    const { id: organizationId } = params;

    // Verify the requesting user belongs to this organization (except super admins)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied. You can only invite users to your own organization.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, firstName, lastName, organizationRole = 'user', companyAccess = [] } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, firstName, and lastName are required' },
        { status: 400 }
      );
    }

    // Validate organization role
    const validOrgRoles = ['user', 'admin'];
    if (!validOrgRoles.includes(organizationRole)) {
      return NextResponse.json(
        { error: 'Invalid organization role. Must be one of: user, admin' },
        { status: 400 }
      );
    }

    // Validate company roles if provided
    const validCompanyRoles = ['company_admin', 'user', 'viewer'];
    for (const access of companyAccess) {
      if (!validCompanyRoles.includes(access.role)) {
        return NextResponse.json(
          { error: `Invalid company role: ${access.role}. Must be one of: company_admin, user, viewer` },
          { status: 400 }
        );
      }
    }

    // Check if user already exists with this email
    const existingUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let targetUser;

    if (existingUserResult.length > 0) {
      targetUser = existingUserResult[0];
      
      // If user exists but in different organization, don't allow
      if (targetUser.organizationId !== organizationId) {
        return NextResponse.json(
          { error: 'User already exists in a different organization' },
          { status: 400 }
        );
      }
      
      // Update existing user's role if needed
      if (targetUser.role !== organizationRole) {
        await db
          .update(users)
          .set({
            role: organizationRole,
            updatedAt: new Date()
          })
          .where(eq(users.id, targetUser.id));
      }
    } else {
      // Create new user with generated password
      const temporaryPassword = generateSecurePassword(12);
      const hashedPassword = await hashPassword(temporaryPassword);
      
      const newUserResult = await db
        .insert(users)
        .values({
          email,
          firstName,
          lastName,
          role: organizationRole,
          organizationId,
          isActive: true,
          emailVerified: false,
          passwordHash: hashedPassword,
          locale: 'en-US',
          twoFactorEnabled: false
        })
        .returning();

      targetUser = { ...newUserResult[0], temporaryPassword };
    }

    // Handle company access assignments
    for (const access of companyAccess) {
      // Verify company belongs to the organization
      const companyResult = await db
        .select()
        .from(companies)
        .where(and(
          eq(companies.id, access.companyId),
          eq(companies.organizationId, organizationId)
        ))
        .limit(1);

      if (companyResult.length === 0) {
        console.warn(`Company ${access.companyId} not found or doesn't belong to organization ${organizationId}`);
        continue;
      }

      // Check if user already has access to this company
      const existingAccess = await db
        .select()
        .from(companyUsers)
        .where(and(
          eq(companyUsers.companyId, access.companyId),
          eq(companyUsers.userId, targetUser.id)
        ))
        .limit(1);

      if (existingAccess.length > 0) {
        // Update existing role
        await db
          .update(companyUsers)
          .set({
            role: access.role,
            isActive: true,
            updatedAt: new Date()
          })
          .where(and(
            eq(companyUsers.companyId, access.companyId),
            eq(companyUsers.userId, targetUser.id)
          ));
      } else {
        // Create new access
        await db
          .insert(companyUsers)
          .values({
            companyId: access.companyId,
            userId: targetUser.id,
            role: access.role,
            isActive: true,
            invitedBy: payload.userId
          });
      }
    }

    console.log(`✅ User ${targetUser.email} invited to organization ${organizationId} as ${organizationRole}`);

    const response: any = {
      success: true,
      message: 'User invited to organization successfully',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        organizationRole: targetUser.role,
        companyAccess: companyAccess.map((ca: any) => ({
          companyId: ca.companyId,
          role: ca.role
        }))
      }
    };

    // Include temporary password if a new user was created
    if (targetUser.temporaryPassword) {
      response.temporaryPassword = targetUser.temporaryPassword;
      response.message = 'User invited to organization successfully. Please share the temporary password securely.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Organization user invitation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to invite user to organization',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}