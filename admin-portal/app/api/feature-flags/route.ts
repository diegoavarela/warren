import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, eq, count, sql } from '@/shared/db';

// GET /api/feature-flags - List all feature flags with usage statistics
// Query parameters:
// - includeOrganizations=true: Include detailed organization list
// - featureId=xxx: Filter to specific feature (when includeOrganizations=true)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeOrganizations = searchParams.get('includeOrganizations') === 'true';
    const featureId = searchParams.get('featureId');

    // Fetch features with organization count using direct SQL for accuracy
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
        f.is_active as "isActive",
        f.requirements,
        f.setup_time as "setupTime",
        f.icon,
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        COALESCE(
          (SELECT COUNT(*)::int FROM organization_features of 
           WHERE of.feature_id = f.id AND of.enabled = true), 
          0
        ) as "organizationCount"
      FROM feature_flags f
      ${featureId ? sql`WHERE f.id = ${featureId}` : sql``}
      ORDER BY f.is_baseline DESC, f.name ASC
    `);

    const result: any = {
      success: true,
      features: features.rows
    };

    // If organizations are requested, fetch detailed organization data
    if (includeOrganizations) {
      const targetFeatureId = featureId || features.rows[0]?.id;
      
      if (targetFeatureId) {
        const organizations = await db.execute(sql`
          SELECT 
            o.id as "organizationId",
            o.name as "organizationName",
            COALESCE(of.enabled, false) as enabled,
            of.enabled_at as "enabledAt",
            of.notes,
            COALESCE(of.id, gen_random_uuid()) as id
          FROM organizations o
          LEFT JOIN organization_features of ON o.id = of.organization_id 
            AND of.feature_id = ${targetFeatureId}
          WHERE o.is_active = true
          ORDER BY o.name ASC
        `);

        result.organizations = {
          [targetFeatureId]: organizations.rows
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

// POST /api/feature-flags - Create new feature flag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      key,
      name,
      description,
      category = 'General',
      priceMonthly,
      priceDisplay,
      isPublic = true,
      isBaseline = false,
      requirements,
      setupTime,
      icon = 'FlagIcon'
    } = body;

    // Validate required fields
    if (!key || !name) {
      return NextResponse.json(
        { error: 'Feature key and name are required' },
        { status: 400 }
      );
    }

    // Validate key format (uppercase, underscore separated)
    const keyPattern = /^[A-Z][A-Z0-9_]*$/;
    if (!keyPattern.test(key)) {
      return NextResponse.json(
        { error: 'Feature key must be uppercase with underscores (e.g., AI_CHAT)' },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existingFeature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    if (existingFeature.length > 0) {
      return NextResponse.json(
        { error: 'Feature key already exists' },
        { status: 409 }
      );
    }

    // Create new feature
    const [newFeature] = await db
      .insert(featureFlags)
      .values({
        key,
        name,
        description: description || null,
        category,
        priceMonthly: priceMonthly !== undefined && priceMonthly !== null && priceMonthly !== '' ? parseFloat(priceMonthly) : null,
        priceDisplay: priceDisplay || null,
        isPublic,
        isBaseline,
        isActive: true,
        requirements: requirements || null,
        setupTime: setupTime || null,
        icon: icon || null,
      })
      .returning();

    // If this is a baseline feature, enable it for all existing organizations
    if (isBaseline) {
      // Get all organizations
      const organizations = await db
        .select({ id: sql<string>`id` })
        .from(sql`organizations`);

      // Enable for all organizations
      if (organizations.length > 0) {
        const orgFeatures = organizations.map((org: any) => ({
          organizationId: org.id,
          featureId: newFeature.id,
          enabled: true,
          enabledAt: new Date(),
        }));

        await db
          .insert(organizationFeatures)
          .values(orgFeatures);
      }
    }

    return NextResponse.json({
      success: true,
      feature: newFeature
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      { error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}