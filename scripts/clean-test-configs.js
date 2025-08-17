/**
 * Script to clean up test configurations that were created during development
 * This removes configurations with invalid data that prevent the dashboard from working
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function cleanTestConfigs() {
  console.log('\n🧹 Clean Test Configurations Script');
  console.log('=====================================');
  console.log('This script will help you clean up test configurations that may be causing issues.');
  console.log('\nTo clean test configurations:');
  console.log('1. Go to: http://localhost:4000/dashboard/company-admin/configurations');
  console.log('2. Find any configurations with names like "PnL_2025" or test configurations');
  console.log('3. Delete them using the delete button');
  console.log('4. Create a proper configuration using the "New Configuration" button');
  console.log('\nWhy this is needed:');
  console.log('- Test configurations may have incorrect row/column mappings');
  console.log('- This causes the dashboard to show invalid data or white pages');
  console.log('- A fresh configuration with proper Excel mapping will fix the issue');
  
  rl.question('\nPress Enter to close this script and go clean configurations manually...', () => {
    console.log('\n✅ Manual cleanup recommended. Visit the configurations page to delete test data.');
    rl.close();
  });
}

cleanTestConfigs().catch(console.error);