/**
 * QuickBooks Disconnect Route
 * Revokes tokens and removes QuickBooks connection
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
    const { db, quickbooksConnections, quickbooksDataMappings, quickbooksSyncLogs } = await getDatabase();
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

    // Store connection info for logging before deletion
    const connectionInfo = {
      id: connection.id,
      companyId: connection.companyId,
      organizationId: connection.organizationId,
      qbCompanyId: connection.qbCompanyId,
      qbCompanyName: connection.qbCompanyName
    };

    try {
      // Attempt to revoke tokens with QuickBooks
      const oauthService = getQuickBooksOAuthService();
      await oauthService.revokeTokens(connection.refreshToken);
    } catch (revokeError) {
      console.warn('Failed to revoke QB tokens (continuing with disconnect):', revokeError);
      // Continue with local cleanup even if QB revocation fails
    }

    // Begin transaction to clean up all related data
    await db.transaction(async (tx) => {
      // Delete sync logs
      await tx
        .delete(quickbooksSyncLogs)
        .where(eq(quickbooksSyncLogs.connectionId, connection.id));

      // Delete data mappings
      await tx
        .delete(quickbooksDataMappings)
        .where(eq(quickbooksDataMappings.connectionId, connection.id));

      // Delete the connection
      await tx
        .delete(quickbooksConnections)
        .where(eq(quickbooksConnections.id, connection.id));
    });

    // Log audit event
    await logAuditEvent({
      action: 'disconnect',
      resource: 'quickbooks',
      resourceId: connectionInfo.qbCompanyId,
      userId: user.id,
      organizationId: connectionInfo.organizationId,
      companyId: connectionInfo.companyId,
      metadata: {
        connectionId: connectionInfo.id,
        qbCompanyId: connectionInfo.qbCompanyId,
        qbCompanyName: connectionInfo.qbCompanyName,
        disconnectedBy: user.id
      },
      success: true
    });

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected QuickBooks connection for ${connectionInfo.qbCompanyName}`,
      connectionId: connectionInfo.id,
      qbCompanyName: connectionInfo.qbCompanyName
    });

  } catch (error) {
    console.error('QB Disconnect Error:', error);

    // Log failed audit event
    try {
      await logAuditEvent({
        action: 'disconnect',
        resource: 'quickbooks',
        userId: user?.id || 'unknown',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connectionId: connectionId || 'unknown',
          companyId: companyId || 'unknown'
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Disconnect failed'
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return NextResponse.json({
      error: 'Failed to disconnect QuickBooks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to get disconnect confirmation info
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
    const { db, quickbooksConnections, quickbooksSyncLogs } = await getDatabase();
    const { eq, count } = await import('drizzle-orm');

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

    // Get sync statistics
    const syncStats = await db
      .select({ count: count() })
      .from(quickbooksSyncLogs)
      .where(eq(quickbooksSyncLogs.connectionId, connection.id));

    const totalSyncs = syncStats[0]?.count || 0;

    return NextResponse.json({
      connectionId: connection.id,
      companyId: connection.companyId,
      qbCompanyId: connection.qbCompanyId,
      qbCompanyName: connection.qbCompanyName,
      connectedAt: connection.createdAt,
      lastSyncAt: connection.lastSyncAt,
      syncEnabled: connection.syncEnabled,
      connectionStatus: connection.connectionStatus,
      totalSyncs,
      warning: 'Disconnecting will remove all QuickBooks data and sync history for this company. This action cannot be undone.',
      impact: [
        'QuickBooks data will no longer be available in Warren dashboards',
        'All sync logs and mappings will be deleted',
        'You will need to reconnect and reconfigure mappings to restore QB integration',
        'Historical QuickBooks data will be lost'
      ]
    });

  } catch (error) {
    console.error('QB Disconnect Info Error:', error);
    return NextResponse.json({
      error: 'Failed to get disconnect information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}