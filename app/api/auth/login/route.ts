import { NextRequest, NextResponse } from 'next/server';
import { db, users, eq } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    console.log('Searching for user in database...');
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    console.log('User search result:', userResult.length > 0 ? 'User found' : 'User not found');
    
    // Filter for active users
    const activeUsers = userResult.filter((u: any) => u.isActive);
    
    if (activeUsers.length === 0) {
      console.log('No active user found with this email');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = activeUsers[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Set HTTP-only cookie
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day to match JWT expiration
      path: '/'
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role,
        locale: user.locale
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}