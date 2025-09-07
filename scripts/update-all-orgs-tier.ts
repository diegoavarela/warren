import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function updateAllOrganizationsTiers() {
  try {
    console.log('🔄 Updating all organizations to Advanced tier...');
    
    // First, let's see current organizations and their tiers
    const currentOrgs = await sql`
      SELECT id, name, tier, created_at
      FROM organizations 
      ORDER BY created_at DESC;
    `;
    
    console.log('\n📋 Current organizations:');
    currentOrgs.forEach(org => {
      console.log(`  - ${org.name}: ${org.tier}`);
    });
    
    // Update all organizations to 'advanced' tier
    const result = await sql`
      UPDATE organizations 
      SET tier = 'advanced', updated_at = NOW()
      WHERE tier != 'advanced'
      RETURNING id, name, tier;
    `;
    
    console.log(`\n✅ Successfully updated ${result.length} organizations to Advanced tier:`);
    result.forEach(org => {
      console.log(`  - ${org.name}: ${org.tier}`);
    });
    
    // Show the available tiers for reference
    const tiers = await sql`
      SELECT name, display_name, price_monthly 
      FROM tiers 
      WHERE is_active = true 
      ORDER BY sort_order;
    `;
    
    console.log('\n🎯 Available tiers:');
    tiers.forEach(tier => {
      console.log(`  - ${tier.name}: ${tier.display_name} - $${parseFloat(tier.price_monthly).toFixed(0)}/month`);
    });
    
    console.log('\n🎉 All organizations now have valid tier assignments!');
    
  } catch (error) {
    console.error('❌ Error updating organizations:', error);
  }
}

updateAllOrganizationsTiers();