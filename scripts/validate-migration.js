#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * This script validates that the period data migration was successful
 * by comparing the JSON files with the database records.
 * 
 * Usage: node scripts/validate-migration.js [--company-id=<id>] [--detailed]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database setup
const { neon } = require('@neondatabase/serverless');

// Setup database connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Configuration
const PERIOD_DATA_DIR = path.join(__dirname, '..', 'period-data');

// Parse command line arguments
const args = process.argv.slice(2);
const companyIdArg = args.find(arg => arg.startsWith('--company-id='));
const targetCompanyId = companyIdArg ? companyIdArg.split('=')[1] : null;
const isDetailed = args.includes('--detailed');

// Logging utilities
const log = (message, level = 'info') => {
  const prefix = {
    info: '📄',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  }[level] || '📄';
  
  console.log(`${prefix} ${message}`);
};

/**
 * Load and parse period index file
 */
function loadPeriodsIndex() {
  const indexFiles = fs.readdirSync(PERIOD_DATA_DIR)
    .filter(file => file.endsWith('-periods-index.json'));
  
  const indices = [];
  for (const indexFile of indexFiles) {
    const indexPath = path.join(PERIOD_DATA_DIR, indexFile);
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    indices.push({ file: indexFile, data: indexData });
  }
  
  return indices;
}

/**
 * Load period JSON file
 */
function loadPeriodData(filename) {
  const filePath = path.join(PERIOD_DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Parse period string to get start and end dates
 */
function parsePeriodString(periodString) {
  const match = periodString.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error(`Invalid period format: ${periodString}`);
  }
  
  return {
    start: match[1],
    end: match[2]
  };
}

/**
 * Validate a single period file against database
 */
async function validatePeriodFile(filename, companyInfo) {
  log(`\n🔍 Validating: ${filename}`);
  
  try {
    // Load period data
    const periodData = loadPeriodData(filename);
    const { start: periodStart, end: periodEnd } = parsePeriodString(periodData.period);
    const statementType = periodData.metadata?.statementType || 'profit_loss';
    
    // Find corresponding database statement
    const dbStatement = await sql`
      SELECT id, company_id, period_start, period_end, statement_type, currency, source_file 
      FROM financial_statements 
      WHERE company_id = ${periodData.companyId} 
        AND period_start = ${periodStart} 
        AND period_end = ${periodEnd} 
        AND statement_type = ${statementType} 
      LIMIT 1
    `;
    
    if (dbStatement.length === 0) {
      log(`  ❌ No matching statement found in database`, 'error');
      return {
        filename,
        valid: false,
        error: 'Statement not found in database',
        jsonLineItems: periodData.lineItems.length,
        dbLineItems: 0
      };
    }
    
    // Count line items in database
    const dbLineItemCount = await sql`
      SELECT COUNT(*) as count 
      FROM financial_line_items 
      WHERE statement_id = ${dbStatement[0].id}
    `;
    
    const jsonCount = periodData.lineItems.length;
    const dbCount = dbLineItemCount[0].count;
    
    if (jsonCount !== dbCount) {
      log(`  ⚠️  Line item count mismatch: JSON=${jsonCount}, DB=${dbCount}`, 'warning');
    } else {
      log(`  ✅ Line item count matches: ${jsonCount}`, 'success');
    }
    
    if (isDetailed) {
      // Get actual line items for detailed comparison
      const dbLineItems = await sql`
        SELECT account_name, category, subcategory, amount 
        FROM financial_line_items 
        WHERE statement_id = ${dbStatement[0].id}
      `;
      
      log(`  📊 Statement Details:`);
      log(`     Period: ${periodStart} to ${periodEnd}`);
      log(`     Currency: ${periodData.currency} / ${dbStatement[0].currency}`);
      log(`     Source File: ${dbStatement[0].sourceFile}`);
      
      // Compare some key fields
      const jsonTotal = periodData.lineItems.reduce((sum, item) => sum + item.amount, 0);
      const dbTotal = dbLineItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      log(`     Total Amount: JSON=${jsonTotal}, DB=${dbTotal}`);
      
      if (Math.abs(jsonTotal - dbTotal) > 0.01) {
        log(`     ⚠️  Total amount mismatch!`, 'warning');
      }
    }
    
    return {
      filename,
      valid: jsonCount === dbCount,
      jsonLineItems: jsonCount,
      dbLineItems: dbCount,
      statement: dbStatement[0]
    };
    
  } catch (error) {
    log(`  ❌ Validation error: ${error.message}`, 'error');
    return {
      filename,
      valid: false,
      error: error.message,
      jsonLineItems: 0,
      dbLineItems: 0
    };
  }
}

/**
 * Main validation function
 */
async function runValidation() {
  log('🔍 Starting Migration Validation', 'info');
  log(`Target company: ${targetCompanyId || 'ALL'}`, 'info');
  log(`Detailed mode: ${isDetailed}`, 'info');
  log('─'.repeat(50), 'info');
  
  try {
    // Load period indices
    const indices = loadPeriodsIndex();
    log(`Found ${indices.length} company period index(es)`, 'info');
    
    const results = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      totalJsonItems: 0,
      totalDbItems: 0,
      companies: []
    };
    
    // Process each company's periods
    for (const { file: indexFile, data: indexData } of indices) {
      const companyId = indexData.companyId;
      const companyName = indexData.companyName;
      
      // Skip if we're targeting a specific company
      if (targetCompanyId && !companyId.includes(targetCompanyId) && companyId !== targetCompanyId) {
        continue;
      }
      
      log(`\n📊 Validating company: ${companyName}`, 'info');
      log(`    Company ID: ${companyId}`);
      log(`    Expected files: ${indexData.dataFiles.length}`);
      
      const companyResults = {
        companyId,
        companyName,
        files: [],
        totalJsonItems: 0,
        totalDbItems: 0
      };
      
      // Validate each period file for this company
      for (const periodFile of indexData.dataFiles) {
        const fileResult = await validatePeriodFile(periodFile, indexData);
        companyResults.files.push(fileResult);
        companyResults.totalJsonItems += fileResult.jsonLineItems;
        companyResults.totalDbItems += fileResult.dbLineItems;
        
        results.totalFiles++;
        results.totalJsonItems += fileResult.jsonLineItems;
        results.totalDbItems += fileResult.dbLineItems;
        
        if (fileResult.valid) {
          results.validFiles++;
        } else {
          results.invalidFiles++;
        }
      }
      
      results.companies.push(companyResults);
      
      log(`    Files validated: ${companyResults.files.length}`);
      log(`    Valid: ${companyResults.files.filter(f => f.valid).length}`);
      log(`    Invalid: ${companyResults.files.filter(f => !f.valid).length}`);
      log(`    Total items: JSON=${companyResults.totalJsonItems}, DB=${companyResults.totalDbItems}`);
    }
    
    // Print summary
    log('\n📈 Validation Summary', 'info');
    log('─'.repeat(30), 'info');
    log(`Companies validated: ${results.companies.length}`, 'info');
    log(`Files validated: ${results.totalFiles}`, 'info');
    log(`Valid files: ${results.validFiles}`, 'success');
    log(`Invalid files: ${results.invalidFiles}`, results.invalidFiles > 0 ? 'error' : 'info');
    log(`Total line items: JSON=${results.totalJsonItems}, DB=${results.totalDbItems}`, 'info');
    
    if (results.invalidFiles > 0) {
      log('\n⚠️  Issues found:', 'warning');
      for (const company of results.companies) {
        const invalidFiles = company.files.filter(f => !f.valid);
        if (invalidFiles.length > 0) {
          log(`  ${company.companyName}:`);
          for (const file of invalidFiles) {
            log(`    - ${file.filename}: ${file.error || 'Count mismatch'}`);
          }
        }
      }
    }
    
    // Check database statistics
    log('\n🗄️  Database Statistics', 'info');
    log('─'.repeat(30), 'info');
    
    const totalStatements = await sql`SELECT COUNT(*) as count FROM financial_statements`;
    log(`Total statements in DB: ${totalStatements[0].count}`);
    
    const totalLineItems = await sql`SELECT COUNT(*) as count FROM financial_line_items`;
    log(`Total line items in DB: ${totalLineItems[0].count}`);
    
    const totalCompanies = await sql`SELECT COUNT(*) as count FROM companies`;
    log(`Total companies in DB: ${totalCompanies[0].count}`);
    
    const totalOrganizations = await sql`SELECT COUNT(*) as count FROM organizations`;
    log(`Total organizations in DB: ${totalOrganizations[0].count}`);
    
    if (results.invalidFiles === 0 && results.validFiles > 0) {
      log('\n✅ All validations passed! Migration appears successful.', 'success');
    } else if (results.invalidFiles > 0) {
      log('\n❌ Some validations failed. Please check the issues above.', 'error');
      process.exit(1);
    } else {
      log('\n⚠️  No files found to validate.', 'warning');
    }
    
  } catch (error) {
    log(`\n❌ Validation failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Check if period-data directory exists
if (!fs.existsSync(PERIOD_DATA_DIR)) {
  log(`Period data directory not found: ${PERIOD_DATA_DIR}`, 'error');
  process.exit(1);
}

// Run the validation
runValidation().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});