#!/usr/bin/env tsx

/**
 * Script to fix AI credits - should be per organization, not per company
 * Organizations share their tier's monthly credits across all companies
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

async function fixOrgCredits() {
  console.log('🔍 Fixing AI credits to be per organization, not per company...\n');

  try {
    // Get all active organizations with their tiers
    const orgsWithTiers = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgTier: organizations.tier,
        isActive: organizations.isActive,
        tierName: tiers.name,
        tierMonthlyCredits: tiers.aiCreditsMonthly,
        tierDisplayName: tiers.displayName,
      })
      .from(organizations)
      .leftJoin(tiers, eq(organizations.tier, tiers.name))
      .where(eq(organizations.isActive, true));

    console.log(`📊 Found ${orgsWithTiers.length} active organizations\n`);

    for (const org of orgsWithTiers) {
      console.log(`🏛️ Organization: ${org.orgName}`);
      console.log(`   Tier: ${org.tierDisplayName} (${org.tierMonthlyCredits || 0} credits/month)`);

      if (!org.tierMonthlyCredits || parseFloat(org.tierMonthlyCredits.toString()) <= 0) {
        console.log(`   ⚠️  No AI credits in this tier, skipping\n`);
        continue;
      }

      // Get companies in this organization
      const orgCompanies = await db
        .select({
          id: companies.id,
          name: companies.name,
          aiCreditsBalance: companies.aiCreditsBalance,
        })
        .from(companies)
        .where(eq(companies.organizationId, org.orgId));

      console.log(`   📋 Companies: ${orgCompanies.length}`);

      const monthlyCredits = parseFloat(org.tierMonthlyCredits.toString());
      
      if (orgCompanies.length === 0) {
        console.log(`   ⚠️  No companies in this organization\n`);
        continue;
      }

      // Strategy: Give ALL credits to the FIRST company, zero out the rest
      // This way the organization has exactly the tier amount, not multiplied
      console.log(`\n   🎯 Strategy: Assign all $${monthlyCredits} credits to first company only`);
      
      for (let i = 0; i < orgCompanies.length; i++) {
        const company = orgCompanies[i];
        const currentBalance = parseFloat(company.aiCreditsBalance?.toString() || '0');
        
        if (i === 0) {
          // First company gets all the organization's credits
          console.log(`   ✅ ${company.name}: Setting to $${monthlyCredits} (primary)`);
          
          const nextResetDate = new Date();
          nextResetDate.setMonth(nextResetDate.getMonth() + 1);
          nextResetDate.setDate(1);
          nextResetDate.setHours(0, 0, 0, 0);

          await db
            .update(companies)
            .set({
              aiCreditsBalance: monthlyCredits.toString(),
              aiCreditsUsed: '0',
              aiCreditsResetDate: nextResetDate,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, company.id));
        } else {
          // Other companies get $0 (they share from the first company's pool)
          console.log(`   🔄 ${company.name}: Setting to $0 (shares from primary)`);
          
          await db
            .update(companies)
            .set({
              aiCreditsBalance: '0',
              aiCreditsUsed: '0',
              aiCreditsResetDate: null,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, company.id));
        }
      }

      console.log(`   💰 Organization total: $${monthlyCredits} (correct tier amount)\n`);
    }

    console.log('✅ Organization-level credit assignment completed!');

  } catch (error) {
    console.error('❌ Error fixing organization credits:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixOrgCredits()
    .then(() => {
      console.log('\n🎉 Organization credits fixed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default fixOrgCredits;