import { NextRequest } from 'next/server';
import { authenticateAdmin, AuthenticatedUser } from './auth-middleware';

export interface AdminAuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export async function adminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const user = await authenticateAdmin(request);
    
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized. Platform admin or organization admin access required.'
      };
    }

    return {
      success: true,
      user
    };

  } catch (error) {
    console.error('Admin auth error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}