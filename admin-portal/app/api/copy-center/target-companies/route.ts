import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, organizations } from '@/lib/db';
import { eq, ne, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

// GET /api/copy-center/target-companies - Get all companies that can be used as targets for copying
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const excludeCompanyId = searchParams.get('excludeCompanyId'); // Prevent self-copy
    const organizationId = searchParams.get('organizationId'); // Filter by organization

    // Build where conditions
    let whereClause = eq(companies.isActive, true);

    if (excludeCompanyId && organizationId) {
      whereClause = and(
        eq(companies.isActive, true),
        ne(companies.id, excludeCompanyId),
        eq(companies.organizationId, organizationId)
      )!;
    } else if (excludeCompanyId) {
      whereClause = and(
        eq(companies.isActive, true),
        ne(companies.id, excludeCompanyId)
      )!;
    } else if (organizationId) {
      whereClause = and(
        eq(companies.isActive, true),
        eq(companies.organizationId, organizationId)
      )!;
    }

    // Get companies as potential targets
    const targetCompaniesList = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(companies.name);

    return NextResponse.json({
      success: true,
      data: targetCompaniesList,
    });
  } catch (error) {
    console.error('Target companies GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch target companies' },
      { status: 500 }
    );
  }
});