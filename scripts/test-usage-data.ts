#!/usr/bin/env tsx

/**
 * Script to test the usage data API and see what values are being returned
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

async function testUsageData() {
  console.log('🔍 Testing usage data for Vortex organization...\n');

  try {
    // Get Vortex organization (where most companies are)
    const vortexOrg = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        tier: organizations.tier,
      })
      .from(organizations)
      .where(eq(organizations.name, 'Vortex'))
      .limit(1);

    if (vortexOrg.length === 0) {
      console.log('❌ Vortex organization not found');
      return;
    }

    const org = vortexOrg[0];
    console.log(`🏛️ Organization: ${org.name} (${org.id})`);
    console.log(`📊 Tier: ${org.tier}\n`);

    // Get tier info
    const tierInfo = await db
      .select({
        id: tiers.id,
        name: tiers.name,
        displayName: tiers.displayName,
        aiCreditsMonthly: tiers.aiCreditsMonthly,
        maxUsers: tiers.maxUsers,
      })
      .from(tiers)
      .where(eq(tiers.name, org.tier))
      .limit(1);

    if (tierInfo.length > 0) {
      const tier = tierInfo[0];
      console.log(`🎯 Tier Info:`);
      console.log(`   Name: ${tier.name}`);
      console.log(`   Display: ${tier.displayName}`);
      console.log(`   Max Users: ${tier.maxUsers}`);
      console.log(`   AI Credits/Month: $${tier.aiCreditsMonthly}\n`);
    }

    // Get companies in this organization
    const orgCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
        aiCreditsResetDate: companies.aiCreditsResetDate,
        tierName: tiers.name,
        monthlyCredits: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .leftJoin(tiers, eq(organizations.tier, tiers.name))
      .where(eq(companies.organizationId, org.id));

    console.log(`🏢 Companies in ${org.name}:`);
    
    let totalBalance = 0;
    let totalUsed = 0;

    orgCompanies.forEach(company => {
      const balance = parseFloat(company.aiCreditsBalance?.toString() || '0');
      const used = parseFloat(company.aiCreditsUsed?.toString() || '0');
      
      totalBalance += balance;
      totalUsed += used;
      
      console.log(`   • ${company.name}:`);
      console.log(`     Balance: $${balance}`);
      console.log(`     Used: $${used}`);
      console.log(`     Reset Date: ${company.aiCreditsResetDate || 'Not set'}`);
    });

    console.log(`\n📊 Aggregated Totals:`);
    console.log(`   Total Balance: $${totalBalance}`);
    console.log(`   Total Used: $${totalUsed}`);
    console.log(`   Organization Monthly Credits: $${tierInfo[0]?.aiCreditsMonthly || 0}`);

    // What the API should return
    const expectedResponse = {
      aiCredits: {
        balance: totalBalance,
        used: totalUsed,
        monthly: parseFloat(tierInfo[0]?.aiCreditsMonthly?.toString() || '0'),
      }
    };

    console.log(`\n🎯 Expected API Response:`);
    console.log(`   balance: $${expectedResponse.aiCredits.balance}`);
    console.log(`   used: $${expectedResponse.aiCredits.used}`);  
    console.log(`   monthly: $${expectedResponse.aiCredits.monthly}`);

  } catch (error) {
    console.error('❌ Error testing usage data:', error);
  }
}

if (require.main === module) {
  testUsageData();
}