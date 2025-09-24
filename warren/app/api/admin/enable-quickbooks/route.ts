import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/db/index';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Enabling QuickBooks feature for organization...');

    const {
      db,
      organizations,
      tiers,
      tierFeatures,
      featureFlags,
      eq
    } = await getDatabase();

    // Find the Vortex organization
    console.log('🔍 Finding Vortex organization...');
    const vortexOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, 'Vortex'))
      .limit(1);

    if (vortexOrg.length === 0) {
      return NextResponse.json({ error: 'Vortex organization not found' }, { status: 404 });
    }

    const organization = vortexOrg[0];
    console.log('✅ Found Vortex organization:', organization.id);

    // Find the QuickBooks feature
    console.log('🔍 Finding QuickBooks feature...');
    const quickbooksFeature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, 'quickbooks_integration'))
      .limit(1);

    if (quickbooksFeature.length === 0) {
      return NextResponse.json({ error: 'QuickBooks feature not found' }, { status: 404 });
    }

    const feature = quickbooksFeature[0];
    console.log('✅ Found QuickBooks feature:', feature.id);

    // Get the organization's current tier
    console.log('🔍 Getting organization tier...');
    const orgTier = await db
      .select()
      .from(tiers)
      .where(eq(tiers.id, organization.tierId!))
      .limit(1);

    if (orgTier.length === 0) {
      return NextResponse.json({ error: 'Organization tier not found' }, { status: 404 });
    }

    const tier = orgTier[0];
    console.log('✅ Found tier:', tier.name);

    // Check if QuickBooks is already enabled for this tier
    console.log('🔍 Checking if QuickBooks is already enabled...');
    const existingTierFeature = await db
      .select()
      .from(tierFeatures)
      .where(eq(tierFeatures.tierId, tier.id))
      .where(eq(tierFeatures.featureFlagId, feature.id))
      .limit(1);

    if (existingTierFeature.length > 0) {
      console.log('✅ QuickBooks feature is already enabled for this tier!');
      return NextResponse.json({
        success: true,
        message: 'QuickBooks feature is already enabled for this tier!'
      });
    }

    // Add QuickBooks feature to the tier
    console.log('🔧 Adding QuickBooks feature to tier...');
    await db.insert(tierFeatures).values({
      tierId: tier.id,
      featureFlagId: feature.id,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Successfully enabled QuickBooks integration for Vortex organization!');

    return NextResponse.json({
      success: true,
      message: 'QuickBooks integration enabled successfully! Refresh the page to see the QuickBooks Settings button.'
    });

  } catch (error) {
    console.error('❌ Error enabling QuickBooks feature:', error);
    return NextResponse.json(
      { error: 'Failed to enable QuickBooks feature', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}