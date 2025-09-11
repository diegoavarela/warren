#!/usr/bin/env npx tsx

/**
 * QuickBooks End-to-End Test Script
 * Tests the complete flow: Setup → QB Connect → Data Fetch → Dashboard Display
 */

import { setupTestEnvironment } from './setup-qb-test-environment';

async function runEndToEndTest() {
  console.log('🚀 QuickBooks End-to-End Integration Test\n');
  console.log('=' .repeat(70), '\n');

  // Step 1: Create test environment
  console.log('📋 Step 1: Setting up test environment...');
  console.log('This will create:');
  console.log('  • Test organization with QB feature enabled');
  console.log('  • Test company ready for QB connection'); 
  console.log('  • Test user with org admin permissions');
  console.log('  • Placeholder QB connection record');
  
  console.log('\nPress Enter to continue...');
  await waitForEnter();
  
  await setupTestEnvironment();
  
  console.log('\n✅ Test environment created successfully!');
  
  // Step 2: Instructions for QB setup
  console.log('\n📋 Step 2: QuickBooks Sandbox Setup');
  console.log('=' .repeat(40));
  console.log('\n🔧 Manual Steps Required:');
  console.log('\n1. Create QuickBooks Developer Account:');
  console.log('   → Go to: https://developer.intuit.com/');
  console.log('   → Sign up or log in');
  console.log('   → Go to "My Apps"');
  
  console.log('\n2. Create Sandbox App:');
  console.log('   → Click "Create an app"');
  console.log('   → Select "QuickBooks Online API"');
  console.log('   → Fill in app details:');
  console.log('     - App name: "Warren QB Integration Test"');
  console.log('     - Description: "Testing Warren financial dashboard integration"');
  console.log('   → Set Redirect URI: http://localhost:4000/api/quickbooks/auth/callback');

  console.log('\n3. Get Sandbox Credentials:');
  console.log('   → After creating app, go to "Keys & OAuth"');
  console.log('   → Copy "Sandbox Client ID"');
  console.log('   → Copy "Sandbox Client Secret"');

  console.log('\n4. Update Environment Variables:');
  console.log('   → In your terminal, run:');
  console.log('     export QB_CLIENT_ID="your_sandbox_client_id_here"');
  console.log('     export QB_CLIENT_SECRET="your_sandbox_client_secret_here"');
  console.log('   → Or update your .env.local file');

  console.log('\n🎯 Ready to Test? Follow these steps:');
  console.log('\n5. Test OAuth Flow:');
  const testEnvData = getTestEnvironmentData();
  if (testEnvData) {
    console.log('   → Visit:', testEnvData.dashboardUrls?.oauth || 'OAuth URL not found');
    console.log('   → Complete QB OAuth flow');
    console.log('   → Should see "Connection successful" message');
  }

  console.log('\n6. Test Dashboard Data:');
  if (testEnvData) {
    console.log('   → P&L Dashboard:', testEnvData.dashboardUrls?.pnl || 'P&L URL not found');
    console.log('   → Should show QB data instead of "No configuration" error');
    console.log('   → Cash Flow Dashboard:', testEnvData.dashboardUrls?.cashflow || 'Cash Flow URL not found');
  }

  console.log('\n7. Validate Data Flow:');
  console.log('   → Check browser network tab for API calls');
  console.log('   → Look for /api/pnl-live-qb/ calls');
  console.log('   → Verify data source shows "quickbooks" in response');
  console.log('   → Confirm dashboard widgets render with real QB data');

  console.log('\n📊 Success Criteria:');
  console.log('   ✓ OAuth completes without errors');
  console.log('   ✓ P&L data loads from QuickBooks sandbox');
  console.log('   ✓ Dashboard displays real accounting data');
  console.log('   ✓ Multi-period data shows historical trends');
  console.log('   ✓ All widgets render correctly');
  console.log('   ✓ No manual Excel upload required');

  console.log('\n🔍 Troubleshooting:');
  console.log('   • If OAuth fails: Check client ID/secret and redirect URI');
  console.log('   • If no data: Ensure QB sandbox company has P&L data');
  console.log('   • If errors: Check browser console and server logs');
  console.log('   • If 404: Verify test environment was created successfully');

  console.log('\n💡 What This Proves:');
  console.log('   → QB data integrates seamlessly with Warren dashboards');
  console.log('   → No Excel upload/mapping needed');
  console.log('   → Real-time accounting data available');
  console.log('   → Existing UI components work unchanged');
  console.log('   → Multi-year historical data accessible');
  
  console.log('\n🎉 If all tests pass, QB integration is ready for production!');
}

async function waitForEnter() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  await new Promise<void>(resolve => {
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

function getTestEnvironmentData() {
  try {
    const fs = require('fs');
    const data = fs.readFileSync('/tmp/qb-test-environment.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('⚠️ Could not read test environment data');
    return null;
  }
}

// Run the end-to-end test
if (require.main === module) {
  runEndToEndTest().catch(console.error);
}

export { runEndToEndTest };