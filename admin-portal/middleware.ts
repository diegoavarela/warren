import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { sanitizeUrlMiddleware, applySecurityHeaders } from '@/lib/security';

export async function middleware(request: NextRequest) {
  console.log('Middleware checking path:', request.nextUrl.pathname);
  
  // SECURITY: Check for sensitive parameters in URL first
  const sanitizeResponse = sanitizeUrlMiddleware(request);
  if (sanitizeResponse) {
    return applySecurityHeaders(sanitizeResponse);
  }
  
  // Skip middleware for API routes, public assets, and login page
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname === '/login'
  ) {
    console.log('Skipping middleware for:', request.nextUrl.pathname);
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // Get token from cookies or headers
  const cookieToken = request.cookies.get('admin-token')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  console.log('Middleware token check:', { 
    path: request.nextUrl.pathname,
    hasCookieToken: !!cookieToken, 
    hasHeaderToken: !!headerToken, 
    tokenFound: !!token 
  });

  if (!token) {
    console.log('No token found, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    return applySecurityHeaders(response);
  }

  try {
    // Verify JWT token using jose (Edge Runtime compatible)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    const { payload: decoded } = await jwtVerify(token, secret);
    console.log('Token decoded successfully:', { userId: decoded.userId, role: decoded.role });
    
    // Check if user has platform_admin role
    if (decoded.role !== 'platform_admin') {
      console.log('Role check failed:', decoded.role, 'is not platform_admin');
      const response = NextResponse.redirect(new URL('/login', request.url));
      return applySecurityHeaders(response);
    }

    console.log('Middleware check passed, allowing access to:', request.nextUrl.pathname);
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  } catch (error) {
    // Token is invalid, redirect to login
    console.log('Token verification failed:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    return applySecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ]
};