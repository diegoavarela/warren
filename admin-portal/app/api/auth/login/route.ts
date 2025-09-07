import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logAuthentication } from '@/lib/audit';
import { isRateLimited, getClientIP, validateCSRFToken } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting check
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password, csrfToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: CSRF token validation
    const sessionCSRFToken = request.cookies.get('csrf-token')?.value;
    if (!csrfToken || !sessionCSRFToken || !validateCSRFToken(csrfToken, sessionCSRFToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid security token' },
        { status: 403 }
      );
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Log failed login attempt
      await logAuthentication('failed_login', null, request, { 
        email, 
        reason: 'user_not_found' 
      });
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active and has admin role
    if (!user.isActive) {
      // Log failed login attempt
      await logAuthentication('failed_login', user.id, request, { 
        email, 
        reason: 'account_deactivated' 
      });
      
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    if (user.role !== 'platform_admin') {
      // Log failed login attempt
      await logAuthentication('failed_login', user.id, request, { 
        email, 
        reason: 'insufficient_privileges',
        userRole: user.role 
      });
      
      return NextResponse.json(
        { success: false, error: 'Access denied. Platform admin role required.' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      // Log failed login attempt
      await logAuthentication('failed_login', user.id, request, { 
        email, 
        reason: 'invalid_password' 
      });
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Return user info (excluding password hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    };

    // Log successful login
    await logAuthentication('login', user.id, request, {
      email: user.email,
      organizationId: user.organizationId
    });

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: userResponse,
    });

    // Set secure httpOnly cookie
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}