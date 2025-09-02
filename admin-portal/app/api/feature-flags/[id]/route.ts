import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, eq, and, sql } from '@/lib/db';

// PUT /api/feature-flags/[id] - Update feature flag
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featureId = params.id;
    const body = await request.json();
    const {
      name,
      description,
      category = 'General',
      priceMonthly,
      priceDisplay,
      isPublic = true,
      isBaseline = false,
      requirements,
      setupTime,
      icon
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    // Check if feature exists
    const existingFeature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, featureId))
      .limit(1);

    if (existingFeature.length === 0) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    const currentFeature = existingFeature[0];

    // Update feature
    const [updatedFeature] = await db
      .update(featureFlags)
      .set({
        name,
        description: description || null,
        category,
        priceMonthly: priceMonthly !== undefined && priceMonthly !== null && priceMonthly !== '' ? parseFloat(priceMonthly) : null,
        priceDisplay: priceDisplay || null,
        isPublic,
        isBaseline,
        requirements: requirements || null,
        setupTime: setupTime || null,
        icon: icon || null,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, featureId))
      .returning();

    // Handle baseline feature changes
    if (isBaseline && !currentFeature.isBaseline) {
      // Feature became baseline - enable for all organizations
      const organizations = await db
        .select({ id: sql<string>`id` })
        .from(sql`organizations`);

      if (organizations.length > 0) {
        // Insert or update organization features
        for (const org of organizations) {
          await db
            .insert(organizationFeatures)
            .values({
              organizationId: org.id,
              featureId: featureId,
              enabled: true,
              enabledAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [organizationFeatures.organizationId, organizationFeatures.featureId],
              set: {
                enabled: true,
                enabledAt: new Date(),
                updatedAt: new Date(),
              }
            });
        }
      }
    } else if (!isBaseline && currentFeature.isBaseline) {
      // Feature is no longer baseline - this is dangerous, so we'll just warn in logs
    }

    return NextResponse.json({
      success: true,
      feature: updatedFeature
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    );
  }
}

// DELETE /api/feature-flags/[id] - Delete feature flag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featureId = params.id;

    // Check if feature exists
    const existingFeature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, featureId))
      .limit(1);

    if (existingFeature.length === 0) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    const feature = existingFeature[0];

    // Prevent deletion of baseline features
    if (feature.isBaseline) {
      return NextResponse.json(
        { error: 'Cannot delete baseline features' },
        { status: 400 }
      );
    }

    // Delete organization feature associations (cascade should handle this)
    await db
      .delete(organizationFeatures)
      .where(eq(organizationFeatures.featureId, featureId));

    // Delete the feature
    await db
      .delete(featureFlags)
      .where(eq(featureFlags.id, featureId));

    return NextResponse.json({
      success: true,
      message: 'Feature deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}