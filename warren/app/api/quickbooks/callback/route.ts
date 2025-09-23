/**
 * QuickBooks OAuth Callback Endpoint
 *
 * This endpoint handles the return from QuickBooks OAuth flow
 * QuickBooks redirects here with authorization code -> exchange for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeQuickBooksTokens } from '@/lib/services/quickbooks-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [QuickBooks] OAuth callback received');

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId'); // QuickBooks company ID
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🔍 [QuickBooks] Callback params:', {
      code: code?.substring(0, 10) + '...',
      realmId,
      state,
      error
    });

    // Check for OAuth errors
    if (error) {
      console.error('❌ [QuickBooks] OAuth error:', error);
      const errorPageUrl = `/dashboard/quickbooks-test?error=${encodeURIComponent(error)}`;
      return NextResponse.redirect(new URL(errorPageUrl, request.url));
    }

    // Validate required parameters
    if (!code || !realmId) {
      console.error('❌ [QuickBooks] Missing required parameters');
      const errorPageUrl = `/dashboard/quickbooks-test?error=missing_params`;
      return NextResponse.redirect(new URL(errorPageUrl, request.url));
    }

    // Exchange authorization code for tokens using fetch
    console.log('🔍 [QuickBooks] Exchanging code for tokens...');

    const tokenUrl = process.env.QB_SANDBOX === 'true'
      ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.QB_REDIRECT_URI!
    });

    const basicAuth = Buffer.from(
      `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData
    });

    if (!tokenResponse.ok) {
      console.error('❌ [QuickBooks] Token exchange failed:', tokenResponse.status, await tokenResponse.text());
      const errorPageUrl = `/dashboard/quickbooks-test?error=token_exchange_failed`;
      return NextResponse.redirect(new URL(errorPageUrl, request.url));
    }

    const tokens = await tokenResponse.json();

    console.log('✅ [QuickBooks] Tokens received successfully');
    console.log('🔍 [QuickBooks] Access token length:', tokens.access_token?.length);
    console.log('🔍 [QuickBooks] Refresh token length:', tokens.refresh_token?.length);

    // Store tokens in database
    await storeQuickBooksTokens(realmId, tokens.access_token, tokens.refresh_token, tokens.expires_in);

    // Return success page with the realmId
    const testPageUrl = `/dashboard/quickbooks-test?realmId=${realmId}&connected=true&hasTokens=true`;

    console.log('🔍 [QuickBooks] Redirecting to test page:', testPageUrl);

    return NextResponse.redirect(new URL(testPageUrl, request.url));

  } catch (error) {
    console.error('❌ [QuickBooks] Error in callback endpoint:', error);

    const errorPageUrl = `/dashboard/quickbooks-test?error=callback_error&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`;
    return NextResponse.redirect(new URL(errorPageUrl, request.url));
  }
}