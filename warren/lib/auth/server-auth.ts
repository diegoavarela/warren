import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, eq } from '@/lib/db';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: string;
  locale?: string | null;
  isActive: boolean;
}

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    // Handle development mock token
    if (process.env.NODE_ENV === 'development' && token === 'mock-session-token') {
      return {
        id: 'clz1234567890abcdef',
        email: 'platform@warren.com',
        firstName: 'Platform',
        lastName: 'Admin',
        organizationId: 'clz1234567890abcdef',
        role: 'SUPER_ADMIN',
        locale: 'en',
        isActive: true,
      };
    }

    // Verify JWT for production/real tokens
    const payload = await verifyJWT(token);

    // Get user details
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (userResult.length === 0 || !userResult[0].isActive) {
      return null;
    }

    const user = userResult[0];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      role: user.role,
      locale: user.locale,
      isActive: user.isActive,
    };

  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}