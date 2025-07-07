import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companyUsers, users, companies, eq, and } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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
    
    // Only org admins and super admins can assign users to companies
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can assign users to companies.' },
        { status: 403 }
      );
    }

    const { companyId } = params;
    const body = await request.json();
    const { userId, role = 'user' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['company_admin', 'user', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: company_admin, user, viewer' },
        { status: 400 }
      );
    }

    // Check if company exists
    const companyResult = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (companyResult.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if user exists and belongs to the same organization
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = userResult[0];
    const company = companyResult[0];

    // Verify user is in the same organization as the company
    if (targetUser.organizationId !== company.organizationId) {
      return NextResponse.json(
        { error: 'User and company must be in the same organization' },
        { status: 400 }
      );
    }

    // Check if user already has access to this company
    const existingAccess = await db
      .select()
      .from(companyUsers)
      .where(and(
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.userId, userId)
      ))
      .limit(1);

    if (existingAccess.length > 0) {
      // Update existing role
      await db
        .update(companyUsers)
        .set({
          role,
          isActive: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId)
        ));
    } else {
      // Create new access
      await db
        .insert(companyUsers)
        .values({
          companyId,
          userId,
          role,
          isActive: true,
          invitedBy: payload.userId
        });
    }

    console.log(`✅ User ${targetUser.email} assigned to company ${company.name} as ${role}`);

    return NextResponse.json({
      success: true,
      message: `User assigned to company successfully`,
      assignment: {
        userId,
        companyId,
        role
      }
    });

  } catch (error) {
    console.error('Company user assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to assign user to company' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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
    const { companyId } = params;

    // Get company users
    const companyUsersList = await db
      .select({
        user: users,
        companyRole: companyUsers.role,
        isActive: companyUsers.isActive,
        joinedAt: companyUsers.joinedAt
      })
      .from(companyUsers)
      .innerJoin(users, eq(companyUsers.userId, users.id))
      .where(eq(companyUsers.companyId, companyId))
      .orderBy(companyUsers.joinedAt);

    return NextResponse.json({
      success: true,
      users: companyUsersList.map((cu: any) => ({
        id: cu.user.id,
        email: cu.user.email,
        firstName: cu.user.firstName,
        lastName: cu.user.lastName,
        organizationRole: cu.user.role,
        companyRole: cu.companyRole,
        isActive: cu.isActive,
        joinedAt: cu.joinedAt
      }))
    });

  } catch (error) {
    console.error('Company users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company users' },
      { status: 500 }
    );
  }
}