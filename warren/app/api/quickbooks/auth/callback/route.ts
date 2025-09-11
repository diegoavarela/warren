/**
 * QuickBooks OAuth Callback Route
 * Handles the OAuth callback from QuickBooks and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksOAuthService } from '@/lib/quickbooks/oauth';
import { getDatabase } from '@/shared/db';
import { createQuickBooksClient } from '@/lib/quickbooks/client';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract OAuth parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('QB OAuth Error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/org-admin/quickbooks?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL('/dashboard/org-admin/quickbooks?error=invalid_callback', request.url)
      );
    }

    // Parse state to get user and company info
    let stateData;
    try {
      stateData = JSON.parse(state);
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return NextResponse.redirect(
        new URL('/dashboard/org-admin/quickbooks?error=invalid_state', request.url)
      );
    }

    const { companyId, userId, timestamp } = stateData;

    // Validate state timestamp (prevent replay attacks)
    const stateAge = Date.now() - timestamp;
    if (stateAge > 10 * 60 * 1000) { // 10 minutes
      return NextResponse.redirect(
        new URL('/dashboard/org-admin/quickbooks?error=expired_state', request.url)
      );
    }

    // Exchange code for tokens
    const oauthService = getQuickBooksOAuthService();
    const tokens = await oauthService.exchangeCodeForTokens(code, realmId, state);

    // Get company info from QuickBooks
    const qbClient = createQuickBooksClient(
      tokens.access_token, 
      realmId, 
      process.env.QB_BASE_URL?.includes('sandbox') ?? true
    );
    
    const qbCompanyInfo = await qbClient.getCompanyInfo();
    const qbCompanyName = qbCompanyInfo?.QueryResponse?.CompanyInfo?.[0]?.Name || 'Unknown Company';

    // Calculate token expiration times
    const expirationTimes = oauthService.calculateExpirationTimes(tokens);

    // Store connection in database
    const { db, quickbooksConnections, companies, organizations } = await getDatabase();
    const { eq } = await import('drizzle-orm');

    // Get company and organization info
    const companyResult = await db
      .select({
        id: companies.id,
        organizationId: companies.organizationId,
        name: companies.name
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyResult.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/org-admin/quickbooks?error=company_not_found', request.url)
      );
    }

    const company = companyResult[0];

    // Check for existing connection and update or create
    const existingConnection = await db
      .select()
      .from(quickbooksConnections)
      .where(eq(quickbooksConnections.companyId, companyId))
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(quickbooksConnections)
        .set({
          qbCompanyId: realmId,
          qbCompanyName: qbCompanyName,
          qbBaseUrl: process.env.QB_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com',
          accessToken: tokens.access_token, // TODO: Encrypt this
          refreshToken: tokens.refresh_token, // TODO: Encrypt this
          tokenExpiresAt: expirationTimes.accessTokenExpiresAt,
          refreshExpiresAt: expirationTimes.refreshTokenExpiresAt,
          scope: tokens.token_type,
          connectionStatus: 'active',
          lastSyncStatus: 'pending',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(quickbooksConnections.id, existingConnection[0].id));
    } else {
      // Create new connection
      await db
        .insert(quickbooksConnections)
        .values({
          companyId: companyId,
          organizationId: company.organizationId,
          qbCompanyId: realmId,
          qbCompanyName: qbCompanyName,
          qbBaseUrl: process.env.QB_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com',
          accessToken: tokens.access_token, // TODO: Encrypt this
          refreshToken: tokens.refresh_token, // TODO: Encrypt this
          tokenExpiresAt: expirationTimes.accessTokenExpiresAt,
          refreshExpiresAt: expirationTimes.refreshTokenExpiresAt,
          scope: tokens.token_type,
          syncEnabled: true,
          connectionStatus: 'active',
          lastSyncStatus: 'pending',
          createdBy: userId
        });
    }

    // Log audit event
    await logAuditEvent({
      action: 'connect',
      resource: 'quickbooks',
      resourceId: realmId,
      userId: userId,
      organizationId: company.organizationId,
      companyId: companyId,
      metadata: {
        qbCompanyName: qbCompanyName,
        qbCompanyId: realmId,
        connectionType: 'oauth'
      },
      success: true
    });

    // Test the connection
    const connectionTest = await qbClient.testConnection();
    
    if (!connectionTest) {
      console.warn('QB connection test failed after successful OAuth');
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/dashboard/org-admin/quickbooks?success=true&company=${encodeURIComponent(qbCompanyName)}`, request.url)
    );

  } catch (error) {
    console.error('QB OAuth Callback Error:', error);
    
    // Log failed audit event
    try {
      await logAuditEvent({
        action: 'connect',
        resource: 'quickbooks',
        userId: 'unknown',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          callback: 'failed'
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'OAuth callback failed'
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.redirect(
      new URL(`/dashboard/org-admin/quickbooks?error=callback_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
}