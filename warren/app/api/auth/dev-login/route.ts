import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

/**
 * Development-only authentication endpoint
 * Sets the mock-session-token cookie for testing purposes
 */
export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Development login is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action = 'login' } = body;

    const cookieStore = cookies();

    if (action === 'login') {
      // Set the mock session token
      cookieStore.set('auth-token', 'mock-session-token', {
        httpOnly: true,
        secure: false, // Allow over HTTP in development
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/'
      });

      return NextResponse.json({
        success: true,
        message: "Development authentication successful",
        user: {
          id: 'clz1234567890abcdef',
          email: 'platform@warren.com',
          role: 'SUPER_ADMIN',
          organizationId: 'clz1234567890abcdef'
        }
      });

    } else if (action === 'logout') {
      // Clear the auth token
      cookieStore.set('auth-token', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      return NextResponse.json({
        success: true,
        message: "Development logout successful"
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'login' or 'logout'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Development authentication error:', error);
    return NextResponse.json(
      { error: "Failed to process development authentication" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current authentication status
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Development auth check is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    return NextResponse.json({
      authenticated: token === 'mock-session-token',
      token: token || null,
      environment: process.env.NODE_ENV,
      message: token === 'mock-session-token' 
        ? "Development authentication active"
        : "No development authentication"
    });

  } catch (error) {
    console.error('Development auth check error:', error);
    return NextResponse.json(
      { error: "Failed to check development authentication" },
      { status: 500 }
    );
  }
}