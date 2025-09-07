#!/usr/bin/env tsx

/**
 * Script to check and fix AI credits for companies
 * Sets proper initial balance and monthly credits based on tier
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { companies, tiers } from '../shared/db/actual-schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function fixAICredits() {
  console.log('🔍 Checking AI credits for all companies...');

  try {
    // Get all companies with their tier information
    const companiesWithTiers = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        tierId: companies.tierId,
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
        aiCreditsResetDate: companies.aiCreditsResetDate,
        tierName: tiers.name,
        tierMonthlyCredits: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
      .where(eq(companies.isActive, true));

    console.log(`\n📊 Found ${companiesWithTiers.length} active companies`);

    for (const company of companiesWithTiers) {
      console.log(`\n🏢 Company: ${company.name} (${company.id})`);
      console.log(`   Tier: ${company.tierName || 'No tier'}`);
      console.log(`   Current Balance: $${company.aiCreditsBalance || 0}`);
      console.log(`   Used: $${company.aiCreditsUsed || 0}`);
      console.log(`   Monthly Credits: $${company.tierMonthlyCredits || 0}`);
      console.log(`   Reset Date: ${company.aiCreditsResetDate || 'Not set'}`);

      // Fix companies with no balance but have monthly credits from tier
      if (company.tierMonthlyCredits && (!company.aiCreditsBalance || company.aiCreditsBalance === 0)) {
        const monthlyCredits = parseFloat(company.tierMonthlyCredits.toString());
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        nextResetDate.setDate(1); // First of next month

        console.log(`   ✅ Setting balance to monthly credits: $${monthlyCredits}`);

        await db
          .update(companies)
          .set({
            aiCreditsBalance: monthlyCredits,
            aiCreditsResetDate: nextResetDate,
            aiCreditsUsed: 0,
          })
          .where(eq(companies.id, company.id));

        console.log(`   💰 Updated balance to $${monthlyCredits}`);
      }
    }

    console.log('\n✅ AI credits fix completed!');

  } catch (error) {
    console.error('❌ Error fixing AI credits:', error);
  }
}

if (require.main === module) {
  fixAICredits();
}