/**
 * QuickBooks Token Refresh Route
 * Refreshes expired access tokens using refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { getQuickBooksOAuthService } from '@/lib/quickbooks/oauth';
import { getDatabase } from '@/shared/db';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectionId, companyId } = await request.json();
    
    if (!connectionId && !companyId) {
      return NextResponse.json({ 
        error: 'Either connectionId or companyId is required' 
      }, { status: 400 });
    }

    // Get database connection
    const { db, quickbooksConnections } = await getDatabase();
    const { eq } = await import('drizzle-orm');

    // Find the QB connection
    let connection;
    if (connectionId) {
      const result = await db
        .select()
        .from(quickbooksConnections)
        .where(eq(quickbooksConnections.id, connectionId))
        .limit(1);
      connection = result[0];
    } else if (companyId) {
      // Authorization check for company access
      const accessCheck = await hasCompanyAccess(user.id, companyId, ['org_admin', 'company_admin', 'platform_admin']);
      if (!accessCheck) {
        return NextResponse.json({ 
          error: 'Access denied' 
        }, { status: 403 });
      }

      const result = await db
        .select()
        .from(quickbooksConnections)
        .where(eq(quickbooksConnections.companyId, companyId))
        .limit(1);
      connection = result[0];
    }

    if (!connection) {
      return NextResponse.json({ 
        error: 'QuickBooks connection not found' 
      }, { status: 404 });
    }

    // Check if user has access to this connection's company
    if (companyId !== connection.companyId) {
      const accessCheck = await hasCompanyAccess(user.id, connection.companyId, ['org_admin', 'company_admin', 'platform_admin']);
      if (!accessCheck) {
        return NextResponse.json({ 
          error: 'Access denied to this QuickBooks connection' 
        }, { status: 403 });
      }
    }

    // Check if refresh is needed
    const now = new Date();
    const tokenExpiresAt = new Date(connection.tokenExpiresAt);
    const refreshExpiresAt = new Date(connection.refreshExpiresAt);

    // Check if refresh token is still valid
    if (now >= refreshExpiresAt) {
      await db
        .update(quickbooksConnections)
        .set({
          connectionStatus: 'expired',
          lastSyncError: 'Refresh token expired. Please reconnect to QuickBooks.',
          updatedAt: new Date()
        })
        .where(eq(quickbooksConnections.id, connection.id));

      return NextResponse.json({ 
        error: 'Refresh token expired. Please reconnect to QuickBooks.',
        requiresReconnection: true
      }, { status: 401 });
    }

    // Check if access token actually needs refresh (5 minutes buffer)
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    if (tokenExpiresAt > fiveMinutesFromNow) {
      return NextResponse.json({
        success: true,
        message: 'Token is still valid, no refresh needed',
        expiresAt: connection.tokenExpiresAt,
        expiresIn: Math.floor((tokenExpiresAt.getTime() - now.getTime()) / 1000)
      });
    }

    // Refresh the token
    const oauthService = getQuickBooksOAuthService();
    const newTokens = await oauthService.refreshAccessToken(connection.refreshToken);

    // Calculate new expiration times
    const expirationTimes = oauthService.calculateExpirationTimes(newTokens);

    // Update connection with new tokens
    await db
      .update(quickbooksConnections)
      .set({
        accessToken: newTokens.access_token, // TODO: Encrypt this
        refreshToken: newTokens.refresh_token, // TODO: Encrypt this
        tokenExpiresAt: expirationTimes.accessTokenExpiresAt,
        refreshExpiresAt: expirationTimes.refreshTokenExpiresAt,
        connectionStatus: 'active',
        lastSyncError: null,
        updatedAt: new Date()
      })
      .where(eq(quickbooksConnections.id, connection.id));

    // Log audit event
    await logAuditEvent({
      action: 'refresh_token',
      resource: 'quickbooks',
      resourceId: connection.qbCompanyId,
      userId: user.id,
      organizationId: connection.organizationId,
      companyId: connection.companyId,
      metadata: {
        connectionId: connection.id,
        qbCompanyId: connection.qbCompanyId,
        previousExpiresAt: connection.tokenExpiresAt,
        newExpiresAt: expirationTimes.accessTokenExpiresAt
      },
      success: true
    });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: expirationTimes.accessTokenExpiresAt,
      expiresIn: newTokens.expires_in,
      refreshExpiresAt: expirationTimes.refreshTokenExpiresAt
    });

  } catch (error) {
    console.error('QB Token Refresh Error:', error);

    // Log failed audit event
    try {
      await logAuditEvent({
        action: 'refresh_token',
        resource: 'quickbooks',
        userId: user?.id || 'unknown',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Token refresh failed'
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    // Check if it's a token expiration error
    if (error instanceof Error && error.message.includes('refresh_token')) {
      return NextResponse.json({
        error: 'Refresh token expired. Please reconnect to QuickBooks.',
        requiresReconnection: true
      }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to refresh QuickBooks token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check if token needs refresh
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const companyId = searchParams.get('companyId');

    if (!connectionId && !companyId) {
      return NextResponse.json({ 
        error: 'Either connectionId or companyId is required' 
      }, { status: 400 });
    }

    // Get database connection
    const { db, quickbooksConnections } = await getDatabase();
    const { eq } = await import('drizzle-orm');

    // Find the QB connection
    let connection;
    if (connectionId) {
      const result = await db
        .select()
        .from(quickbooksConnections)
        .where(eq(quickbooksConnections.id, connectionId))
        .limit(1);
      connection = result[0];
    } else if (companyId) {
      const accessCheck = await hasCompanyAccess(user.id, companyId, ['org_admin', 'company_admin', 'platform_admin']);
      if (!accessCheck) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const result = await db
        .select()
        .from(quickbooksConnections)
        .where(eq(quickbooksConnections.companyId, companyId))
        .limit(1);
      connection = result[0];
    }

    if (!connection) {
      return NextResponse.json({ 
        error: 'QuickBooks connection not found' 
      }, { status: 404 });
    }

    const now = new Date();
    const tokenExpiresAt = new Date(connection.tokenExpiresAt);
    const refreshExpiresAt = new Date(connection.refreshExpiresAt);

    const needsRefresh = now >= tokenExpiresAt || (tokenExpiresAt.getTime() - now.getTime()) < 5 * 60 * 1000; // 5 minutes buffer
    const refreshExpired = now >= refreshExpiresAt;

    return NextResponse.json({
      connectionId: connection.id,
      companyId: connection.companyId,
      qbCompanyId: connection.qbCompanyId,
      qbCompanyName: connection.qbCompanyName,
      connectionStatus: connection.connectionStatus,
      tokenExpiresAt: connection.tokenExpiresAt,
      refreshExpiresAt: connection.refreshExpiresAt,
      needsRefresh,
      refreshExpired,
      timeUntilExpiry: Math.max(0, Math.floor((tokenExpiresAt.getTime() - now.getTime()) / 1000)),
      timeUntilRefreshExpiry: Math.max(0, Math.floor((refreshExpiresAt.getTime() - now.getTime()) / 1000))
    });

  } catch (error) {
    console.error('QB Token Status Check Error:', error);
    return NextResponse.json({
      error: 'Failed to check token status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}