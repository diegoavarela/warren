import { NextRequest, NextResponse } from 'next/server';
import { withRBAC, ROLES } from '@/lib/auth/rbac';
import { db, organizations, companies, users, financialStatements, mappingTemplates, eq, count, and, gte } from '@/lib/db';

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    // Only platform admins can access platform stats
    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    try {
      // Get total counts
      const [orgCount] = await db
        .select({ count: count() })
        .from(organizations)
        .where(eq(organizations.isActive, true));

      const [companyCount] = await db
        .select({ count: count() })
        .from(companies)
        .where(eq(companies.isActive, true));

      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      // Get active users (logged in within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const [activeUserCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            gte(users.lastLoginAt, sevenDaysAgo)
          )
        );

      // Get documents processed this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const [docCount] = await db
        .select({ count: count() })
        .from(financialStatements)
        .where(gte(financialStatements.createdAt, startOfMonth));

      // Get templates count
      const [templateCount] = await db
        .select({ count: count() })
        .from(mappingTemplates);

      // Calculate growth rates (mock data for now)
      const growthRate = {
        organizations: 12,
        users: 18,
        documents: 25
      };

      // Mock API requests and storage
      const apiRequests = Math.floor(Math.random() * 50000) + 100000;
      const totalStorage = Math.floor(Math.random() * 5000) + 10000; // MB

      return NextResponse.json({
        totalOrganizations: orgCount?.count || 0,
        totalCompanies: companyCount?.count || 0,
        totalUsers: userCount?.count || 0,
        totalTemplates: templateCount?.count || 0,
        activeUsers: activeUserCount?.count || 0,
        documentsProcessed: docCount?.count || 0,
        apiRequests,
        totalStorage,
        growthRate
      });

    } catch (error) {
      console.error('Platform stats error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch platform stats' },
        { status: 500 }
      );
    }
  });
}