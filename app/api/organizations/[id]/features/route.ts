import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, eq, and, sql } from '@/shared/db';

// GET /api/organizations/[id]/features - Get all features for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;

    // Get all public features with organization access status using direct SQL for accuracy
    const features = await db.execute(sql`
      SELECT 
        f.id,
        f.key,
        f.name,
        f.description,
        f.category,
        f.price_monthly as "priceMonthly",
        f.price_display as "priceDisplay",
        f.is_public as "isPublic",
        f.is_baseline as "isBaseline",
        f.requirements,
        f.setup_time as "setupTime",
        f.icon,
        CASE 
          WHEN f.is_baseline = true THEN true
          WHEN of.enabled = true THEN true
          ELSE false
        END as enabled,
        of.enabled_at as "enabledAt"
      FROM feature_flags f
      LEFT JOIN organization_features of ON f.id = of.feature_id 
        AND of.organization_id = ${organizationId}
      WHERE f.is_public = true
      ORDER BY f.is_baseline DESC, f.name ASC
    `);

    const processedFeatures = features.rows;

    return NextResponse.json({
      success: true,
      features: processedFeatures
    });
  } catch (error) {
    console.error('Error fetching organization features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization features' },
      { status: 500 }
    );
  }
}