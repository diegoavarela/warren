#!/usr/bin/env node

/**
 * Migration Rollback Script
 * 
 * This script can rollback the period data migration by removing
 * database records that were created from the JSON files.
 * 
 * Usage: node scripts/rollback-migration.js [--company-id=<id>] [--dry-run] [--confirm]
 * 
 * WARNING: This will delete data from your database. Use with extreme caution!
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
const isDryRun = args.includes('--dry-run');
const isConfirmed = args.includes('--confirm');

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
 * Find statements to rollback
 */
async function findStatementsToRollback(companyId, dataFiles) {
  const statementsToDelete = [];
  
  for (const filename of dataFiles) {
    try {
      const periodData = loadPeriodData(filename);
      const { start: periodStart, end: periodEnd } = parsePeriodString(periodData.period);
      const statementType = periodData.metadata?.statementType || 'profit_loss';
      
      // Find statements that match this period and were created by migration
      const migratedStatements = await sql`
        SELECT id, company_id, period_start, period_end, statement_type, source_file 
        FROM financial_statements 
        WHERE company_id = ${companyId} 
          AND period_start = ${periodStart} 
          AND period_end = ${periodEnd} 
          AND statement_type = ${statementType}
          AND source_file LIKE '%.json'
      `;
      
      statementsToDelete.push(...migratedStatements);
      
    } catch (error) {
      log(`Error processing ${filename}: ${error.message}`, 'warning');
    }
  }
  
  return statementsToDelete;
}

/**
 * Rollback migration for a company
 */
async function rollbackCompany(companyId, companyName, dataFiles) {
  log(`\n🔄 Rolling back migration for: ${companyName}`);
  log(`    Company ID: ${companyId}`);
  log(`    Data files: ${dataFiles.length}`);
  
  try {
    // Find statements created by migration
    const statementsToDelete = await findStatementsToRollback(companyId, dataFiles);
    
    if (statementsToDelete.length === 0) {
      log(`    No migrated statements found to rollback`, 'info');
      return { statements: 0, lineItems: 0 };
    }
    
    log(`    Found ${statementsToDelete.length} statements to delete`);
    
    let totalLineItems = 0;
    
    if (isDryRun) {
      log(`    [DRY RUN] Would delete ${statementsToDelete.length} statements`, 'warning');
      
      // Count line items that would be deleted
      for (const statement of statementsToDelete) {
        const lineItems = await sql`
          SELECT id FROM financial_line_items WHERE statement_id = ${statement.id}
        `;
        totalLineItems += lineItems.length;
      }
      
      log(`    [DRY RUN] Would delete ${totalLineItems} line items`, 'warning');
      
    } else {
      // Delete line items first (foreign key constraint)
      for (const statement of statementsToDelete) {
        const lineItems = await sql`
          SELECT id FROM financial_line_items WHERE statement_id = ${statement.id}
        `;
        
        if (lineItems.length > 0) {
          await sql`DELETE FROM financial_line_items WHERE statement_id = ${statement.id}`;
          totalLineItems += lineItems.length;
          log(`      Deleted ${lineItems.length} line items for statement ${statement.id}`, 'debug');
        }
      }
      
      // Delete statements
      for (const statement of statementsToDelete) {
        await sql`DELETE FROM financial_statements WHERE id = ${statement.id}`;
        log(`      Deleted statement ${statement.id} (${statement.period_start} to ${statement.period_end})`, 'debug');
      }
      
      log(`    ✅ Deleted ${statementsToDelete.length} statements and ${totalLineItems} line items`, 'success');
    }
    
    return { 
      statements: statementsToDelete.length, 
      lineItems: totalLineItems 
    };
    
  } catch (error) {
    log(`    ❌ Error rolling back company: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Main rollback function
 */
async function runRollback() {
  log('🔄 Starting Migration Rollback', 'warning');
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE ROLLBACK'}`, isDryRun ? 'info' : 'warning');
  log(`Target company: ${targetCompanyId || 'ALL'}`, 'info');
  
  if (!isDryRun && !isConfirmed) {
    log('\n❌ SAFETY CHECK FAILED!', 'error');
    log('This operation will DELETE data from your database.', 'error');
    log('Add --confirm flag if you are absolutely sure you want to proceed.', 'error');
    log('Or use --dry-run to see what would be deleted.', 'info');
    process.exit(1);
  }
  
  if (!isDryRun) {
    log('\n⚠️  WARNING: This will permanently delete database records!', 'warning');
    log('Press Ctrl+C now if you want to cancel...', 'warning');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  log('─'.repeat(50), 'info');
  
  try {
    // Load period indices
    const indices = loadPeriodsIndex();
    log(`Found ${indices.length} company period index(es)`, 'info');
    
    const totals = {
      companies: 0,
      statements: 0,
      lineItems: 0
    };
    
    // Process each company's periods
    for (const { file: indexFile, data: indexData } of indices) {
      const companyId = indexData.companyId;
      const companyName = indexData.companyName;
      
      // Skip if we're targeting a specific company
      if (targetCompanyId && !companyId.includes(targetCompanyId) && companyId !== targetCompanyId) {
        continue;
      }
      
      const result = await rollbackCompany(companyId, companyName, indexData.dataFiles);
      totals.companies++;
      totals.statements += result.statements;
      totals.lineItems += result.lineItems;
    }
    
    // Print summary
    log('\n📈 Rollback Summary', 'info');
    log('─'.repeat(30), 'info');
    log(`Companies processed: ${totals.companies}`, 'info');
    log(`Statements ${isDryRun ? 'would be ' : ''}deleted: ${totals.statements}`, totals.statements > 0 ? 'warning' : 'info');
    log(`Line items ${isDryRun ? 'would be ' : ''}deleted: ${totals.lineItems}`, totals.lineItems > 0 ? 'warning' : 'info');
    
    if (isDryRun) {
      log('\n🔍 This was a dry run - no changes were made', 'info');
      log('Run with --confirm to perform the actual rollback', 'warning');
    } else {
      log('\n✅ Rollback completed!', 'success');
      log('The migrated data has been removed from the database', 'info');
    }
    
  } catch (error) {
    log(`\n❌ Rollback failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🔄 Migration Rollback Script

This script removes database records that were created by the period data migration.

⚠️  WARNING: This will permanently delete data from your database!

Usage:
  node scripts/rollback-migration.js [options]

Options:
  --dry-run              Show what would be deleted without making changes
  --company-id=<id>      Rollback only a specific company (full ID or partial match)
  --confirm              Required for live rollback (safety measure)
  --help, -h             Show this help message

Examples:
  # Dry run to see what would be deleted
  node scripts/rollback-migration.js --dry-run

  # Rollback specific company (dry run first!)
  node scripts/rollback-migration.js --company-id=b1dea3ff --dry-run

  # Actually perform rollback (dangerous!)
  node scripts/rollback-migration.js --confirm

Safety Features:
  - Requires --confirm flag for live rollback
  - Only deletes statements with .json source files
  - Shows 5-second warning before deletion
  - Provides detailed logging

What gets deleted:
  - financial_statements records created from JSON files
  - financial_line_items records linked to those statements
  - Does NOT delete companies, users, or other data
`);
}

// Handle help request
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Check if period-data directory exists
if (!fs.existsSync(PERIOD_DATA_DIR)) {
  log(`Period data directory not found: ${PERIOD_DATA_DIR}`, 'error');
  process.exit(1);
}

// Run the rollback
runRollback().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});