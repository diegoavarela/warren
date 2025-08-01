const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugDatabaseState() {
  try {
    console.log('🔍 Checking database state...\n');

    // First, let's see what columns exist in the companies table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);
    console.log('📋 COMPANIES TABLE COLUMNS:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check what tables exist in the database
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📋 ALL TABLES IN DATABASE:');
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    console.log('');

    // Check companies - use actual column names
    const companiesResult = await pool.query('SELECT id, name, created_at FROM companies ORDER BY created_at DESC LIMIT 5');
    console.log('📊 COMPANIES:');
    companiesResult.rows.forEach(company => {
      console.log(`  - ${company.id} | ${company.name} | Created: ${company.created_at}`);
    });
    console.log(`Total companies: ${companiesResult.rows.length}\n`);

    // Check if financial_statements table exists
    const hasFinancialStatements = tablesResult.rows.some(t => t.table_name === 'financial_statements');
    if (hasFinancialStatements) {
      // Check financial statements (recent ones)
      const statementsResult = await pool.query(`
        SELECT * FROM financial_statements
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.log('📈 RECENT FINANCIAL STATEMENTS (last 10):');
      statementsResult.rows.forEach(stmt => {
        console.log(`  - ${stmt.id} | Company: ${stmt.company_id} | Created: ${stmt.created_at}`);
      });
      console.log(`Total statements: ${statementsResult.rows.length}\n`);
    } else {
      console.log('📈 FINANCIAL STATEMENTS: Table does not exist\n');
    }

    // Check if financial_line_items table exists
    const hasFinancialLineItems = tablesResult.rows.some(t => t.table_name === 'financial_line_items');
    if (hasFinancialLineItems && hasFinancialStatements) {
      const lineItemsResult = await pool.query(`
        SELECT fs.company_id, c.name as company_name, COUNT(fli.id) as line_items_count,
               MAX(fli.created_at) as latest_line_item
        FROM financial_statements fs
        LEFT JOIN companies c ON fs.company_id = c.id
        LEFT JOIN financial_line_items fli ON fs.id = fli.statement_id
        GROUP BY fs.company_id, c.name
        ORDER BY latest_line_item DESC NULLS LAST
      `);
      console.log('📋 LINE ITEMS BY COMPANY:');
      lineItemsResult.rows.forEach(item => {
        console.log(`  - ${item.company_name || item.company_id} | Line items: ${item.line_items_count} | Latest: ${item.latest_line_item || 'None'}`);
      });
      console.log(`Companies with data: ${lineItemsResult.rows.length}\n`);
    } else {
      console.log('📋 FINANCIAL LINE ITEMS: Table does not exist\n');
    }

    // Check upload sessions (from processing_jobs or parsing_logs if they exist)
    const hasParsingLogs = tablesResult.rows.some(t => t.table_name === 'parsing_logs');
    if (hasParsingLogs) {
      try {
        const uploadsResult = await pool.query(`
          SELECT DISTINCT upload_session, file_name, status, created_at
          FROM parsing_logs
          WHERE created_at > NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC
          LIMIT 20
        `);
        console.log('📤 RECENT UPLOAD SESSIONS (last 7 days):');
        uploadsResult.rows.forEach(upload => {
          console.log(`  - Session: ${upload.upload_session} | File: ${upload.file_name} | Status: ${upload.status} | Created: ${upload.created_at}`);
        });
      } catch (e) {
        console.log('📤 RECENT UPLOAD SESSIONS: Error querying parsing_logs -', e.message);
      }
    } else {
      console.log('📤 RECENT UPLOAD SESSIONS: parsing_logs table does not exist');
    }

    // Check for JSON files in project directory
    console.log('\n📄 JSON MAPPING FILES IN PROJECT ROOT:');
    const fs = require('fs');
    const files = fs.readdirSync('.').filter(f => f.includes('excel_mapping_') && f.endsWith('.json'));
    files.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`  - ${file} | Modified: ${stats.mtime}`);
    });
    if (files.length === 0) {
      console.log('  - No recent excel_mapping JSON files found');
    }

    // Check period-data directory
    console.log('\n📅 PERIOD DATA FILES:');
    try {
      const periodFiles = fs.readdirSync('./period-data');
      const companyIds = [...new Set(periodFiles.map(f => f.split('-')[0]).filter(id => id.length > 10))];
      console.log(`  - Companies with period data: ${companyIds.join(', ')}`);
      console.log(`  - Total period files: ${periodFiles.length}`);
      
      // Check if the period data company ID matches database company ID
      if (companyIds.length > 0) {
        const periodCompanyId = companyIds[0];
        const databaseCompanyId = companiesResult.rows[0]?.id;
        console.log(`  - Period data company ID: ${periodCompanyId}`);
        console.log(`  - Database company ID: ${databaseCompanyId}`);
        console.log(`  - IDs match: ${periodCompanyId === databaseCompanyId}`);
      }
    } catch (e) {
      console.log('  - No period-data directory found');
    }

    // Check legacy tables that might contain the data
    console.log('\n🔍 CHECKING LEGACY TABLES FOR FINANCIAL DATA:');
    
    // Check pnl_data table
    try {
      const pnlResult = await pool.query('SELECT COUNT(*) as count, MAX(created_at) as latest FROM pnl_data');
      console.log(`  - pnl_data: ${pnlResult.rows[0].count} records, latest: ${pnlResult.rows[0].latest}`);
    } catch (e) {
      console.log(`  - pnl_data: Error - ${e.message}`);
    }

    // Check financial_records table
    try {
      const financialResult = await pool.query('SELECT COUNT(*) as count, MAX(created_at) as latest FROM financial_records');
      console.log(`  - financial_records: ${financialResult.rows[0].count} records, latest: ${financialResult.rows[0].latest}`);
    } catch (e) {
      console.log(`  - financial_records: Error - ${e.message}`);
    }

    // Check file_uploads table
    try {
      const uploadsResult = await pool.query('SELECT COUNT(*) as count, MAX(created_at) as latest, MAX(filename) as latest_file FROM file_uploads');
      console.log(`  - file_uploads: ${uploadsResult.rows[0].count} records, latest: ${uploadsResult.rows[0].latest}, file: ${uploadsResult.rows[0].latest_file}`);
    } catch (e) {
      console.log(`  - file_uploads: Error - ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  debugDatabaseState();
}

module.exports = { debugDatabaseState };