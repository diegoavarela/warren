import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';
import bcrypt from 'bcrypt';
import { generateTempPassword, validatePassword, hashPassword } from '@/lib/password-utils';

// POST /api/users/[id]/reset-password - Reset user password
export const POST = requireAuth(async (request: NextRequest, adminUser, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;
    const { newPassword } = await request.json();

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

    if (!existingUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot reset password for inactive user' },
        { status: 400 }
      );
    }

    // Generate or validate new password
    let passwordToSet: string;
    
    if (newPassword) {
      // Validate provided password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Password does not meet requirements',
            details: validation.errors
          },
          { status: 400 }
        );
      }
      passwordToSet = newPassword;
    } else {
      // Generate secure temporary password
      passwordToSet = generateTempPassword();
    }
    
    // Hash new password
    const passwordHash = await hashPassword(passwordToSet);

    // Update user password
    await db
      .update(users)
      .set({ 
        passwordHash,
        isEmailVerified: false, // Force user to verify email again
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: `Password reset for ${existingUser.firstName} ${existingUser.lastName} (${existingUser.email})`,
      data: {
        userId: existingUser.id,
        email: existingUser.email,
        tempPassword: passwordToSet,
      },
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
});