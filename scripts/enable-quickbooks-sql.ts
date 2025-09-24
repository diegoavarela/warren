/**
 * Enable QuickBooks Integration Feature for Vortex Organization
 * This script uses raw SQL to avoid the server-only dependency issue
 */

import { neon } from '@neondatabase/serverless';

async function enableQuickBooksForOrganization() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      return;
    }

    const sql = neon(process.env.DATABASE_URL);

    console.log('🔍 Finding Vortex organization...');

    // Find the Vortex organization
    const vortexOrg = await sql`
      SELECT id, name, "tierId" FROM organizations WHERE name = 'Vortex' LIMIT 1;
    `;

    if (vortexOrg.length === 0) {
      console.error('❌ Vortex organization not found');
      return;
    }

    const organization = vortexOrg[0];
    console.log('✅ Found Vortex organization:', organization.id);

    // Find the QuickBooks feature
    console.log('🔍 Finding QuickBooks feature...');
    const quickbooksFeature = await sql`
      SELECT id, key, name FROM feature_flags WHERE key = 'quickbooks_integration' LIMIT 1;
    `;

    if (quickbooksFeature.length === 0) {
      console.error('❌ QuickBooks feature not found. Run seed-quickbooks-feature.ts first.');
      return;
    }

    const feature = quickbooksFeature[0];
    console.log('✅ Found QuickBooks feature:', feature.id);

    // Get the organization's current tier
    console.log('🔍 Getting organization tier...');
    const orgTier = await sql`
      SELECT id, name FROM tiers WHERE id = ${organization.tierId} LIMIT 1;
    `;

    if (orgTier.length === 0) {
      console.error('❌ Organization tier not found');
      return;
    }

    const tier = orgTier[0];
    console.log('✅ Found tier:', tier.name);

    // Check if QuickBooks is already enabled for this tier
    console.log('🔍 Checking if QuickBooks is already enabled...');
    const existingTierFeature = await sql`
      SELECT id FROM tier_features
      WHERE "tierId" = ${tier.id} AND "featureFlagId" = ${feature.id}
      LIMIT 1;
    `;

    if (existingTierFeature.length > 0) {
      console.log('✅ QuickBooks feature is already enabled for this tier!');
      return;
    }

    // Add QuickBooks feature to the tier
    console.log('🔧 Adding QuickBooks feature to tier...');
    await sql`
      INSERT INTO tier_features ("tierId", "featureFlagId", "isEnabled", "createdAt", "updatedAt")
      VALUES (${tier.id}, ${feature.id}, true, NOW(), NOW());
    `;

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