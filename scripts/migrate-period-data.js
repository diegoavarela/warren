#!/usr/bin/env node

/**
 * Migration Script: Move Period-based JSON Data to Database
 * 
 * This script migrates existing period JSON files from the file system
 * to the database, creating proper financial statements and line items.
 * 
 * Usage: node scripts/migrate-period-data.js [--dry-run] [--company-id=<id>]
 * 
 * Options:
 *   --dry-run      Show what would be migrated without making changes
 *   --company-id   Migrate only a specific company (by ID or short form)
 *   --force        Overwrite existing data (use with caution)
 *   --verbose      Show detailed logging
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database setup
const { neon } = require('@neondatabase/serverless');

// Setup database connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Please set it in your .env.local file');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Configuration
const PERIOD_DATA_DIR = path.join(__dirname, '..', 'period-data');
const DEFAULT_ORGANIZATION_ID = 'default-org-id'; // This should be set to your org ID

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const companyIdArg = args.find(arg => arg.startsWith('--company-id='));
const targetCompanyId = companyIdArg ? companyIdArg.split('=')[1] : null;

// Logging utilities
const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📄',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  }[level] || '📄';
  
  if (level === 'debug' && !isVerbose) return;
  
  console.log(`${prefix} [${timestamp}] ${message}`);
};

// Statistics tracking
const stats = {
  filesProcessed: 0,
  statementsCreated: 0,
  lineItemsCreated: 0,
  statementsSkipped: 0,
  errors: 0
};

/**
 * Validate that required database tables exist
 */
async function validateDatabase() {
  log('Validating database connection and tables...', 'debug');
  
  try {
    // Test basic connectivity
    const result = await sql`SELECT id FROM organizations LIMIT 1`;
    log(`Database connection successful`, 'success');
    
    // Check if we have at least one organization
    if (result.length === 0) {
      log('Warning: No organizations found in database', 'warning');
      log('You may need to seed your database first', 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Database validation failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Load and parse period index file
 */
function loadPeriodsIndex() {
  const indexFiles = fs.readdirSync(PERIOD_DATA_DIR)
    .filter(file => file.endsWith('-periods-index.json'));
  
  if (indexFiles.length === 0) {
    throw new Error('No periods index files found in period-data directory');
  }
  
  log(`Found ${indexFiles.length} period index file(s)`, 'debug');
  
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
  if (!fs.existsSync(filePath)) {
    throw new Error(`Period file not found: ${filename}`);
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Check if company exists in database
 */
async function ensureCompanyExists(companyId, companyName) {
  log(`Checking if company exists: ${companyName} (${companyId})`, 'debug');
  
  try {
    // First check if company exists
    const existingCompany = await sql`
      SELECT id, name, organization_id 
      FROM companies 
      WHERE id = ${companyId} 
      LIMIT 1
    `;
    
    if (existingCompany.length > 0) {
      log(`Company found: ${existingCompany[0].name}`, 'debug');
      return existingCompany[0];
    }
    
    // Company doesn't exist - we need to create it
    log(`Company not found in database: ${companyName}`, 'warning');
    
    if (isDryRun) {
      log(`[DRY RUN] Would create company: ${companyName}`, 'info');
      return { id: companyId, name: companyName, organization_id: DEFAULT_ORGANIZATION_ID };
    }
    
    // Get or create default organization
    let organization = await sql`SELECT id FROM organizations LIMIT 1`;
    
    if (organization.length === 0) {
      log('Creating default organization...', 'info');
      organization = await sql`
        INSERT INTO organizations (name, subdomain, tier) 
        VALUES ('Default Organization', 'default', 'professional') 
        RETURNING id
      `;
    }
    
    // Create the company
    log(`Creating company: ${companyName}`, 'info');
    const newCompany = await sql`
      INSERT INTO companies (id, organization_id, name, is_active) 
      VALUES (${companyId}, ${organization[0].id}, ${companyName}, true) 
      RETURNING id, name, organization_id
    `;
    
    return newCompany[0];
  } catch (error) {
    log(`Error ensuring company exists: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Check if financial statement already exists
 */
async function checkExistingStatement(companyId, periodStart, periodEnd, statementType) {
  const existing = await sql`
    SELECT id, company_id, period_start, period_end, statement_type 
    FROM financial_statements 
    WHERE company_id = ${companyId} 
      AND period_start = ${periodStart} 
      AND period_end = ${periodEnd} 
      AND statement_type = ${statementType} 
    LIMIT 1
  `;
  
  return existing.length > 0 ? existing[0] : null;
}

/**
 * Parse period string to get start and end dates
 */
function parsePeriodString(periodString) {
  // Expected format: "2025-01-01 to 2025-01-31"
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
 * Migrate a single period file
 */
async function migratePeriodFile(filename, companyInfo) {
  log(`Processing period file: ${filename}`, 'info');
  
  try {
    // Load period data
    const periodData = loadPeriodData(filename);
    
    // Validate required fields
    if (!periodData.period || !periodData.companyId || !periodData.lineItems) {
      throw new Error(`Invalid period data structure in ${filename}`);
    }
    
    // Parse period dates
    const { start: periodStart, end: periodEnd } = parsePeriodString(periodData.period);
    const statementType = periodData.metadata?.statementType || 'profit_loss';
    const currency = periodData.currency || 'USD';
    
    log(`  Period: ${periodStart} to ${periodEnd}`, 'debug');
    log(`  Company: ${periodData.companyName}`, 'debug');
    log(`  Line items: ${periodData.lineItems.length}`, 'debug');
    log(`  Currency: ${currency}`, 'debug');
    
    // Ensure company exists
    const company = await ensureCompanyExists(periodData.companyId, periodData.companyName);
    
    // Check if statement already exists
    const existingStatement = await checkExistingStatement(
      company.id, 
      periodStart, 
      periodEnd, 
      statementType
    );
    
    if (existingStatement && !isForce) {
      log(`  Statement already exists for this period - skipping`, 'warning');
      stats.statementsSkipped++;
      return;
    }
    
    if (existingStatement && isForce) {
      log(`  Statement exists but --force flag provided - will overwrite`, 'warning');
      
      if (!isDryRun) {
        // Delete existing line items first
        await sql`DELETE FROM financial_line_items WHERE statement_id = ${existingStatement.id}`;
        
        // Delete the statement
        await sql`DELETE FROM financial_statements WHERE id = ${existingStatement.id}`;
        
        log(`  Deleted existing statement and line items`, 'info');
      }
    }
    
    let statementId;
    
    if (isDryRun) {
      log(`  [DRY RUN] Would create financial statement`, 'info');
      log(`  [DRY RUN] Would create ${periodData.lineItems.length} line items`, 'info');
      statementId = 'dry-run-statement-id';
    } else {
      // Create financial statement
      const statement = await sql`
        INSERT INTO financial_statements (
          company_id, organization_id, statement_type, period_start, period_end, 
          currency, source_file, is_audited
        ) VALUES (
          ${company.id}, ${company.organization_id}, ${statementType}, ${periodStart}, ${periodEnd}, 
          ${currency}, ${filename}, false
        ) RETURNING id
      `;
      
      statementId = statement[0].id;
      log(`  Created financial statement: ${statementId}`, 'success');
      stats.statementsCreated++;
      
      // Create line items individually (safer than batch)
      for (let i = 0; i < periodData.lineItems.length; i++) {
        const item = periodData.lineItems[i];
        const isTotal = item.accountName?.toLowerCase().includes('total') || false;
        const isSubtotal = item.accountName?.toLowerCase().includes('subtotal') || false;
        const metadata = JSON.stringify({
          originalData: item,
          migrated: true,
          migratedAt: new Date().toISOString(),
          sourceFile: filename
        });
        
        await sql`
          INSERT INTO financial_line_items (
            statement_id, account_code, account_name, category, subcategory, 
            amount, display_order, is_total, is_subtotal, original_text, metadata
          ) VALUES (
            ${statementId}, ${item.accountCode || null}, ${item.accountName}, 
            ${item.category}, ${item.subcategory || null}, ${item.amount}, 
            ${i}, ${isTotal}, ${isSubtotal}, ${item.accountName}, ${metadata}
          )
        `;
        
        if ((i + 1) % 10 === 0 || i === periodData.lineItems.length - 1) {
          log(`  Inserted line items 1-${i + 1}`, 'debug');
        }
      }
      
      stats.lineItemsCreated += periodData.lineItems.length;
      log(`  Created ${periodData.lineItems.length} line items`, 'success');
    }
    
    stats.filesProcessed++;
    
  } catch (error) {
    log(`Error processing ${filename}: ${error.message}`, 'error');
    stats.errors++;
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  log('🚀 Starting Period Data Migration', 'info');
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`, 'info');
  log(`Force overwrite: ${isForce}`, 'info');
  log(`Target company: ${targetCompanyId || 'ALL'}`, 'info');
  log('─'.repeat(50), 'info');
  
  try {
    // Validate database
    const dbValid = await validateDatabase();
    if (!dbValid) {
      throw new Error('Database validation failed');
    }
    
    // Load period indices
    const indices = loadPeriodsIndex();
    log(`Found ${indices.length} company period index(es)`, 'info');
    
    // Process each company's periods
    for (const { file: indexFile, data: indexData } of indices) {
      const companyId = indexData.companyId;
      const companyName = indexData.companyName;
      
      // Skip if we're targeting a specific company
      if (targetCompanyId && !companyId.includes(targetCompanyId) && companyId !== targetCompanyId) {
        log(`Skipping company ${companyName} (not target)`, 'debug');
        continue;
      }
      
      log(`\n📊 Processing company: ${companyName}`, 'info');
      log(`    Company ID: ${companyId}`, 'debug');
      log(`    Total periods: ${indexData.totalPeriods}`, 'info');
      log(`    Data files: ${indexData.dataFiles.length}`, 'info');
      
      // Process each period file for this company
      for (const periodFile of indexData.dataFiles) {
        try {
          await migratePeriodFile(periodFile, indexData);
        } catch (error) {
          log(`Failed to migrate ${periodFile}: ${error.message}`, 'error');
          // Continue with other files
        }
      }
    }
    
    // Print final statistics
    log('\n📈 Migration Summary', 'info');
    log('─'.repeat(30), 'info');
    log(`Files processed: ${stats.filesProcessed}`, 'info');
    log(`Statements created: ${stats.statementsCreated}`, 'success');
    log(`Line items created: ${stats.lineItemsCreated}`, 'success');
    log(`Statements skipped: ${stats.statementsSkipped}`, 'warning');
    log(`Errors: ${stats.errors}`, stats.errors > 0 ? 'error' : 'info');
    
    if (isDryRun) {
      log('\n🔍 This was a dry run - no changes were made', 'info');
      log('Run without --dry-run to perform the actual migration', 'info');
    } else {
      log('\n✅ Migration completed successfully!', 'success');
    }
    
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'error');
    if (error.stack && isVerbose) {
      log(`Stack trace: ${error.stack}`, 'debug');
    }
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
📋 Period Data Migration Script

This script migrates period-based JSON data from the file system to the database.

Usage:
  node scripts/migrate-period-data.js [options]

Options:
  --dry-run              Show what would be migrated without making changes
  --company-id=<id>      Migrate only a specific company (full ID or partial match)
  --force                Overwrite existing data (use with caution)
  --verbose, -v          Show detailed logging
  --help, -h             Show this help message

Examples:
  # Dry run to see what would be migrated
  node scripts/migrate-period-data.js --dry-run

  # Migrate all companies with verbose logging
  node scripts/migrate-period-data.js --verbose

  # Migrate specific company only
  node scripts/migrate-period-data.js --company-id=b1dea3ff

  # Force overwrite existing data (be careful!)
  node scripts/migrate-period-data.js --force

Directory Structure Expected:
  period-data/
  ├── companyId-periods-index.json
  ├── companyId-2025-01.json
  ├── companyId-2025-02.json
  └── ...

Database Tables Used:
  - companies (ensures company exists)
  - organizations (creates default if needed)
  - financial_statements (creates statement per period)
  - financial_line_items (creates line items)
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
  log('Please ensure the period-data directory exists with JSON files', 'error');
  process.exit(1);
}

// Run the migration
runMigration().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});