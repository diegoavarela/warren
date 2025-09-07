import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkTierConstraint() {
  try {
    console.log('🔍 Checking tier constraint...');
    
    // Check the constraint details
    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'organizations' 
      AND conname = 'tier_values';
    `;
    
    console.log('📋 Current tier constraint:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    // Show available tiers in tiers table
    const tiers = await sql`
      SELECT name, display_name, is_active 
      FROM tiers 
      ORDER BY sort_order;
    `;
    
    console.log('\n🎯 Available tiers in tiers table:');
    tiers.forEach(tier => {
      console.log(`  - ${tier.name} (${tier.display_name}) - Active: ${tier.is_active}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking constraint:', error);
  }
}

checkTierConstraint();