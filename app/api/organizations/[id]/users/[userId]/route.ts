import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, companyUsers, eq, and } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    
    // Only org admins and super admins can delete users
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can delete users.' },
        { status: 403 }
      );
    }

    const { id: organizationId, userId } = params;

    // Verify the requesting user belongs to this organization (except super admins)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete users from your own organization.' },
        { status: 403 }
      );
    }

    // Prevent users from deleting themselves
    if (payload.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists and belongs to the organization
    const userResult = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId)
      ))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    const targetUser = userResult[0];

    // Remove all company access for this user
    await db
      .delete(companyUsers)
      .where(eq(companyUsers.userId, userId));

    // Delete the user
    await db
      .delete(users)
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    
    // Only org admins and super admins can edit users
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can edit users.' },
        { status: 403 }
      );
    }

    const { id: organizationId, userId } = params;

    // Verify the requesting user belongs to this organization (except super admins)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied. You can only edit users from your own organization.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, organizationRole, isActive, companyAccess = [] } = body;

    // Check if user exists and belongs to the organization
    const userResult = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.organizationId, organizationId)
      ))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    // Validate organization role if provided
    if (organizationRole) {
      const validOrgRoles = ['user', 'admin'];
      if (!validOrgRoles.includes(organizationRole)) {
        return NextResponse.json(
          { error: 'Invalid organization role. Must be one of: user, admin' },
          { status: 400 }
        );
      }
    }

    // Update user information
    const updateData: any = {
      updatedAt: new Date()
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (organizationRole !== undefined) updateData.role = organizationRole;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Update company access if provided
    if (companyAccess.length > 0) {
      // Remove existing company access
      await db
        .delete(companyUsers)
        .where(eq(companyUsers.userId, userId));

      // Add new company access
      for (const access of companyAccess) {
        await db
          .insert(companyUsers)
          .values({
            companyId: access.companyId,
            userId: userId,
            role: access.role,
            isActive: true,
            invitedBy: payload.userId
          });
      }
    }

    const updatedUser = userResult[0];

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: userId,
        email: updatedUser.email,
        firstName: updateData.firstName || updatedUser.firstName,
        lastName: updateData.lastName || updatedUser.lastName,
        organizationRole: updateData.role || updatedUser.role,
        isActive: updateData.isActive !== undefined ? updateData.isActive : updatedUser.isActive
      }
    });

  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}