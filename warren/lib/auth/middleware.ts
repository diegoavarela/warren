import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './jwt';

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    
    // Add user to request
    const user = {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role
    };

    return await handler(request, user);

  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, user: any) => Promise<NextResponse>
  ) => {
    return withAuth(request, async (req, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      return handler(req, user);
    });
  };
}