/**
 * Update tier features to match requirements:
 * - Standard: P&L Dashboard + Cash Flow Dashboard only
 * - Standard+: P&L + Cash Flow + AI Chat
 * - Advanced: All three plus additional features
 * 
 * Also fixes case mismatch between tier features and feature flags
 */

import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function updateTierFeatures() {
  console.log('🔄 Updating tier features...');
  
  try {
    // Define the correct features for each tier using UPPERCASE to match feature flags
    const tierUpdates = [
      {
        name: 'standard',
        displayName: 'Standard',
        features: [
          'PNL_DASHBOARD',      // P&L Dashboard
          'CASHFLOW_DASHBOARD'  // Cash Flow Dashboard
        ]
      },
      {
        name: 'standard_plus',
        displayName: 'Standard+',
        features: [
          'PNL_DASHBOARD',      // P&L Dashboard
          'CASHFLOW_DASHBOARD', // Cash Flow Dashboard
          'AI_CHAT'            // AI Financial Chat
        ]
      },
      {
        name: 'advanced',
        displayName: 'Advanced',
        features: [
          'PNL_DASHBOARD',      // P&L Dashboard
          'CASHFLOW_DASHBOARD', // Cash Flow Dashboard
          'AI_CHAT',           // AI Financial Chat
          'ADVANCED_EXPORT',   // Advanced Export Options
          'API_ACCESS',        // API Access
          'CUSTOM_BRANDING',   // Custom Branding
          'FINANCIAL_MANUAL'   // Financial Manual
        ]
      }
    ];
    
    // Update each tier
    for (const tier of tierUpdates) {
      console.log(`\n📝 Updating ${tier.displayName}...`);
      console.log(`   Features: ${tier.features.join(', ')}`);
      
      const result = await sql`
        UPDATE tiers 
        SET 
          features = ${JSON.stringify(tier.features)},
          updated_at = NOW()
        WHERE name = ${tier.name}
        RETURNING name, display_name, features;
      `;
      
      if (result.length > 0) {
        console.log(`   ✅ Updated successfully`);
      } else {
        console.log(`   ⚠️  Tier '${tier.name}' not found`);
      }
    }
    
    // Verify the updates
    console.log('\n📊 Verifying updated tier features:');
    const tiers = await sql`
      SELECT name, display_name, features
      FROM tiers
      WHERE is_active = true
      ORDER BY sort_order;
    `;
    
    for (const tier of tiers) {
      let features;
      try {
        features = JSON.parse(tier.features);
      } catch (error) {
        // Handle case where features might be stored as plain string or invalid JSON
        console.log(`⚠️  Invalid JSON in tier ${tier.name}:`, tier.features);
        console.log(`   Skipping verification for this tier`);
        continue;
      }
      
      console.log(`\n${tier.display_name} (${tier.name}):`);
      
      // Get feature names for display
      for (const featureKey of features) {
        const featureInfo = await sql`
          SELECT name FROM feature_flags 
          WHERE key = ${featureKey}
          LIMIT 1;
        `;
        
        if (featureInfo.length > 0) {
          console.log(`  ✓ ${featureKey} - ${featureInfo[0].name}`);
        } else {
          console.log(`  ⚠️  ${featureKey} - Feature flag not found`);
        }
      }
    }
    
    console.log('\n✅ Tier features updated successfully!');
    console.log('💡 The checkboxes in the tier management UI should now display correctly.');
    
  } catch (error) {
    console.error('❌ Error updating tier features:', error);
    process.exit(1);
  }
}

// Run the update
updateTierFeatures()
  .then(() => {
    console.log('\n🎉 Update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error);
    process.exit(1);
  });