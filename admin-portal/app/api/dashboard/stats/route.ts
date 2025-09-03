import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations, companies } from '@/lib/db';
import { sql, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get total organizations (active only)
    const [organizationsResult] = await db
      .select({ count: count() })
      .from(organizations)
      .where(sql`${organizations.isActive} = true`);

    // Get total companies (active only)
    const [companiesResult] = await db
      .select({ count: count() })
      .from(companies)
      .where(sql`${companies.isActive} = true`);

    // Get total users (active only)
    const [usersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.isActive} = true`);

    // Get active users today (users who logged in within the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeTodayResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.isActive} = true AND ${users.lastLoginAt} >= ${twentyFourHoursAgo}`);

    const stats = {
      organizations: organizationsResult?.count || 0,
      companies: companiesResult?.count || 0,
      users: usersResult?.count || 0,
      activeToday: activeTodayResult?.count || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}