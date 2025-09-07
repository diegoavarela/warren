import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const sql = neon(process.env.DATABASE_URL!);

async function createMissingTables() {
  try {
    console.log('Creating missing database tables...');

    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tiers', 'tier_features', 'ai_usage')
    `;
    
    const existingTableNames = existingTables.map(row => row.table_name);
    console.log('Existing tables:', existingTableNames);

    // Create tiers table if it doesn't exist
    if (!existingTableNames.includes('tiers')) {
      console.log('Creating tiers table...');
      await sql`
        CREATE TABLE IF NOT EXISTS "tiers" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" text NOT NULL UNIQUE,
          "display_name" text NOT NULL,
          "description" text,
          "price_monthly" decimal(10,2) NOT NULL DEFAULT 0,
          "price_annual" decimal(10,2) NOT NULL DEFAULT 0,
          "max_users" integer NOT NULL DEFAULT 1,
          "setup_hours" integer,
          "ai_credits_monthly" decimal(10,2) NOT NULL DEFAULT 0,
          "custom_feature_hours" integer NOT NULL DEFAULT 0,
          "features" jsonb DEFAULT '[]',
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" integer NOT NULL DEFAULT 0,
          "created_at" timestamp with time zone DEFAULT now(),
          "updated_at" timestamp with time zone DEFAULT now()
        )
      `;
      console.log('✅ Tiers table created');
    } else {
      console.log('✅ Tiers table already exists');
    }

    // Create tier_features table if it doesn't exist
    if (!existingTableNames.includes('tier_features')) {
      console.log('Creating tier_features table...');
      await sql`
        CREATE TABLE IF NOT EXISTS "tier_features" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "tier_id" uuid NOT NULL REFERENCES "tiers"("id") ON DELETE CASCADE,
          "feature_key" text NOT NULL,
          "created_at" timestamp with time zone DEFAULT now(),
          UNIQUE("tier_id", "feature_key")
        )
      `;
      console.log('✅ Tier features table created');
    } else {
      console.log('✅ Tier features table already exists');
    }

    // Create ai_usage table if it doesn't exist
    if (!existingTableNames.includes('ai_usage')) {
      console.log('Creating ai_usage table...');
      await sql`
        CREATE TABLE IF NOT EXISTS "ai_usage" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
          "company_id" uuid REFERENCES "companies"("id") ON DELETE CASCADE,
          "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "model" text NOT NULL,
          "prompt_tokens" integer NOT NULL DEFAULT 0,
          "completion_tokens" integer NOT NULL DEFAULT 0,
          "total_tokens" integer NOT NULL DEFAULT 0,
          "cost" decimal(10,6) NOT NULL DEFAULT 0,
          "created_at" timestamp with time zone DEFAULT now(),
          "month_year" text NOT NULL -- Format: "2024-01" for indexing
        )
      `;

      // Create index for efficient queries
      await sql`
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_org_month" ON "ai_usage" ("organization_id", "month_year")
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_company_month" ON "ai_usage" ("company_id", "month_year")
      `;

      console.log('✅ AI usage table created');
    } else {
      console.log('✅ AI usage table already exists');
    }

    console.log('✅ Database schema migration completed successfully');

    // Insert default tiers if none exist
    const tierCount = await sql`SELECT COUNT(*) as count FROM "tiers"`;
    if (parseInt(tierCount[0].count) === 0) {
      console.log('Inserting default tiers...');
      
      await sql`
        INSERT INTO "tiers" (
          "name", "display_name", "description", 
          "price_monthly", "price_annual", "max_users", 
          "setup_hours", "ai_credits_monthly", "custom_feature_hours",
          "features", "is_active", "sort_order"
        ) VALUES 
        (
          'standard', 'Standard', 'Basic tier with P&L and Cash Flow dashboards',
          49.00, 490.00, 5, 0, 0.00, 0,
          '["PNL_DASHBOARD", "CASHFLOW_DASHBOARD"]'::jsonb, true, 1
        ),
        (
          'standard_plus', 'Standard+', 'Enhanced tier with AI Chat capabilities',
          99.00, 990.00, 10, 0, 100.00, 0,
          '["PNL_DASHBOARD", "CASHFLOW_DASHBOARD", "AI_CHAT"]'::jsonb, true, 2
        ),
        (
          'advanced', 'Advanced', 'Full-featured tier with advanced analytics',
          199.00, 1990.00, 25, null, 250.00, 0,
          '["PNL_DASHBOARD", "CASHFLOW_DASHBOARD", "AI_CHAT", "EXECUTIVE_DASHBOARD", "ADVANCED_ANALYTICS"]'::jsonb, true, 3
        )
      `;
      console.log('✅ Default tiers inserted');
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

// Run the migration
createMissingTables();