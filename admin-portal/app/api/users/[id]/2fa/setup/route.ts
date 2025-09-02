import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, user2faSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';
import { generateSecret, generateQRCodeURL, generateBackupCodes } from '@/lib/totp-utils';

// POST /api/users/[id]/2fa/setup - Initialize 2FA setup for a user
export const POST = requireAuth(async (request: NextRequest, adminUser, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;

    // Check if user exists and is active
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
        { success: false, error: 'Cannot setup 2FA for inactive user' },
        { status: 400 }
      );
    }

    // Check if 2FA is already setup
    const [existing2FA] = await db
      .select({
        id: user2faSettings.id,
        enabled: user2faSettings.enabled
      })
      .from(user2faSettings)
      .where(eq(user2faSettings.userId, userId))
      .limit(1);

    if (existing2FA?.enabled) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled for this user' },
        { status: 400 }
      );
    }

    // Generate new secret and backup codes
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();
    const qrCodeURL = generateQRCodeURL(secret, existingUser.email);

    // Store or update 2FA settings (not enabled yet)
    if (existing2FA) {
      await db
        .update(user2faSettings)
        .set({
          secret,
          backupCodes: JSON.stringify(backupCodes),
          enabled: false,
          updatedAt: new Date()
        })
        .where(eq(user2faSettings.userId, userId));
    } else {
      await db
        .insert(user2faSettings)
        .values({
          userId,
          secret,
          backupCodes: JSON.stringify(backupCodes),
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeURL,
        backupCodes,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: `${existingUser.firstName} ${existingUser.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
});

// GET /api/users/[id]/2fa/setup - Get 2FA setup status
export const GET = requireAuth(async (request: NextRequest, adminUser, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id;

    // Check if user exists
    const [existingUser] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
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

    // Get 2FA settings
    const [twoFactorSettings] = await db
      .select({
        enabled: user2faSettings.enabled,
        enabledAt: user2faSettings.enabledAt,
        lastUsed: user2faSettings.lastUsed
      })
      .from(user2faSettings)
      .where(eq(user2faSettings.userId, userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: `${existingUser.firstName} ${existingUser.lastName}`
        },
        twoFactorAuth: {
          enabled: twoFactorSettings?.enabled || false,
          enabledAt: twoFactorSettings?.enabledAt || null,
          lastUsed: twoFactorSettings?.lastUsed || null
        }
      }
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get 2FA status' },
      { status: 500 }
    );
  }
});