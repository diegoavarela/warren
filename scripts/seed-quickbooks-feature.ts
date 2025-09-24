/**
 * Seed QuickBooks Integration Feature Flag
 *
 * This script adds the QuickBooks integration as a feature flag that can be
 * enabled/disabled per organization through the admin portal
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { featureFlags } from '../warren/lib/db/actual-schema.js';
import { eq } from 'drizzle-orm';
import * as schema from '../warren/lib/db/actual-schema.js';
import 'dotenv/config';

async function seedQuickBooksFeature() {
  console.log('🔍 [QuickBooks Feature] Starting to seed QuickBooks feature flag...');

  // Initialize database connection
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  try {
    // Check if QuickBooks feature already exists
    const existingFeature = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, 'quickbooks_integration'))
      .limit(1);

    if (existingFeature.length > 0) {
      console.log('✅ [QuickBooks Feature] Feature flag already exists:', existingFeature[0].id);
      return existingFeature[0];
    }

    // Create the QuickBooks integration feature flag
    const newFeature = await db
      .insert(featureFlags)
      .values({
        key: 'quickbooks_integration',
        name: 'QuickBooks Integration',
        description: 'Connect companies to QuickBooks for real-time financial data import and live P&L reports. Includes OAuth connection management, automatic data synchronization, and comparison analytics.',
        category: 'Integrations',
        priceMonthly: '29.99',
        priceDisplay: '$29.99/month per organization',
        isPublic: true,
        isBaseline: false,
        isActive: true,
        requirements: 'QuickBooks Online account with API access. Organization admin privileges required for initial setup.',
        setupTime: '5-10 minutes',
        icon: 'BanknotesIcon',
        screenshots: [
          {
            title: 'QuickBooks Connection',
            description: 'Simple one-click connection to your QuickBooks Online account',
            url: '/images/features/quickbooks-connect.png'
          },
          {
            title: 'Live P&L Dashboard',
            description: 'Real-time profit & loss data with comparison analytics',
            url: '/images/features/quickbooks-pnl.png'
          },
          {
            title: 'Company Management',
            description: 'Manage QuickBooks connections across all your companies',
            url: '/images/features/quickbooks-management.png'
          }
        ]
      })
      .returning();

    console.log('✅ [QuickBooks Feature] Successfully created QuickBooks feature flag:', newFeature[0].id);

    return newFeature[0];

  } catch (error) {
    console.error('❌ [QuickBooks Feature] Error seeding feature flag:', error);
    throw error;
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuickBooksFeature()
    .then((feature) => {
      console.log('🎉 [QuickBooks Feature] Seeding completed successfully!');
      console.log('📊 [QuickBooks Feature] Feature details:', {
        id: feature.id,
        key: feature.key,
        name: feature.name,
        category: feature.category,
        price: feature.priceDisplay
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [QuickBooks Feature] Seeding failed:', error);
      process.exit(1);
    });
}

export { seedQuickBooksFeature };