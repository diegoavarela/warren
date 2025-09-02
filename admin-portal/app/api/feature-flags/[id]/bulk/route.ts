import { NextRequest, NextResponse } from 'next/server';
import { db, featureFlags, organizationFeatures, organizations, eq, sql } from '@/lib/db';

// POST /api/feature-flags/[id]/bulk - Enable/disable feature for all organizations
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const featureId = params.id;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled status is required' },
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

    // Get all active organizations
    const allOrganizations = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.isActive, true));

    if (allOrganizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No organizations to update'
      });
    }

    // Bulk update/insert organization features
    let updatedCount = 0;
    let createdCount = 0;

    for (const org of allOrganizations) {
      // Check if record exists
      const existingRecord = await db
        .select()
        .from(organizationFeatures)
        .where(
          sql`${organizationFeatures.organizationId} = ${org.id} 
              AND ${organizationFeatures.featureId} = ${featureId}`
        )
        .limit(1);

      if (existingRecord.length > 0) {
        // Update existing record
        await db
          .update(organizationFeatures)
          .set({
            enabled,
            enabledAt: enabled ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(
            sql`${organizationFeatures.organizationId} = ${org.id} 
                AND ${organizationFeatures.featureId} = ${featureId}`
          );
        updatedCount++;
      } else {
        // Create new record
        await db
          .insert(organizationFeatures)
          .values({
            organizationId: org.id,
            featureId: featureId,
            enabled,
            enabledAt: enabled ? new Date() : null,
          });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${enabled ? 'enabled' : 'disabled'} for all organizations`,
      updated: updatedCount,
      created: createdCount,
      total: updatedCount + createdCount
    });
  } catch (error) {
    console.error('Error bulk updating feature:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update feature' },
      { status: 500 }
    );
  }
}