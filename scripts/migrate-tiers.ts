/**
 * Migration script to create tiers table and update companies table
 * Run with: npx tsx scripts/migrate-tiers.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runTiersMigration() {
  console.log('🔧 Starting tiers table migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const neonSql = neon(process.env.DATABASE_URL);
  const db = drizzle(neonSql);

  try {
    // Create tiers table
    console.log('📝 Creating tiers table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL,
        price_annual DECIMAL(10,2) NOT NULL,
        max_users INTEGER NOT NULL,
        setup_hours INTEGER,
        ai_credits_monthly DECIMAL(10,2) DEFAULT 0,
        custom_feature_hours INTEGER DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tiers table created');

    // Add tier and AI credit fields to companies table
    console.log('📝 Adding tier and AI credit fields to companies table...');
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES tiers(id),
      ADD COLUMN IF NOT EXISTS ai_credits_balance DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_credits_used DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_credits_reset_date TIMESTAMPTZ
    `);
    console.log('✅ Companies table updated');

    // Create ai_usage_logs table
    console.log('📝 Creating ai_usage_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model VARCHAR(100) NOT NULL,
        tokens_input INTEGER NOT NULL,
        tokens_output INTEGER NOT NULL,
        cost_usd DECIMAL(12,8) NOT NULL,
        credits_used DECIMAL(10,2) NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        request_data JSONB,
        response_data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AI usage logs table created');

    // Create indexes for performance
    console.log('📝 Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_companies_tier_id ON companies(tier_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_id ON ai_usage_logs(company_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at)`);
    console.log('✅ Indexes created');

    console.log('\n✅ Tiers migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Always run the migration
runTiersMigration()
  .then(() => {
    console.log('\n🎉 Tiers migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tiers migration failed:', error);
    process.exit(1);
  });

export default runTiersMigration;