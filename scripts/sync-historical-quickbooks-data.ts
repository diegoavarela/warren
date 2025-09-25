#!/usr/bin/env npx tsx
/**
 * Script to import historical QuickBooks P&L data
 * This fills in the missing 9 months for company c470f6e0-f8c6-4032-9aac-b9d10e444c8f
 */

import { syncFullYear } from '../warren/lib/services/quickbooks-sync-service';

async function syncHistoricalData() {
  const companyId = 'c470f6e0-f8c6-4032-9aac-b9d10e444c8f';
  const realmId = '9341455332038809';

  console.log('🚀 Starting historical QuickBooks data sync...');
  console.log('📊 Company ID:', companyId);
  console.log('🔗 Realm ID:', realmId);

  try {
    // Sync 15 months of data (including comparison year)
    // This will get us Sept 2024 - May 2025 to fill the gaps
    const result = await syncFullYear(companyId, realmId, {
      monthsToFetch: 15, // Get 15 months back from current date
      skipExisting: true, // Don't overwrite June, July, August 2025
      includeComparison: false // No need for previous year comparison yet
    });

    console.log('📈 Sync Results:', result);

    if (result.status === 'completed') {
      console.log(`✅ Successfully imported ${result.completedMonths}/${result.totalMonths} months`);
    } else if (result.status === 'error') {
      console.error('❌ Sync failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  syncHistoricalData()
    .then(() => {
      console.log('🎉 Historical data sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
}

export { syncHistoricalData };