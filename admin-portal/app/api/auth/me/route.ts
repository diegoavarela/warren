import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('admin-token')?.value ||
                  request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify JWT token using jose (consistent with middleware)
    let decoded;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
      const { payload } = await jwtVerify(token, secret);
      decoded = payload;
    } catch (jwtError) {
      console.log('JWT verification failed in /api/auth/me:', jwtError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const userId = decoded.userId as string;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive || user.role !== 'platform_admin') {
      console.log('User validation failed:', { 
        userExists: !!user, 
        isActive: user?.isActive, 
        role: user?.role 
      });
      return NextResponse.json(
        { error: 'User not found or unauthorized' },
        { status: 401 }
      );
    }

    // Get organization details
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        role: user.role,
        locale: user.locale,
        lastLoginAt: user.lastLoginAt
      },
      organization: orgResult.length > 0 ? {
        id: orgResult[0].id,
        name: orgResult[0].name,
        locale: orgResult[0].locale,
        baseCurrency: orgResult[0].baseCurrency,
        timezone: orgResult[0].timezone
      } : null
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}