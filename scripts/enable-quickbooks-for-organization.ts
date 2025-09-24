/**
 * Enable QuickBooks Integration Feature for Vortex Organization
 * This script adds the QuickBooks feature to the Vortex organization's tier
 */

// Direct database connection without server-only dependency
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/db/actual-schema.js';

// Initialize database connection directly
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function enableQuickBooksForOrganization() {
  try {
    console.log('🔍 Finding Vortex organization...');

    // Find the Vortex organization
    const vortexOrg = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.name, 'Vortex'))
      .limit(1);

    if (vortexOrg.length === 0) {
      console.error('❌ Vortex organization not found');
      return;
    }

    const organization = vortexOrg[0];
    console.log('✅ Found Vortex organization:', organization.id);

    // Find the QuickBooks feature
    console.log('🔍 Finding QuickBooks feature...');
    const quickbooksFeature = await db
      .select()
      .from(schema.featureFlags)
      .where(eq(schema.featureFlags.key, 'quickbooks_integration'))
      .limit(1);

    if (quickbooksFeature.length === 0) {
      console.error('❌ QuickBooks feature not found. Run seed-quickbooks-feature.ts first.');
      return;
    }

    const feature = quickbooksFeature[0];
    console.log('✅ Found QuickBooks feature:', feature.id);

    // Get the organization's current tier
    console.log('🔍 Getting organization tier...');
    const orgTier = await db
      .select()
      .from(schema.tiers)
      .where(eq(schema.tiers.id, organization.tierId!))
      .limit(1);

    if (orgTier.length === 0) {
      console.error('❌ Organization tier not found');
      return;
    }

    const tier = orgTier[0];
    console.log('✅ Found tier:', tier.name);

    // Check if QuickBooks is already enabled for this tier
    console.log('🔍 Checking if QuickBooks is already enabled...');
    const existingTierFeature = await db
      .select()
      .from(schema.tierFeatures)
      .where(eq(schema.tierFeatures.tierId, tier.id))
      .where(eq(schema.tierFeatures.featureFlagId, feature.id))
      .limit(1);

    if (existingTierFeature.length > 0) {
      console.log('✅ QuickBooks feature is already enabled for this tier!');
      return;
    }

    // Add QuickBooks feature to the tier
    console.log('🔧 Adding QuickBooks feature to tier...');
    await db.insert(schema.tierFeatures).values({
      tierId: tier.id,
      featureFlagId: feature.id,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Successfully enabled QuickBooks integration for Vortex organization!');
    console.log('🎉 You should now see the QuickBooks Settings button in the org-admin dashboard.');

  } catch (error) {
    console.error('❌ Error enabling QuickBooks feature:', error);
    process.exit(1);
  }
}

// Run the script
enableQuickBooksForOrganization()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });