import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { organizations, users, companies } from '@/shared/db/actual-schema';
import { eq, count, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/organizations - List all organizations with stats
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Get organizations with user and company counts
    const orgList = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        subdomain: organizations.subdomain,
        tier: organizations.tier,
        locale: organizations.locale,
        baseCurrency: organizations.baseCurrency,
        timezone: organizations.timezone,
        fiscalYearStart: organizations.fiscalYearStart,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .orderBy(organizations.createdAt);

    // Get counts for each organization
    const orgsWithStats = await Promise.all(
      orgList.map(async (org) => {
        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.organizationId, org.id));

        const [companyCount] = await db
          .select({ count: count() })
          .from(companies)
          .where(eq(companies.organizationId, org.id));

        return {
          ...org,
          userCount: userCount.count || 0,
          companyCount: companyCount.count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: orgsWithStats,
    });
  } catch (error) {
    console.error('Organizations GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
});

// POST /api/organizations - Create new organization
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const { name, subdomain, tier, locale, baseCurrency, timezone, fiscalYearStart } = data;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists (if provided)
    if (subdomain) {
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.subdomain, subdomain))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Subdomain already exists' },
          { status: 409 }
        );
      }
    }

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name,
        subdomain: subdomain || null,
        tier: tier || 'starter',
        locale: locale || 'en-US',
        baseCurrency: baseCurrency || 'USD',
        timezone: timezone || 'UTC',
        fiscalYearStart: fiscalYearStart || 1,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newOrg,
    });
  } catch (error) {
    console.error('Organizations POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }
});