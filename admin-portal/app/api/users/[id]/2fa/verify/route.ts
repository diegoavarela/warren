import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { users, user2faSettings, user2faAttempts } from '@/shared/db/actual-schema';
import { eq, and, gte } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyTOTP, verifyBackupCode, removeUsedBackupCode } from '@/lib/totp-utils';

// POST /api/users/[id]/2fa/verify - Verify 2FA token for a user
export const POST = requireAuth(async (request: NextRequest, adminUser, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
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

    if (!existingUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'User is not active' },
        { status: 400 }
      );
    }

    // Get 2FA settings
    const [twoFactorSettings] = await db
      .select({
        id: user2faSettings.id,
        secret: user2faSettings.secret,
        backupCodes: user2faSettings.backupCodes,
        enabled: user2faSettings.enabled
      })
      .from(user2faSettings)
      .where(eq(user2faSettings.userId, userId))
      .limit(1);

    if (!twoFactorSettings || !twoFactorSettings.enabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Check rate limiting (max 10 verification attempts per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await db
      .select({ id: user2faAttempts.id })
      .from(user2faAttempts)
      .where(
        and(
          eq(user2faAttempts.userId, userId),
          gte(user2faAttempts.attemptedAt, fifteenMinutesAgo)
        )
      );

    if (recentAttempts.length >= 10) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify token (TOTP or backup code)
    let isValidToken = false;
    let attemptType: 'totp' | 'backup_code' = 'totp';
    let updatedBackupCodes = twoFactorSettings.backupCodes;

    // Try TOTP first
    if (verifyTOTP(token, twoFactorSettings.secret)) {
      isValidToken = true;
      attemptType = 'totp';
    } else {
      // Try backup code
      const backupCodes = JSON.parse(twoFactorSettings.backupCodes as string) || [];
      if (verifyBackupCode(token, backupCodes)) {
        isValidToken = true;
        attemptType = 'backup_code';
        // Remove used backup code
        const remainingCodes = removeUsedBackupCode(token, backupCodes);
        updatedBackupCodes = JSON.stringify(remainingCodes);
      }
    }

    // Log the attempt
    await db.insert(user2faAttempts).values({
      userId,
      attemptType,
      success: isValidToken,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      attemptedAt: new Date()
    });

    if (!isValidToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Update last used timestamp and backup codes if used
    const updateData: any = {
      lastUsed: new Date(),
      updatedAt: new Date()
    };

    if (attemptType === 'backup_code') {
      updateData.backupCodes = updatedBackupCodes;
    }

    await db
      .update(user2faSettings)
      .set(updateData)
      .where(eq(user2faSettings.id, twoFactorSettings.id));

    return NextResponse.json({
      success: true,
      message: '2FA verification successful',
      data: {
        userId: existingUser.id,
        email: existingUser.email,
        verifiedAt: new Date(),
        methodUsed: attemptType,
        backupCodesRemaining: attemptType === 'backup_code' 
          ? JSON.parse(updatedBackupCodes).length 
          : JSON.parse(twoFactorSettings.backupCodes as string).length
      }
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA token' },
      { status: 500 }
    );
  }
});