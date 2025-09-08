#!/usr/bin/env tsx

/**
 * Script to test AI usage data persistence and the consumeAICredits function
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { organizations, companies, tiers, aiUsageLogs } from '../shared/db/actual-schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Simple version of consumeAICredits for testing
async function testConsumeAICredits(companyId: string, userId: string, creditsUsed: number) {
  try {
    // Get current values
    const currentCompany = await db
      .select({
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (currentCompany.length === 0) {
      throw new Error('Company not found');
    }

    const current = currentCompany[0];
    const newBalance = (parseFloat(current.aiCreditsBalance || '0') - creditsUsed);
    const newUsed = (parseFloat(current.aiCreditsUsed || '0') + creditsUsed);

    // Update company AI credits balance
    await db
      .update(companies)
      .set({
        aiCreditsBalance: newBalance.toFixed(6),
        aiCreditsUsed: newUsed.toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    // Log the usage
    await db.insert(aiUsageLogs).values({
      companyId,
      userId,
      creditsUsed: creditsUsed.toString(),
      promptTokens: 100,
      responseTokens: 150,
      totalTokens: 250,
      model: 'gpt-4o-mini',
      prompt: 'Test prompt for persistence verification',
      response: 'Test response for persistence verification',
      sessionId: 'test-session-' + Date.now(),
    });

    return true;
  } catch (error) {
    console.error('Error consuming AI credits:', error);
    return false;
  }
}

// Simple version of getAICreditsStatus for testing  
async function testGetAICreditsStatus(companyId: string) {
  try {
    const result = await db
      .select({
        balance: companies.aiCreditsBalance,
        used: companies.aiCreditsUsed,
        resetDate: companies.aiCreditsResetDate,
        monthlyCredits: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    if (result.length === 0) {
      return {
        balance: 0,
        used: 0,
        monthly: 0,
        resetDate: null,
      };
    }

    const data = result[0];
    const balance = parseFloat(data.balance?.toString() || '0');
    const used = parseFloat(data.used?.toString() || '0');
    const monthly = parseFloat(data.monthlyCredits?.toString() || '0');

    return {
      balance,
      used,
      monthly,
      resetDate: data.resetDate,
    };
  } catch (error) {
    console.error('Error getting AI credits status:', error);
    return {
      balance: 0,
      used: 0,
      monthly: 0,
      resetDate: null,
    };
  }
}

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

    // Test consumption if we have companies
    if (orgCompanies.length > 0) {
      const testCompany = orgCompanies[0];
      console.log(`\n🧪 Testing AI Credit Consumption for ${testCompany.name}...`);
      
      // Get initial status using our test function
      const initialStatus = await testGetAICreditsStatus(testCompany.id);
      console.log(`📋 Initial Status:`);
      console.log(`   Balance: $${initialStatus.balance.toFixed(6)}`);
      console.log(`   Used: $${initialStatus.used.toFixed(6)}`);
      console.log(`   Monthly: $${initialStatus.monthly.toFixed(2)}`);

      // Test a small consumption
      const testCost = 0.001234; // Small test cost
      console.log(`\n🔄 Testing consumeAICredits with cost: $${testCost.toFixed(6)}`);
      
      try {
        const consumeResult = await testConsumeAICredits(
          testCompany.id,
          'test-user-id-123',
          testCost
        );

        console.log(`✅ Consume result: ${consumeResult ? 'SUCCESS' : 'FAILED'}`);

        if (consumeResult) {
          // Check updated status
          const updatedStatus = await testGetAICreditsStatus(testCompany.id);
          console.log(`\n📋 Updated Status:`);
          console.log(`   Balance: $${updatedStatus.balance.toFixed(6)} (was $${initialStatus.balance.toFixed(6)})`);
          console.log(`   Used: $${updatedStatus.used.toFixed(6)} (was $${initialStatus.used.toFixed(6)})`);
          
          const balanceChange = initialStatus.balance - updatedStatus.balance;
          const usedChange = updatedStatus.used - initialStatus.used;
          
          console.log(`\n🔍 Changes:`);
          console.log(`   Balance decreased by: $${balanceChange.toFixed(6)} (expected: $${testCost.toFixed(6)})`);
          console.log(`   Used increased by: $${usedChange.toFixed(6)} (expected: $${testCost.toFixed(6)})`);
          
          const balanceCorrect = Math.abs(balanceChange - testCost) < 0.000001;
          const usedCorrect = Math.abs(usedChange - testCost) < 0.000001;
          
          console.log(`   Balance change correct: ${balanceCorrect ? '✅' : '❌'}`);
          console.log(`   Used change correct: ${usedCorrect ? '✅' : '❌'}`);
          
          if (balanceCorrect && usedCorrect) {
            console.log(`\n🎉 AI usage persistence is working correctly!`);
          } else {
            console.log(`\n⚠️  Issues detected with persistence calculations`);
          }
        }
      } catch (consumeError) {
        console.error(`❌ Error during consumption test:`, consumeError);
      }
    }

  } catch (error) {
    console.error('❌ Error testing usage data:', error);
  }
}

if (require.main === module) {
  testUsageData();
}