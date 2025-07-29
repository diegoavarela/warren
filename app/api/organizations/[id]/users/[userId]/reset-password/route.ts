import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, eq, and } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';
import { hashPassword, generateSecurePassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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
    
    // Only org admins and super admins can reset passwords
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can reset user passwords.' },
        { status: 403 }
      );
    }

    const { id: organizationId, userId } = params;

    // Verify the requesting user belongs to this organization (except super admins)
    if (payload.role !== ROLES.SUPER_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied. You can only reset passwords for users in your own organization.' },
        { status: 403 }
      );
    }

    // Prevent users from resetting their own password through this endpoint
    if (payload.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot reset your own password through this endpoint. Use the profile settings instead.' },
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

    // Generate new secure password
    const newTemporaryPassword = generateSecurePassword(12);
    const hashedPassword = await hashPassword(newTemporaryPassword);

    // Update user's password
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
        // Optionally, you could set emailVerified to false to force re-verification
        // emailVerified: false
      })
      .where(eq(users.id, userId));

    console.log(`✅ Password reset for user ${targetUser.email} by ${payload.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please share the new temporary password securely.',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName
      },
      temporaryPassword: newTemporaryPassword
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset password',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}