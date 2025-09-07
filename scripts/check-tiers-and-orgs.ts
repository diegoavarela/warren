#!/usr/bin/env tsx

/**
 * Script to check tier assignments for organizations and companies
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

async function checkTiersAndOrgs() {
  console.log('🔍 Checking tier assignments...\n');

  try {
    // Check what tiers exist
    console.log('📊 Available Tiers:');
    const allTiers = await db
      .select({
        id: tiers.id,
        name: tiers.name,
        displayName: tiers.displayName,
        aiCreditsMonthly: tiers.aiCreditsMonthly,
        maxUsers: tiers.maxUsers,
      })
      .from(tiers);

    allTiers.forEach(tier => {
      console.log(`   • ${tier.displayName} (${tier.name}): $${tier.aiCreditsMonthly}/month, ${tier.maxUsers} users`);
    });

    // Check organizations and their tier assignments
    console.log('\n🏛️ Organizations:');
    const allOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        tier: organizations.tier,
        isActive: organizations.isActive,
      })
      .from(organizations);

    allOrgs.forEach(org => {
      console.log(`   • ${org.name} (${org.id}): tier="${org.tier}", active=${org.isActive}`);
    });

    // Check companies and their tier assignments
    console.log('\n🏢 Companies:');
    const allCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        tierId: companies.tierId,
        aiCreditsBalance: companies.aiCreditsBalance,
        orgName: organizations.name,
        orgTier: organizations.tier,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id));

    allCompanies.forEach(company => {
      console.log(`   • ${company.name}:`);
      console.log(`     - Organization: ${company.orgName} (tier: ${company.orgTier})`);
      console.log(`     - Company tierId: ${company.tierId || 'NOT SET'}`);
      console.log(`     - AI Credits Balance: $${company.aiCreditsBalance || 0}`);
    });

  } catch (error) {
    console.error('❌ Error checking tiers and orgs:', error);
  }
}

if (require.main === module) {
  checkTiersAndOrgs();
}