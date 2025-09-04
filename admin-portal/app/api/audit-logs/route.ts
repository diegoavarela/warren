import { NextRequest, NextResponse } from 'next/server';
import { db, auditLogs, users, organizations, companies, eq, and, gte, sql, or, ilike, inArray } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange') || '7d';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
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
      
      const days = dateRangeMap[dateRange as keyof typeof dateRangeMap] || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      conditions.push(gte(auditLogs.createdAt, cutoffDate));
    }

    // Query audit logs with user and organization information
    const logs = await db
      .select({
        id: auditLogs.id,
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
        companyName: companies.name,
        companyOrganizationId: companies.organizationId,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.createdAt,
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
      .leftJoin(companies, eq(auditLogs.companyId, companies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${auditLogs.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination (simplified for search functionality)
    const totalQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
      .leftJoin(companies, eq(auditLogs.companyId, companies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalQuery[0]?.count || 0;

    // Get organization names for companies that don't have direct organization associations
    const companyOrgIds = logs
      .filter(log => !log.organizationId && log.companyOrganizationId)
      .map(log => log.companyOrganizationId);
    
    const uniqueCompanyOrgIds = [...new Set(companyOrgIds)];
    
    let companyOrganizations: Record<string, string> = {};
    if (uniqueCompanyOrgIds.length > 0) {
      const orgResults = await db
        .select({
          id: organizations.id,
          name: organizations.name
        })
        .from(organizations)
        .where(inArray(organizations.id, uniqueCompanyOrgIds));
      
      companyOrganizations = Object.fromEntries(
        orgResults.map(org => [org.id, org.name])
      );
    }

    // Transform the data to match the expected format
    const transformedLogs = logs.map((log: any) => {
      // Resolve organization name: direct organization or company's organization
      let organizationName = log.organizationName;
      let organizationId = log.organizationId;
      
      if (!organizationName && log.companyOrganizationId) {
        organizationName = companyOrganizations[log.companyOrganizationId];
        organizationId = log.companyOrganizationId;
      }
      
      return {
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        userId: log.userId,
        userName: log.userName || 'System',
        organizationId: organizationId,
        organizationName: organizationName || 'N/A',
        organizationIdResolved: organizationId || log.organizationId,
        companyId: log.companyId,
        companyName: log.companyName || null,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata,
        timestamp: log.timestamp?.toISOString(),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        success: log.success,
        errorMessage: log.errorMessage,
        severity: log.severity,
        source: log.source
      };
    });

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}