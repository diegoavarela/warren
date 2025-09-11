#!/usr/bin/env npx tsx

/**
 * QuickBooks Sandbox Test Script
 * This script helps us understand QB data structure and test our integration
 */

import { QuickBooksOAuthService, getQuickBooksOAuthService } from '../lib/quickbooks/oauth';
import { QuickBooksAPIClient, createQuickBooksClient } from '../lib/quickbooks/client';
import { QuickBooksDataTransformer, createQuickBooksTransformer } from '../lib/quickbooks/transformer';

// Test configuration - these should be set in environment variables
const TEST_CONFIG = {
  // QB Sandbox credentials - you'll need to set these
  QB_CLIENT_ID: process.env.QB_CLIENT_ID || '',
  QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET || '',
  QB_REDIRECT_URI: process.env.QB_REDIRECT_URI || 'http://localhost:4000/api/quickbooks/auth/callback',
  
  // Test tokens (you'll get these after OAuth flow)
  TEST_ACCESS_TOKEN: process.env.TEST_QB_ACCESS_TOKEN || '',
  TEST_REALM_ID: process.env.TEST_QB_REALM_ID || '',
};

async function testOAuthFlow() {
  console.log('🔐 Testing QuickBooks OAuth Flow...\n');
  
  try {
    const oauthService = getQuickBooksOAuthService();
    
    // Test 1: Generate Auth URL
    console.log('1. Generating OAuth URL...');
    const authUrl = oauthService.generateAuthUri('test-state-123');
    console.log('   OAuth URL:', authUrl);
    console.log('   ✅ OAuth URL generated successfully\n');
    
    // Test 2: Configuration
    const config = oauthService.getConfig();
    console.log('2. OAuth Configuration:');
    console.log('   Client ID:', config.clientId ? '✅ Set' : '❌ Missing');
    console.log('   Client Secret:', config.clientSecret ? '✅ Set' : '❌ Missing');
    console.log('   Redirect URI:', config.redirectUri);
    console.log('   Base URL:', config.baseUrl);
    console.log('   Scope:', config.scope, '\n');
    
    return true;
  } catch (error) {
    console.error('❌ OAuth Flow Test Failed:', error.message);
    return false;
  }
}

async function testAPIClient() {
  console.log('📊 Testing QuickBooks API Client...\n');
  
  if (!TEST_CONFIG.TEST_ACCESS_TOKEN || !TEST_CONFIG.TEST_REALM_ID) {
    console.log('⚠️  Skipping API tests - no access token or realm ID provided');
    console.log('   To test with real data, set TEST_QB_ACCESS_TOKEN and TEST_QB_REALM_ID environment variables\n');
    return false;
  }
  
  try {
    const client = createQuickBooksClient(
      TEST_CONFIG.TEST_ACCESS_TOKEN,
      TEST_CONFIG.TEST_REALM_ID,
      true // Use sandbox
    );
    
    // Test 1: Connection test
    console.log('1. Testing API connection...');
    const connectionOk = await client.testConnection();
    console.log('   Connection:', connectionOk ? '✅ Success' : '❌ Failed');
    
    if (!connectionOk) {
      console.log('   Cannot proceed with API tests\n');
      return false;
    }
    
    // Test 2: Get company info
    console.log('\n2. Fetching company information...');
    const companyInfo = await client.getCompanyInfo();
    console.log('   Company Name:', companyInfo?.QueryResponse?.CompanyInfo?.[0]?.Name || 'Unknown');
    console.log('   ✅ Company info retrieved');
    
    // Test 3: Get accounts
    console.log('\n3. Fetching chart of accounts...');
    const accounts = await client.getAccounts();
    console.log(`   Found ${accounts.length} accounts:`);
    
    // Group accounts by type for better understanding
    const accountsByType = accounts.reduce((acc, account) => {
      const type = account.AccountType || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(accountsByType).forEach(([type, typeAccounts]) => {
      console.log(`     ${type}: ${typeAccounts.length} accounts`);
      // Show first few account names as examples
      const examples = typeAccounts.slice(0, 3).map(acc => acc.Name).join(', ');
      if (examples) console.log(`       Examples: ${examples}`);
    });
    
    // Test 4: Get P&L Report
    console.log('\n4. Fetching Profit & Loss report...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const plReport = await client.getProfitLossReport(startDate, endDate, {
      summarizeColumnsBy: 'Month',
      accounting_method: 'Accrual'
    });
    
    console.log('   Report Period:', plReport.Header?.StartPeriod, 'to', plReport.Header?.EndPeriod);
    console.log('   Report Basis:', plReport.Header?.ReportBasis || 'Accrual');
    console.log('   Columns:', plReport.Columns?.Column?.length || 0);
    console.log('   Rows:', plReport.Rows?.Row?.length || 0);
    console.log('   ✅ P&L report retrieved');
    
    // Test 5: Get Balance Sheet
    console.log('\n5. Fetching Balance Sheet report...');
    const balanceSheet = await client.getBalanceSheetReport(endDate);
    console.log('   Report Date:', balanceSheet.Header?.ReportName || 'Balance Sheet');
    console.log('   Columns:', balanceSheet.Columns?.Column?.length || 0);
    console.log('   Rows:', balanceSheet.Rows?.Row?.length || 0);
    console.log('   ✅ Balance Sheet retrieved');
    
    return { plReport, balanceSheet, companyInfo };
    
  } catch (error) {
    console.error('❌ API Client Test Failed:', error.message);
    return false;
  }
}

async function testDataTransformer(testData?: any) {
  console.log('🔄 Testing Data Transformer...\n');
  
  try {
    const transformer = createQuickBooksTransformer();
    
    if (!testData || !testData.plReport) {
      console.log('⚠️  Skipping transformer tests - no test data available');
      console.log('   Run with valid QB credentials to test data transformation\n');
      
      // Show available mappings
      console.log('Available default mappings:');
      const mappings = transformer.getMappings();
      mappings.slice(0, 5).forEach(mapping => {
        console.log(`   ${mapping.qbAccountName} -> ${mapping.warrenCategory}`);
      });
      console.log(`   ... and ${mappings.length - 5} more mappings\n`);
      
      return false;
    }
    
    // Test P&L transformation
    console.log('1. Testing P&L transformation...');
    const plResult = await transformer.transformProfitLoss(
      testData.plReport,
      'test-company-id'
    );
    
    if (plResult.success) {
      console.log('   ✅ P&L transformation successful');
      console.log('   Periods:', plResult.data?.periods?.length || 0);
      console.log('   Total Revenue:', plResult.data?.data?.totalRevenue || 0);
      console.log('   Total Expenses:', plResult.data?.data?.totalOutcome || 0);
      console.log('   Net Income:', plResult.data?.data?.netIncome || 0);
    } else {
      console.log('   ❌ P&L transformation failed:', plResult.error);
    }
    
    // Test Cash Flow derivation
    if (testData.balanceSheet) {
      console.log('\n2. Testing Cash Flow derivation...');
      const cfResult = await transformer.deriveCashFlow(
        testData.plReport,
        testData.balanceSheet,
        'test-company-id'
      );
      
      if (cfResult.success) {
        console.log('   ✅ Cash Flow derivation successful');
        console.log('   Operating Cash Flow:', cfResult.data?.data?.operatingActivities || 0);
        console.log('   Final Balance:', cfResult.data?.data?.finalBalance || 0);
      } else {
        console.log('   ❌ Cash Flow derivation failed:', cfResult.error);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Data Transformer Test Failed:', error.message);
    return false;
  }
}

async function analyzeDataStructure(testData?: any) {
  console.log('🔍 Analyzing QB Data Structure...\n');
  
  if (!testData || !testData.plReport) {
    console.log('⚠️  No test data available for structure analysis\n');
    return;
  }
  
  const { plReport, balanceSheet } = testData;
  
  // Analyze P&L structure
  console.log('P&L Report Structure:');
  console.log('├── Header');
  console.log('│   ├── Time:', plReport.Header?.Time);
  console.log('│   ├── ReportName:', plReport.Header?.ReportName);
  console.log('│   ├── StartPeriod:', plReport.Header?.StartPeriod);
  console.log('│   ├── EndPeriod:', plReport.Header?.EndPeriod);
  console.log('│   └── Currency:', plReport.Header?.Currency);
  
  console.log('├── Columns:', plReport.Columns?.Column?.length || 0);
  if (plReport.Columns?.Column) {
    plReport.Columns.Column.forEach((col, idx) => {
      console.log(`│   ├── [${idx}] ${col.ColTitle} (${col.ColType})`);
    });
  }
  
  console.log('└── Rows:', plReport.Rows?.Row?.length || 0);
  
  // Analyze first few rows for structure understanding
  if (plReport.Rows?.Row) {
    console.log('\nFirst 5 rows structure:');
    plReport.Rows.Row.slice(0, 5).forEach((row, idx) => {
      const accountName = row.ColData?.[0]?.value || 'No name';
      const hasSubRows = row.Rows?.Row ? ` (${row.Rows.Row.length} sub-rows)` : '';
      console.log(`  [${idx}] ${accountName}${hasSubRows}`);
    });
  }
  
  if (balanceSheet) {
    console.log('\nBalance Sheet Structure:');
    console.log('├── Columns:', balanceSheet.Columns?.Column?.length || 0);
    console.log('└── Rows:', balanceSheet.Rows?.Row?.length || 0);
  }
  
  console.log('\n📋 Data Structure Analysis Complete\n');
}

async function runAllTests() {
  console.log('🧪 QuickBooks Sandbox Integration Test\n');
  console.log('=' .repeat(50), '\n');
  
  // Check environment setup
  if (!TEST_CONFIG.QB_CLIENT_ID || !TEST_CONFIG.QB_CLIENT_SECRET) {
    console.log('⚠️  Warning: QB_CLIENT_ID and QB_CLIENT_SECRET not set');
    console.log('   Some tests will be skipped. Set these environment variables for full testing.\n');
  }
  
  const results = {
    oauthFlow: false,
    apiClient: false,
    dataTransformer: false
  };
  
  // Test 1: OAuth Flow
  results.oauthFlow = await testOAuthFlow();
  
  // Test 2: API Client (requires tokens)
  const apiTestResult = await testAPIClient();
  results.apiClient = !!apiTestResult;
  
  // Test 3: Data Transformer
  results.dataTransformer = await testDataTransformer(apiTestResult || undefined);
  
  // Test 4: Data Structure Analysis
  await analyzeDataStructure(apiTestResult || undefined);
  
  // Summary
  console.log('=' .repeat(50));
  console.log('🧪 Test Results Summary:');
  console.log('=' .repeat(50));
  console.log('OAuth Flow:      ', results.oauthFlow ? '✅ PASS' : '❌ FAIL');
  console.log('API Client:      ', results.apiClient ? '✅ PASS' : '⚠️  SKIP (no tokens)');
  console.log('Data Transformer:', results.dataTransformer ? '✅ PASS' : '⚠️  SKIP (no data)');
  
  if (!results.apiClient) {
    console.log('\n📝 To test with real QuickBooks data:');
    console.log('1. Set up a QuickBooks sandbox account at https://developer.intuit.com/');
    console.log('2. Create a sandbox app and get your Client ID/Secret');
    console.log('3. Run the OAuth flow to get access tokens');
    console.log('4. Set environment variables:');
    console.log('   export TEST_QB_ACCESS_TOKEN="your_access_token"');
    console.log('   export TEST_QB_REALM_ID="your_realm_id"');
    console.log('5. Re-run this script');
  }
  
  console.log('\n🎉 Test script completed!');
}

// Run all tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };