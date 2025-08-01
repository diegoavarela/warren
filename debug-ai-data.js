/**
 * Debug script to check what data the AI is actually accessing
 * Run this to see what's in your database vs what the AI sees
 */

const { db } = require('./lib/db');
const { financialStatements, financialLineItems, companies } = require('./lib/db/actual-schema');
const { eq } = require('drizzle-orm');

async function debugAIData() {
  try {
    console.log('🔍 Debugging AI Financial Data Access...\n');

    // 1. Check companies in database
    console.log('1. COMPANIES IN DATABASE:');
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies:`);
    allCompanies.forEach(company => {
      console.log(`  - ${company.name} (ID: ${company.id})`);
    });

    // 2. Check financial statements for each company
    console.log('\n2. FINANCIAL STATEMENTS:');
    for (const company of allCompanies) {
      const statements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, company.id));
      
      console.log(`\nCompany: ${company.name}`);
      console.log(`  Statements: ${statements.length}`);
      
      for (const stmt of statements) {
        console.log(`    - ${stmt.statementType} | ${stmt.periodStart} to ${stmt.periodEnd} | ${stmt.currency}`);
        
        // Check line items for this statement
        const lineItems = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, stmt.id))
          .limit(5);
        
        console.log(`      Line items: ${lineItems.length} total`);
        lineItems.forEach(item => {
          console.log(`        - ${item.accountName}: ${item.amount} (${item.category})`);
        });
      }
    }

    // 3. Check for February data specifically
    console.log('\n3. FEBRUARY DATA CHECK:');
    const febStatements = await db
      .select()
      .from(financialStatements)
      .where(eq(financialStatements.periodStart, '2025-02-01'));
    
    console.log(`Found ${febStatements.length} February statements`);
    
    for (const stmt of febStatements) {
      const company = allCompanies.find(c => c.id === stmt.companyId);
      console.log(`  - ${company?.name}: ${stmt.currency} | ${stmt.statementType}`);
      
      const febItems = await db
        .select()
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, stmt.id));
      
      let totalRevenue = 0;
      febItems.forEach(item => {
        if (parseFloat(item.amount) > 0) {
          totalRevenue += parseFloat(item.amount);
        }
      });
      
      console.log(`    Total positive amounts (potential revenue): ${totalRevenue.toLocaleString()}`);
    }

    // 4. Check session storage info (if available)
    console.log('\n4. SESSION STORAGE CHECK:');
    console.log('Note: Run this in browser console to check:');
    console.log('  sessionStorage.getItem("selectedCompanyId")');
    console.log('  sessionStorage.getItem("selectedCompanyName")');

  } catch (error) {
    console.error('Error debugging AI data:', error);
  }
}

// Run the debug
debugAIData().then(() => {
  console.log('\n✅ Debug complete. Check the output above to see what data the AI is accessing.');
  process.exit(0);
}).catch(error => {
  console.error('Debug failed:', error);
  process.exit(1);
});