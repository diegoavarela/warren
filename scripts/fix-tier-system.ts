import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function fixTierSystem() {
  try {
    console.log('🔧 Fixing tier system...');
    
    // Step 1: Drop the old constraint
    console.log('1️⃣  Dropping old tier constraint...');
    await sql`
      ALTER TABLE organizations 
      DROP CONSTRAINT IF EXISTS tier_values;
    `;
    
    // Step 2: Add new constraint with correct values
    console.log('2️⃣  Adding new tier constraint...');
    await sql`
      ALTER TABLE organizations 
      ADD CONSTRAINT tier_values 
      CHECK (tier IN ('standard', 'standard_plus', 'advanced'));
    `;
    
    // Step 3: Update existing organizations to new tier values
    console.log('3️⃣  Mapping existing organizations to new tier system...');
    
    // Map old tiers to new ones:
    // starter -> standard
    // professional -> standard_plus  
    // enterprise -> advanced
    
    const starterUpdate = await sql`
      UPDATE organizations 
      SET tier = 'standard', updated_at = NOW()
      WHERE tier = 'starter'
      RETURNING name, tier;
    `;
    
    const professionalUpdate = await sql`
      UPDATE organizations 
      SET tier = 'standard_plus', updated_at = NOW()
      WHERE tier = 'professional'
      RETURNING name, tier;
    `;
    
    const enterpriseUpdate = await sql`
      UPDATE organizations 
      SET tier = 'advanced', updated_at = NOW()
      WHERE tier = 'enterprise'
      RETURNING name, tier;
    `;
    
    console.log(`✅ Updated ${starterUpdate.length} organizations from 'starter' to 'standard'`);
    console.log(`✅ Updated ${professionalUpdate.length} organizations from 'professional' to 'standard_plus'`);
    console.log(`✅ Updated ${enterpriseUpdate.length} organizations from 'enterprise' to 'advanced'`);
    
    // Step 4: Verify all organizations now have valid tiers
    console.log('4️⃣  Verifying all organizations have valid tiers...');
    const allOrgs = await sql`
      SELECT name, tier
      FROM organizations 
      ORDER BY name;
    `;
    
    console.log('\n📋 Final organization tiers:');
    allOrgs.forEach(org => {
      console.log(`  - ${org.name}: ${org.tier}`);
    });
    
    // Step 5: Show available tiers for reference
    const tiers = await sql`
      SELECT name, display_name, price_monthly 
      FROM tiers 
      WHERE is_active = true 
      ORDER BY sort_order;
    `;
    
    console.log('\n🎯 Available tier options:');
    tiers.forEach(tier => {
      console.log(`  - ${tier.name}: ${tier.display_name} - $${parseFloat(tier.price_monthly).toFixed(0)}/month`);
    });
    
    console.log('\n🎉 Tier system fixed! All organizations now use the new tier system.');
    console.log('💡 The tier dropdown in the admin portal should now work correctly.');
    
  } catch (error) {
    console.error('❌ Error fixing tier system:', error);
  }
}

fixTierSystem();