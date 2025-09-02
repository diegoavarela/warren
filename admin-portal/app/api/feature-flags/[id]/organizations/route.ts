import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, organizations, eq, sql } from '@/lib/db';

// GET /api/feature-flags/[id]/organizations - Get all organizations and their access status for this feature
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featureId = params.id;

    // Check if feature exists
    const feature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, featureId))
      .limit(1);

    if (feature.length === 0) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Get all organizations with their feature access status
    const orgFeatures = await db
      .select({
        id: sql<string>`COALESCE(${organizationFeatures.id}, gen_random_uuid())`,
        organizationId: organizations.id,
        organizationName: organizations.name,
        enabled: sql<boolean>`COALESCE(${organizationFeatures.enabled}, false)`,
        enabledAt: organizationFeatures.enabledAt,
        notes: organizationFeatures.notes,
      })
      .from(organizations)
      .leftJoin(
        organizationFeatures,
        sql`${organizations.id} = ${organizationFeatures.organizationId} 
            AND ${organizationFeatures.featureId} = ${featureId}`
      )
      .where(eq(organizations.isActive, true))
      .orderBy(organizations.name);

    return NextResponse.json({
      success: true,
      organizations: orgFeatures
    });
  } catch (error) {
    console.error('Error fetching organization features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization features' },
      { status: 500 }
    );
  }
}