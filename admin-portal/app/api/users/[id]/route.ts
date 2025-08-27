import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { users, organizations } from '@/shared/db/actual-schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';
import bcrypt from 'bcrypt';

// GET /api/users/[id] - Get user details
export const GET = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;

    const [userDetails] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        role: users.role,
        locale: users.locale,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userDetails) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
});

// PUT /api/users/[id] - Update user
export const PUT = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;
    const data = await request.json();
    const { email, firstName, lastName, organizationId, role, locale, isActive, isEmailVerified } = data;

    // Check if user exists
    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being changed, check if new email already exists
    if (email && email.toLowerCase() !== existingUser.email) {
      const [emailExists] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    // If organizationId is being changed, verify new organization exists
    if (organizationId) {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        return NextResponse.json(
          { success: false, error: 'Organization not found' },
          { status: 404 }
        );
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (role !== undefined) updateData.role = role;
    if (locale !== undefined) updateData.locale = locale;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = updatedUser;

    return NextResponse.json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error('User PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
});

// DELETE /api/users/[id] - Deactivate user (soft delete)
export const DELETE = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [existingUser] = await db
      .select({ 
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const [deactivatedUser] = await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `User "${existingUser.firstName} ${existingUser.lastName}" (${existingUser.email}) has been deactivated`,
      data: { id: deactivatedUser.id, isActive: deactivatedUser.isActive },
    });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
});