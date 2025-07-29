// Extract real financial data from database for dashboard debugging
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Simple decrypt function (you may need to adjust based on your encryption)
function simpleDecrypt(encryptedText) {
  try {
    if (encryptedText && encryptedText.includes(':')) {
      // This is a placeholder - you may need to import your actual decrypt function
      return `[ENCRYPTED: ${encryptedText.substring(0, 20)}...]`;
    }
    return encryptedText;
  } catch (e) {
    return `[DECRYPT_ERROR: ${encryptedText}]`;
  }
}

async function extractRealData() {
  try {
    console.log('🔍 Extracting real financial data from database...');
    
    // Initialize database connection
    const sql = neon(process.env.DATABASE_URL);
    
    // Get your company ID (VTEX Solutions SRL)
    const companyId = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8';
    
    // Get all financial statements for this company
    console.log('📊 Querying financial statements...');
    const statements = await sql`
      SELECT * FROM financial_statements 
      WHERE company_id = ${companyId} 
      AND statement_type = 'profit_loss' 
      ORDER BY period_end DESC 
      LIMIT 10
    `;
    
    console.log(`📊 Found ${statements.length} financial statements`);
    
    // Get all line items for all statements
    console.log('📝 Querying ALL line items...');
    const allLineItems = await sql`
      SELECT 
        fli.*,
        fs.period_start,
        fs.period_end,
        fs.currency
      FROM financial_line_items fli
      JOIN financial_statements fs ON fli.statement_id = fs.id
      WHERE fs.company_id = ${companyId} 
      AND fs.statement_type = 'profit_loss'
      ORDER BY fs.period_end DESC, fli.display_order
    `;
    
    console.log(`📝 Found ${allLineItems.length} total line items`);
    
    // Process and analyze the data
    const processedData = allLineItems.map((item, index) => {
      // Extract period data from metadata
      let periodData = {};
      let currentPeriod = 'unknown';
      
      try {
        if (item.metadata && typeof item.metadata === 'object') {
          periodData = item.metadata.periods || {};
          currentPeriod = item.metadata.statementMetadata?.currentPeriod || 'unknown';
        }
      } catch (e) {
        console.warn(`Error parsing metadata for item ${index}:`, e.message);
      }
      
      return {
        // Basic info
        id: item.id,
        statementId: item.statement_id,
        accountName: simpleDecrypt(item.account_name),
        category: item.category,
        subcategory: item.subcategory,
        amount: item.amount,
        isTotal: item.is_total,
        
        // Period info
        statementPeriod: `${item.period_start} to ${item.period_end}`,
        currency: item.currency,
        currentPeriod: currentPeriod,
        
        // Most important: All period data
        periodData: periodData,
        hasMultiplePeriods: Object.keys(periodData).length > 1,
        
        // Raw metadata for debugging
        rawMetadata: item.metadata
      };
    });
    
    // Group by account name to see all periods for each account
    const accountSummary = {};
    processedData.forEach(item => {
      const accountKey = `${item.accountName}_${item.category}`;
      if (!accountSummary[accountKey]) {
        accountSummary[accountKey] = {
          accountName: item.accountName,
          category: item.category,
          subcategory: item.subcategory,
          allPeriodData: {},
          statements: []
        };
      }
      
      // Merge period data
      Object.assign(accountSummary[accountKey].allPeriodData, item.periodData);
      
      // Track which statements this account appears in
      accountSummary[accountKey].statements.push({
        statementId: item.statementId,
        period: item.statementPeriod,
        amount: item.amount,
        currentPeriod: item.currentPeriod
      });
    });
    
    // Calculate what YTD SHOULD be
    const revenueAccounts = Object.values(accountSummary).filter(acc => acc.category === 'revenue');
    const ytdCalculation = {};
    
    revenueAccounts.forEach(account => {
      Object.entries(account.allPeriodData).forEach(([period, amount]) => {
        if (!ytdCalculation[period]) ytdCalculation[period] = 0;
        ytdCalculation[period] += Number(amount) || 0;
      });
    });
    
    const expectedYTDRevenue = Object.values(ytdCalculation).reduce((sum, val) => sum + val, 0);
    
    // Create final analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      companyId: companyId,
      
      summary: {
        totalStatements: statements.length,
        totalLineItems: allLineItems.length,
        processedItems: processedData.length,
        uniqueAccounts: Object.keys(accountSummary).length,
        revenueAccounts: revenueAccounts.length
      },
      
      // Key findings
      keyFindings: {
        periodsFound: [...new Set(Object.keys(ytdCalculation))].sort(),
        expectedYTDRevenue: expectedYTDRevenue,
        ytdByPeriod: ytdCalculation,
        hasEncryptedData: processedData.some(item => item.accountName.includes('[ENCRYPTED:')),
        itemsWithMultiplePeriods: processedData.filter(item => item.hasMultiplePeriods).length
      },
      
      // Account-by-account breakdown
      accountBreakdown: accountSummary,
      
      // Revenue analysis
      revenueAnalysis: revenueAccounts.map(acc => ({
        accountName: acc.accountName,
        totalPeriods: Object.keys(acc.allPeriodData).length,
        periodData: acc.allPeriodData,
        totalAmount: Object.values(acc.allPeriodData).reduce((sum, val) => sum + (Number(val) || 0), 0)
      })),
      
      // Raw data for complete inspection
      rawStatements: statements,
      allProcessedItems: processedData
    };
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `real_financial_data_${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(analysis, null, 2));
    
    console.log(`\n✅ REAL DATA EXTRACTED!`);
    console.log(`📄 File saved: ${filename}`);
    console.log(`\n🔍 KEY FINDINGS:`);
    console.log(`   📊 ${analysis.summary.totalStatements} statements, ${analysis.summary.totalLineItems} line items`);
    console.log(`   📅 Periods found: ${analysis.keyFindings.periodsFound.join(', ')}`);
    console.log(`   💰 Expected YTD Revenue: $${analysis.keyFindings.expectedYTDRevenue.toLocaleString()}`);
    console.log(`   🏢 ${analysis.summary.uniqueAccounts} unique accounts (${analysis.summary.revenueAccounts} revenue)`);
    console.log(`   🔐 Has encrypted data: ${analysis.keyFindings.hasEncryptedData}`);
    console.log(`   📈 Items with multi-period data: ${analysis.keyFindings.itemsWithMultiplePeriods}`);
    
    console.log(`\n💡 YTD Revenue by Period:`);
    Object.entries(analysis.keyFindings.ytdByPeriod).forEach(([period, amount]) => {
      console.log(`   ${period}: $${amount.toLocaleString()}`);
    });
    
    console.log(`\n🎯 This file contains the EXACT data your dashboard should be using!`);
    
  } catch (error) {
    console.error('❌ Error extracting data:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the extraction
extractRealData();