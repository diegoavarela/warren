import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csrfFromBody = body.csrfToken;
    const csrfFromCookie = request.cookies.get('csrf-token')?.value;

    return NextResponse.json({
      success: true,
      debug: {
        bodyHasCSRF: !!csrfFromBody,
        cookieHasCSRF: !!csrfFromCookie,
        csrfBodyLength: csrfFromBody?.length || 0,
        csrfCookieLength: csrfFromCookie?.length || 0,
        tokensMatch: csrfFromBody === csrfFromCookie,
        bodyToken: csrfFromBody?.substring(0, 10) + '...',
        cookieToken: csrfFromCookie?.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}