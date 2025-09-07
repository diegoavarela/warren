#!/usr/bin/env npx tsx

/**
 * Test script for credit reset functionality
 * Tests both the library function and the cron endpoint
 */

import { db, eq } from '../shared/db';
import { companies, tiers } from '../shared/db/actual-schema';
import { resetAICredits, getAIUsageStats } from '../warren/lib/ai-credits';

async function main() {
  console.log('🧪 Testing Credit Reset Functionality\n');

  try {
    // Find a test company
    console.log('1. Finding a test company...');
    const testCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        currentBalance: companies.aiCreditsBalance,
        resetDate: companies.aiCreditsResetDate,
        tierId: companies.tierId,
        tierName: tiers.name,
        monthlyCredits: tiers.aiCreditsPerMonth,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
      .where(eq(companies.isActive, true))
      .limit(3);

    if (testCompanies.length === 0) {
      console.log('❌ No active companies found for testing');
      return;
    }

    const company = testCompanies[0];
    console.log(`✅ Testing with company: ${company.name}`);
    console.log(`   Current balance: $${company.currentBalance}`);
    console.log(`   Tier: ${company.tierName} (${company.monthlyCredits} credits/month)`);
    console.log(`   Reset date: ${company.resetDate}\n`);

    // Test the library function
    console.log('2. Testing resetAICredits library function...');
    const resetResult = await resetAICredits(company.id);
    
    if (resetResult.success) {
      console.log('✅ Credit reset successful!');
      console.log(`   Previous balance: $${resetResult.previousBalance}`);
      console.log(`   New balance: $${resetResult.newBalance}\n`);
    } else {
      console.log('❌ Credit reset failed:', resetResult.error);
      return;
    }

    // Get updated company data
    console.log('3. Verifying reset results...');
    const updatedCompany = await db
      .select({
        balance: companies.aiCreditsBalance,
        used: companies.aiCreditsUsed,
        resetDate: companies.aiCreditsResetDate,
      })
      .from(companies)
      .where(eq(companies.id, company.id))
      .limit(1);

    if (updatedCompany.length > 0) {
      const updated = updatedCompany[0];
      console.log('✅ Company data updated:');
      console.log(`   New balance: $${updated.balance}`);
      console.log(`   Used credits: $${updated.used}`);
      console.log(`   Next reset date: ${updated.resetDate}\n`);
    }

    // Test usage statistics
    console.log('4. Testing AI usage statistics...');
    const usageStats = await getAIUsageStats(company.id);
    console.log('✅ Usage stats retrieved:');
    console.log(`   Today: $${usageStats.today.toFixed(2)}`);
    console.log(`   This week: $${usageStats.thisWeek.toFixed(2)}`);
    console.log(`   This month: $${usageStats.thisMonth.toFixed(2)}`);
    console.log(`   Total queries: ${usageStats.totalQueries}`);
    console.log(`   Average per query: $${usageStats.averagePerQuery.toFixed(3)}`);
    console.log(`   Most used model: ${usageStats.mostUsedModel || 'N/A'}\n`);

    // Test cron endpoint (if in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('5. Testing cron endpoint...');
      try {
        const response = await fetch('http://localhost:3000/api/cron/reset-credits', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Cron endpoint test successful:');
          console.log(`   Total companies: ${result.summary?.totalCompanies || 0}`);
          console.log(`   Successful resets: ${result.summary?.successfulResets || 0}`);
          console.log(`   Errors: ${result.summary?.errors || 0}`);
        } else {
          console.log('❌ Cron endpoint test failed:', response.status);
        }
      } catch (error) {
        console.log('⚠️ Could not test cron endpoint (server may not be running):', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log('\n🎉 Credit reset testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}