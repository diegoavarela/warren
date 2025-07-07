import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, organizations, eq } from '@/lib/db';
import { loadUserCompanyAccess } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

    // Get user details
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));
    
    // Filter active users
    const activeUsers = userResult.filter(u => u.isActive);

    if (activeUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = activeUsers[0];

    // Get organization details
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    // Load user's company access for RBAC
    const companyAccess = await loadUserCompanyAccess(user.id);

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
        companyAccess
      },
      organization: orgResult.length > 0 ? {
        id: orgResult[0].id,
        name: orgResult[0].name,
        locale: orgResult[0].locale,
        baseCurrency: orgResult[0].baseCurrency
      } : null
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}