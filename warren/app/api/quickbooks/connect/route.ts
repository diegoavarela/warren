/**
 * QuickBooks OAuth Connection Endpoint
 *
 * This endpoint initiates the OAuth flow with QuickBooks
 * User clicks "Connect to QuickBooks" -> redirected here -> redirected to QuickBooks
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [QuickBooks] Starting OAuth connection flow');

    // Validate environment variables
    if (!process.env.QB_CLIENT_ID || !process.env.QB_CLIENT_SECRET || !process.env.QB_REDIRECT_URI) {
      return NextResponse.json({
        error: 'QuickBooks OAuth configuration missing',
        details: 'QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI must be configured'
      }, { status: 500 });
    }

    // Build OAuth authorization URL manually
    const baseUrl = process.env.QB_SANDBOX === 'true'
      ? 'https://appcenter.intuit.com/connect/oauth2'
      : 'https://appcenter.intuit.com/connect/oauth2';

    const params = new URLSearchParams({
      client_id: process.env.QB_CLIENT_ID,
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: process.env.QB_REDIRECT_URI,
      response_type: 'code',
      access_type: 'offline',
      state: 'warren-quickbooks-integration'
    });

    const authUrl = `${baseUrl}?${params.toString()}`;

    console.log('🔍 [QuickBooks] Generated auth URL:', authUrl);

    // Redirect user to QuickBooks for authorization
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('❌ [QuickBooks] Error in connect endpoint:', error);

    return NextResponse.json({
      error: 'Failed to initiate QuickBooks connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}