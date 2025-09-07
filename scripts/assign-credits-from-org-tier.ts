#!/usr/bin/env tsx

/**
 * Script to assign AI credits to companies based on their organization's tier
 * Companies inherit their AI credits from their organization's tier
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { organizations, companies, tiers } from '../shared/db/actual-schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function assignCreditsFromOrgTier() {
  console.log('🔍 Assigning AI credits based on organization tiers...\n');

  try {
    // Get all companies with their organization tier information
    const companiesWithOrgTiers = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        currentBalance: companies.aiCreditsBalance,
        currentUsed: companies.aiCreditsUsed,
        currentResetDate: companies.aiCreditsResetDate,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
        organizationTier: organizations.tier,
        isOrgActive: organizations.isActive,
        tierName: tiers.name,
        tierMonthlyCredits: tiers.aiCreditsMonthly,
        tierDisplayName: tiers.displayName,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .leftJoin(tiers, eq(organizations.tier, tiers.name))
      .where(eq(companies.isActive, true));

    console.log(`📊 Found ${companiesWithOrgTiers.length} active companies\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const company of companiesWithOrgTiers) {
      console.log(`🏢 Company: ${company.companyName}`);
      console.log(`   Organization: ${company.organizationName} (tier: ${company.organizationTier})`);
      console.log(`   Current Balance: $${company.currentBalance || 0}`);
      console.log(`   Current Used: $${company.currentUsed || 0}`);
      console.log(`   Tier Monthly Credits: $${company.tierMonthlyCredits || 0}`);

      // Only update companies with $0 balance and valid tier info
      const currentBalance = parseFloat(company.currentBalance?.toString() || '0');
      const monthlyCredits = parseFloat(company.tierMonthlyCredits?.toString() || '0');

      if (!company.isOrgActive) {
        console.log(`   ⚠️  Organization inactive, skipping`);
        skippedCount++;
      } else if (!company.tierMonthlyCredits) {
        console.log(`   ⚠️  No tier found or no monthly credits, skipping`);
        skippedCount++;
      } else if (currentBalance > 0) {
        console.log(`   ⚠️  Already has balance ($${currentBalance}), skipping`);
        skippedCount++;
      } else if (monthlyCredits <= 0) {
        console.log(`   ⚠️  Tier has $0 monthly credits, skipping`);
        skippedCount++;
      } else {
        // Calculate next reset date (first of next month)
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        nextResetDate.setDate(1);
        nextResetDate.setHours(0, 0, 0, 0);

        console.log(`   ✅ Setting balance to $${monthlyCredits}`);
        console.log(`   📅 Setting reset date to ${nextResetDate.toDateString()}`);

        await db
          .update(companies)
          .set({
            aiCreditsBalance: monthlyCredits.toString(),
            aiCreditsUsed: '0',
            aiCreditsResetDate: nextResetDate,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, company.companyId));

        console.log(`   💰 Updated balance to $${monthlyCredits}`);
        updatedCount++;
      }

      console.log(''); // Empty line for readability
    }

    console.log('✅ Credit assignment completed!');
    console.log(`📊 Summary:`);
    console.log(`   • ${updatedCount} companies updated with new credits`);
    console.log(`   • ${skippedCount} companies skipped (already have balance, inactive org, or no tier)`);
    console.log(`   • ${companiesWithOrgTiers.length} total companies processed`);

  } catch (error) {
    console.error('❌ Error assigning credits from org tiers:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  assignCreditsFromOrgTier()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default assignCreditsFromOrgTier;