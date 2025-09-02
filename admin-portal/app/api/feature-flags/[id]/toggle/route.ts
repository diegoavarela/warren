import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, eq, and } from '@/lib/db';

// POST /api/feature-flags/[id]/toggle - Toggle feature for specific organization
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featureId = params.id;
    const body = await request.json();
    const { organizationId, enabled } = body;

    if (!organizationId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Organization ID and enabled status are required' },
        { status: 400 }
      );
    }

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

    // Check if organization feature record exists
    const existingOrgFeature = await db
      .select()
      .from(organizationFeatures)
      .where(
        and(
          eq(organizationFeatures.organizationId, organizationId),
          eq(organizationFeatures.featureId, featureId)
        )
      )
      .limit(1);

    if (existingOrgFeature.length > 0) {
      // Update existing record
      const [updatedOrgFeature] = await db
        .update(organizationFeatures)
        .set({
          enabled,
          enabledAt: enabled ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organizationFeatures.organizationId, organizationId),
            eq(organizationFeatures.featureId, featureId)
          )
        )
        .returning();

      return NextResponse.json({
        success: true,
        organizationFeature: updatedOrgFeature
      });
    } else {
      // Create new record
      const [newOrgFeature] = await db
        .insert(organizationFeatures)
        .values({
          organizationId,
          featureId,
          enabled,
          enabledAt: enabled ? new Date() : null,
        })
        .returning();

      return NextResponse.json({
        success: true,
        organizationFeature: newOrgFeature
      });
    }
  } catch (error) {
    console.error('Error toggling feature:', error);
    return NextResponse.json(
      { error: 'Failed to toggle feature' },
      { status: 500 }
    );
  }
}