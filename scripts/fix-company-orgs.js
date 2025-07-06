#!/usr/bin/env node

/**
 * Script to fix company organizationIds
 * This script helps reassign companies to the correct organization
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function fixCompanyOrganizations() {
  try {
    // Check if we have a database URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      console.log('Please ensure .env.local contains DATABASE_URL');
      process.exit(1);
    }

    // Import database after env vars are loaded
    const { db, companies, organizations, users, eq } = require('../lib/db');

    console.log('🔍 Fetching all organizations...');
    const allOrgs = await db.select().from(organizations);
    console.log(`Found ${allOrgs.length} organizations:`);
    allOrgs.forEach(org => {
      console.log(`  - ${org.name} (${org.id})`);
    });

    console.log('\n🔍 Fetching all companies...');
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies\n`);

    // Group companies by organization
    const companiesByOrg = {};
    allCompanies.forEach(company => {
      if (!companiesByOrg[company.organizationId]) {
        companiesByOrg[company.organizationId] = [];
      }
      companiesByOrg[company.organizationId].push(company);
    });

    // Display companies by organization
    console.log('Companies by Organization:');
    for (const [orgId, companies] of Object.entries(companiesByOrg)) {
      const org = allOrgs.find(o => o.id === orgId);
      console.log(`\n${org ? org.name : 'Unknown Org'} (${orgId}):`);
      companies.forEach(company => {
        console.log(`  - ${company.name} (${company.id})`);
      });
    }

    // Check for orphaned companies (companies with non-existent organizationIds)
    const orphanedCompanies = allCompanies.filter(
      company => !allOrgs.find(org => org.id === company.organizationId)
    );

    if (orphanedCompanies.length > 0) {
      console.log('\n⚠️  Found orphaned companies (with non-existent organizationIds):');
      orphanedCompanies.forEach(company => {
        console.log(`  - ${company.name} (${company.id}) -> org: ${company.organizationId}`);
      });
    }

    // Interactive fix (commented out for safety - uncomment to enable)
    /*
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🔧 Fix Mode (uncomment the code to enable)');
    console.log('Would you like to reassign companies? (y/n)');
    
    // Example: Reassign all companies to a specific organization
    // const targetOrgId = 'org-1'; // Replace with actual organization ID
    // for (const company of allCompanies) {
    //   if (company.organizationId !== targetOrgId) {
    //     console.log(`Updating ${company.name} from org ${company.organizationId} to ${targetOrgId}`);
    //     await db
    //       .update(companies)
    //       .set({ organizationId: targetOrgId })
    //       .where(eq(companies.id, company.id));
    //   }
    // }
    */

    console.log('\n✅ Analysis complete!');
    console.log('\nTo fix companies:');
    console.log('1. Uncomment the fix code in this script');
    console.log('2. Set the correct target organization ID');
    console.log('3. Run the script again');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixCompanyOrganizations().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});