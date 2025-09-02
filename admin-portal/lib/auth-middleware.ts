import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { users } from '@/shared/db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

export async function authenticateAdmin(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('admin-token')?.value;

    if (!token) {
      return null;
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    } catch (jwtError) {
      return null;
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive || !['platform_admin', 'organization_admin'].includes(user.role)) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any) => {
    const user = await authenticateAdmin(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Platform admin or organization admin access required.' },
        { status: 401 }
      );
    }

    return handler(request, user, context);
  };
}