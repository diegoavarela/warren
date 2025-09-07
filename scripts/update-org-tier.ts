import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function updateOrganizationTier() {
  try {
    console.log('Updating organization tier...');
    
    const result = await sql`
      UPDATE organizations 
      SET tier = 'advanced', updated_at = NOW()
      WHERE id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      RETURNING id, name, tier;
    `;
    
    console.log('✅ Successfully updated organization tier:', result[0]);
    
    // Also check what tiers are available
    const tiers = await sql`
      SELECT name, display_name, price_monthly 
      FROM tiers 
      WHERE is_active = true 
      ORDER BY sort_order;
    `;
    
    console.log('📋 Available tiers:', tiers);
    
  } catch (error) {
    console.error('❌ Error updating organization tier:', error);
  }
}

updateOrganizationTier();