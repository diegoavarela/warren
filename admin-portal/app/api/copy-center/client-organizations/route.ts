import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, companies } from '@/lib/db';
import { eq, and, sql, ne } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

// GET /api/copy-center/client-organizations - Get client organizations for copying
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Get client organizations (not demo organizations) with company counts
    const clientOrganizationsList = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        isActive: organizations.isActive,
        companiesCount: sql<number>`COALESCE(${sql`(
          SELECT COUNT(*) 
          FROM ${companies} 
          WHERE ${companies.organizationId} = ${organizations.id} 
          AND ${companies.isActive} = true
        )`}, 0)`,
      })
      .from(organizations)
      .where(
        and(
          eq(organizations.isActive, true),
          // Exclude demo organizations
          sql`NOT (LOWER(${organizations.name}) LIKE '%demo%' OR LOWER(${organizations.name}) LIKE '%example%' OR LOWER(${organizations.name}) LIKE '%template%')`
        )
      )
      .orderBy(organizations.name);

    return NextResponse.json({
      success: true,
      data: clientOrganizationsList,
    });
  } catch (error) {
    console.error('Client organizations GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client organizations' },
      { status: 500 }
    );
  }
});