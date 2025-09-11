#!/usr/bin/env npx tsx

/**
 * QuickBooks Test Environment Setup
 * Creates dummy org + company and prepares for QB sandbox testing
 */

import { db } from '@/shared/db';
import { 
  organizations, 
  companies, 
  users, 
  userOrganizations,
  quickbooksConnections
} from '@/shared/db/actual-schema';

interface TestEnvironment {
  organization: {
    id: string;
    name: string;
  };
  company: {
    id: string;
    name: string;
    organizationId: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
}

async function createTestOrganization(): Promise<TestEnvironment['organization']> {
  console.log('📦 Creating test organization...');
  
  const testOrgName = `QB Test Org ${new Date().getTime()}`;
  
  const [org] = await db.insert(organizations).values({
    name: testOrgName,
    slug: testOrgName.toLowerCase().replace(/\s+/g, '-'),
    plan: 'enterprise',
    maxCompanies: 10,
    maxUsersPerCompany: 50,
    maxMonthlyCredits: 10000,
    isActive: true,
    settings: JSON.stringify({
      features: {
        quickbooks_integration: true, // Enable QB feature
        ai_chat: true,
        advanced_analytics: true
      },
      branding: {
        logo: null,
        primaryColor: '#0066cc',
        secondaryColor: '#f8f9fa'
      }
    })
  }).returning();

  console.log('✅ Created organization:', org.name, '(ID:', org.id + ')');
  return org;
}

async function createTestCompany(organizationId: string): Promise<TestEnvironment['company']> {
  console.log('🏢 Creating test company...');
  
  const testCompanyName = `QB Test Company ${new Date().getTime()}`;
  
  const [company] = await db.insert(companies).values({
    organizationId,
    name: testCompanyName,
    baseCurrency: 'USD',
    isActive: true,
    settings: JSON.stringify({
      features: {
        quickbooks_sync: true,
        auto_sync: true,
        data_retention_months: 24
      },
      preferences: {
        default_units: 'normal',
        number_format: {
          decimal_separator: '.',
          thousands_separator: ',',
          decimal_places: 0
        }
      }
    })
  }).returning();

  console.log('✅ Created company:', company.name, '(ID:', company.id + ')');
  return company;
}

async function createTestUser(organizationId: string): Promise<TestEnvironment['user']> {
  console.log('👤 Creating test user...');
  
  const testEmail = `qb-test-${Date.now()}@warren-test.com`;
  
  // Create user
  const [user] = await db.insert(users).values({
    email: testEmail,
    name: 'QB Test User',
    role: 'org_admin',
    isActive: true,
    hashedPassword: 'test-password-hash', // In real app, this would be properly hashed
    emailVerified: true
  }).returning();

  // Link user to organization
  await db.insert(userOrganizations).values({
    userId: user.id,
    organizationId: organizationId,
    role: 'org_admin',
    isActive: true
  });

  console.log('✅ Created user:', user.email, '(ID:', user.id + ')');
  console.log('✅ Linked user to organization as org_admin');
  
  return user;
}

async function createPlaceholderQBConnection(companyId: string, organizationId: string) {
  console.log('🔗 Creating placeholder QuickBooks connection...');
  
  // This will be a placeholder until we get real sandbox credentials
  const [connection] = await db.insert(quickbooksConnections).values({
    companyId,
    organizationId,
    qbCompanyId: 'sandbox-company-placeholder',
    companyName: 'QB Sandbox Test Company',
    accessToken: 'placeholder-access-token',
    refreshToken: 'placeholder-refresh-token',
    tokenType: 'Bearer',
    scope: 'com.intuit.quickbooks.accounting',
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    refreshTokenExpiresAt: new Date(Date.now() + 101 * 24 * 3600 * 1000), // 101 days
    isActive: false, // Will be activated when we connect to real sandbox
    environment: 'sandbox',
    lastSyncAt: null,
    syncStatus: 'pending_connection'
  }).returning();

  console.log('✅ Created placeholder QB connection (ID:', connection.id + ')');
  console.log('⚠️  Connection is inactive until sandbox credentials are configured');
  
  return connection;
}

async function displayTestEnvironmentInfo(env: TestEnvironment) {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST ENVIRONMENT CREATED');
  console.log('='.repeat(70));
  
  console.log('\n📊 Environment Details:');
  console.log('├── Organization:', env.organization.name);
  console.log('│   └── ID:', env.organization.id);
  console.log('├── Company:', env.company.name);
  console.log('│   └── ID:', env.company.id);
  console.log('├── User:', env.user.name, `(${env.user.email})`);
  console.log('│   └── ID:', env.user.id);
  console.log('└── Features: QB Integration ✅, AI Chat ✅, Analytics ✅');

  console.log('\n🔗 QuickBooks Setup:');
  console.log('├── Placeholder connection created');
  console.log('├── Ready for sandbox credentials');
  console.log('└── Environment: sandbox');

  console.log('\n🚀 Next Steps:');
  console.log('1. Set up QuickBooks Developer Account:');
  console.log('   → Go to https://developer.intuit.com/');
  console.log('   → Create sandbox app');
  console.log('   → Get Client ID and Client Secret');
  
  console.log('\n2. Configure Environment Variables:');
  console.log('   → export QB_CLIENT_ID="your_sandbox_client_id"');
  console.log('   → export QB_CLIENT_SECRET="your_sandbox_client_secret"');
  
  console.log('\n3. Test OAuth Connection:');
  console.log('   → Visit: http://localhost:4000/api/quickbooks/auth/connect?companyId=' + env.company.id);
  console.log('   → Complete OAuth flow');
  console.log('   → Connection will be activated');
  
  console.log('\n4. Access Dashboards:');
  console.log('   → P&L: http://localhost:4000/dashboard/company-admin/pnl');
  console.log('   → Cash Flow: http://localhost:4000/dashboard/company-admin/cashflow');
  console.log('   → Set company context to:', env.company.id);

  console.log('\n💡 Test Data Flow:');
  console.log('   QB Sandbox → OAuth → API Client → Data Transformer → Dashboard APIs → React Components');
  
  console.log('\n📋 What to Validate:');
  console.log('   ✓ OAuth flow completes successfully');
  console.log('   ✓ P&L data fetches from sandbox');
  console.log('   ✓ Data transforms to Warren format');
  console.log('   ✓ Dashboards render QB data');
  console.log('   ✓ AI chat works with QB context');
  console.log('   ✓ Multi-period data displays correctly');
}

async function checkExistingTestData() {
  console.log('🔍 Checking for existing test data...');
  
  // Look for existing QB test organizations
  const existingOrgs = await db
    .select()
    .from(organizations)
    .where(sql`name LIKE 'QB Test Org%'`)
    .limit(5);

  if (existingOrgs.length > 0) {
    console.log('⚠️  Found existing test organizations:');
    existingOrgs.forEach(org => {
      console.log(`   • ${org.name} (ID: ${org.id})`);
    });
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question('\nCreate new test environment anyway? (y/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled. Using existing test data.');
      process.exit(0);
    }
  }
}

async function setupTestEnvironment() {
  console.log('🧪 Setting up QuickBooks Test Environment\n');
  
  try {
    // Check for existing test data
    await checkExistingTestData();
    
    // Create test organization
    const organization = await createTestOrganization();
    
    // Create test company
    const company = await createTestCompany(organization.id);
    
    // Create test user
    const user = await createTestUser(organization.id);
    
    // Create placeholder QB connection
    await createPlaceholderQBConnection(company.id, organization.id);
    
    // Display setup info
    const env: TestEnvironment = { organization, company, user };
    await displayTestEnvironmentInfo(env);
    
    // Save environment info to file for easy access
    const envInfo = {
      ...env,
      createdAt: new Date().toISOString(),
      dashboardUrls: {
        pnl: `http://localhost:4000/dashboard/company-admin/pnl?companyId=${company.id}`,
        cashflow: `http://localhost:4000/dashboard/company-admin/cashflow?companyId=${company.id}`,
        oauth: `http://localhost:4000/api/quickbooks/auth/connect?companyId=${company.id}`
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      '/tmp/qb-test-environment.json', 
      JSON.stringify(envInfo, null, 2)
    );
    
    console.log('\n📄 Environment info saved to: /tmp/qb-test-environment.json');
    console.log('\n🎉 Test environment ready! Follow the next steps to connect to QB sandbox.');
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
}

// Import sql for the existing data check
const { sql } = require('drizzle-orm');

// Run setup
if (require.main === module) {
  setupTestEnvironment().catch(console.error);
}

export { setupTestEnvironment };