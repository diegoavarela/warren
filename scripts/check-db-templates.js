require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkTemplates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // First check if currency column exists
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mapping_templates'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in mapping_templates table:');
    columnsResult.rows.forEach(row => console.log(`  - ${row.column_name}`));
    console.log('\n');

    // Get templates
    const result = await client.query(`
      SELECT id, template_name, statement_type, currency, created_at,
             length(column_mappings::text) as mappings_size
      FROM mapping_templates 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} templates:\n`);

    for (const template of result.rows) {
      console.log('='.repeat(60));
      console.log(`Template: ${template.template_name}`);
      console.log(`ID: ${template.id}`);
      console.log(`Type: ${template.statement_type}`);
      console.log(`Currency: ${template.currency}`);
      console.log(`Created: ${template.created_at}`);
      console.log(`Mappings size: ${template.mappings_size} characters`);
    }

    // Get one template with full data to analyze
    if (result.rows.length > 0) {
      const fullResult = await client.query(`
        SELECT column_mappings 
        FROM mapping_templates 
        WHERE id = $1
      `, [result.rows[0].id]);

      let mappings = fullResult.rows[0].column_mappings;
      console.log('\n\nAnalyzing first template mappings:');
      console.log(`Type: ${typeof mappings}`);
      
      // Check if encrypted
      if (typeof mappings === 'string' && mappings.includes(':')) {
        console.log('Mappings appear to be encrypted');
        // Try to decrypt
        try {
          const { decryptObject } = require('../lib/encryption');
          mappings = decryptObject(mappings);
          console.log('Successfully decrypted mappings');
        } catch (error) {
          console.log('Failed to decrypt:', error.message);
        }
      }
      
      if (typeof mappings === 'object' && mappings.accounts) {
        console.log(`Number of accounts: ${mappings.accounts.length}`);
        
        let withoutSubcategory = 0;
        mappings.accounts.forEach(acc => {
          if (!acc.subcategory && !acc.isTotal && !acc.isCalculated) {
            withoutSubcategory++;
          }
        });
        
        console.log(`Accounts without subcategory: ${withoutSubcategory}`);
        
        // Show first 3 accounts
        console.log('\nFirst 3 accounts:');
        mappings.accounts.slice(0, 3).forEach((acc, i) => {
          console.log(`\nAccount ${i + 1}:`);
          console.log(`  Name: ${acc.accountName}`);
          console.log(`  Category: ${acc.category}`);
          console.log(`  Subcategory: ${acc.subcategory || 'NONE'}`);
          console.log(`  Row: ${acc.rowIndex}`);
        });

        // Show accounts without subcategory
        const missing = mappings.accounts
          .filter(acc => !acc.subcategory && !acc.isTotal && !acc.isCalculated && acc.category !== 'uncategorized')
          .slice(0, 5);
        
        if (missing.length > 0) {
          console.log('\nAccounts missing subcategory:');
          missing.forEach(acc => {
            console.log(`  Row ${acc.rowIndex}: ${acc.accountName} (${acc.category})`);
          });
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTemplates();