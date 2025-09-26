import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db, users, organizations, eq } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, organizationName, locale } = await request.json();

    if (!email || !password || !firstName || !lastName || !organizationName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create organization first
    const [newOrg] = await db.insert(organizations).values({
      name: organizationName,
      locale: locale || 'es-MX',
      baseCurrency: locale?.startsWith('en') ? 'USD' : 'MXN'
    }).returning();

    // Create user
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      organizationId: newOrg.id,
      role: 'admin', // First user is admin
      locale: locale || 'es-MX',
      isEmailVerified: true // Skip email verification for now
    }).returning();

    // Generate JWT
    const token = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      organizationId: newUser.organizationId,
      role: newUser.role
    });

    // Set HTTP-only cookie
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,  
        lastName: newUser.lastName,
        organizationId: newUser.organizationId,
        role: newUser.role,
        locale: newUser.locale
      },
      organization: {
        id: newOrg.id,
        name: newOrg.name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}