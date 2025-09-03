import { NextRequest, NextResponse } from 'next/server';
import { db, auditLogs, users, organizations, eq, and, gte, sql, or, ilike } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange') || '30d';
    const format = searchParams.get('format') || 'csv';

    // Build query conditions (same logic as main audit-logs route)
    const conditions = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (resource) {
      conditions.push(eq(auditLogs.resource, resource));
    }

    if (organizationId) {
      conditions.push(eq(auditLogs.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    // Add search functionality
    if (search) {
      const searchConditions = [
        // Search in action
        ilike(auditLogs.action, `%${search}%`),
        // Search in resource
        ilike(auditLogs.resource, `%${search}%`),
        // Search in IP address
        ilike(auditLogs.ipAddress, `%${search}%`),
        // Search in user first name
        ilike(users.firstName, `%${search}%`),
        // Search in user last name
        ilike(users.lastName, `%${search}%`),
        // Search in user email
        ilike(users.email, `%${search}%`),
        // Search in organization name
        ilike(organizations.name, `%${search}%`),
        // Search in metadata (JSON contains)
        sql`${auditLogs.metadata}::text ILIKE ${'%' + search + '%'}`,
      ];
      
      conditions.push(or(...searchConditions));
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const dateRangeMap = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      };
      
      const days = dateRangeMap[dateRange as keyof typeof dateRangeMap] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      conditions.push(gte(auditLogs.createdAt, cutoffDate));
    }

    // Query audit logs with user and organization information
    const logs = await db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.createdAt,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        userId: auditLogs.userId,
        userName: sql<string>`CASE 
          WHEN ${users.firstName} IS NOT NULL AND ${users.lastName} IS NOT NULL 
          THEN CONCAT(${users.firstName}, ' ', ${users.lastName})
          ELSE ${users.email}
        END`,
        organizationId: auditLogs.organizationId,
        organizationName: organizations.name,
        companyId: auditLogs.companyId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        sessionId: auditLogs.sessionId,
        success: auditLogs.success,
        errorMessage: auditLogs.errorMessage,
        severity: auditLogs.severity,
        source: auditLogs.source
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${auditLogs.createdAt} DESC`)
      .limit(10000); // Limit to prevent excessive exports

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Timestamp',
        'Action',
        'Resource',
        'Resource ID',
        'User ID',
        'User Name',
        'Organization ID',
        'Organization Name',
        'Company ID',
        'IP Address',
        'Success',
        'Severity',
        'Source',
        'Metadata',
        'Error Message'
      ];

      const csvRows = logs.map((log: any) => [
        log.timestamp?.toISOString() || '',
        log.action || '',
        log.resource || '',
        log.resourceId || '',
        log.userId || '',
        log.userName || 'System',
        log.organizationId || '',
        log.organizationName || '',
        log.companyId || '',
        log.ipAddress || '',
        log.success ? 'Yes' : 'No',
        log.severity || '',
        log.source || '',
        typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata || {}),
        log.errorMessage || ''
      ]);

      // Escape CSV values and wrap in quotes if needed
      const escapeCsvValue = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any) => row.map(escapeCsvValue).join(','))
      ].join('\n');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `audit-logs-${timestamp}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'json') {
      // Transform the data to match the expected format
      const transformedLogs = logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        userId: log.userId,
        userName: log.userName || 'System',
        organizationId: log.organizationId,
        organizationName: log.organizationName || 'N/A',
        companyId: log.companyId,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata,
        timestamp: log.timestamp?.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        success: log.success,
        errorMessage: log.errorMessage,
        severity: log.severity,
        source: log.source
      }));

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `audit-logs-${timestamp}.json`;

      const jsonContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalRecords: transformedLogs.length,
        filters: {
          action,
          resource,
          organizationId,
          userId,
          search,
          dateRange
        },
        logs: transformedLogs
      }, null, 2);

      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid export format. Supported formats: csv, json' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Audit logs export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}