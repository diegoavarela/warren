import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security';

export async function GET() {
  const csrfToken = generateCSRFToken();
  
  const response = NextResponse.json({ csrfToken });
  
  // Set CSRF token as httpOnly cookie
  response.cookies.set('csrf-token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  });
  
  return response;
}