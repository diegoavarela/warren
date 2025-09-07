/**
 * Seed script for default tiers
 * Run with: npx tsx scripts/seed-tiers.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import schema
import { tiers } from '../shared/db/actual-schema';

async function seedTiers() {
  console.log('🌱 Starting tier seeding...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  console.log('✅ Database connected');

  // Default tier configurations
  const defaultTiers = [
    {
      name: 'standard',
      displayName: 'Standard',
      description: 'Essential financial analytics for small teams',
      priceMonthly: '149.00',
      priceAnnual: '1490.00', // ~2 months free
      maxUsers: 3,
      setupHours: 4,
      aiCreditsMonthly: '0.00',
      customFeatureHours: 0,
      features: JSON.stringify([
        'pnl_dashboard',
        'cashflow_dashboard',
        'file_uploads',
        'export_pdf'
      ]),
      isActive: true,
      sortOrder: 1
    },
    {
      name: 'standard_plus',
      displayName: 'Standard+',
      description: 'Everything in Standard plus conversational AI',
      priceMonthly: '249.00',
      priceAnnual: '2490.00', // ~2 months free
      maxUsers: 5,
      setupHours: 6,
      aiCreditsMonthly: '10.00',
      customFeatureHours: 0,
      features: JSON.stringify([
        'pnl_dashboard',
        'cashflow_dashboard',
        'ai_chat',
        'file_uploads',
        'export_pdf',
        'export_excel'
      ]),
      isActive: true,
      sortOrder: 2
    },
    {
      name: 'advanced',
      displayName: 'Advanced',
      description: 'Full-featured solution with custom development support',
      priceMonthly: '399.00',
      priceAnnual: '3990.00', // ~2 months free
      maxUsers: 10,
      setupHours: null, // Unlimited
      aiCreditsMonthly: '20.00',
      customFeatureHours: 10,
      features: JSON.stringify([
        'pnl_dashboard',
        'cashflow_dashboard',
        'ai_chat',
        'file_uploads',
        'export_pdf',
        'export_excel',
        'advanced_analytics',
        'custom_reports',
        'multi_company',
        'api_access'
      ]),
      isActive: true,
      sortOrder: 3
    }
  ];

  try {
    // Check if tiers already exist
    const existingTiers = await db.select().from(tiers).limit(1);
    
    if (existingTiers.length > 0) {
      console.log('⚠️  Tiers already exist in database. Skipping seed.');
      console.log('   If you want to re-seed, please truncate the tiers table first.');
      return;
    }

    // Insert default tiers
    console.log('📝 Inserting default tiers...');
    
    for (const tier of defaultTiers) {
      console.log(`   Creating tier: ${tier.displayName}`);
      await db.insert(tiers).values(tier);
    }

    console.log('✅ Default tiers created successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Standard: $149/month, 3 users, P&L + Cash Flow');
    console.log('   • Standard+: $249/month, 5 users, + AI Chat ($10 credits)');
    console.log('   • Advanced: $399/month, 10 users, + Custom Features ($20 credits)');

  } catch (error) {
    console.error('❌ Error seeding tiers:', error);
    process.exit(1);
  }
}

// Always run the seeding
seedTiers()
  .then(() => {
    console.log('\n🎉 Tier seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tier seeding failed:', error);
    process.exit(1);
  });

export default seedTiers;