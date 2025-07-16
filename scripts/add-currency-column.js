require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function addCurrencyColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Add currency column
    console.log('Adding currency column...');
    await client.query(`
      ALTER TABLE mapping_templates 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
    `);
    console.log('✅ Added currency column');

    // Update existing records
    console.log('Updating existing records...');
    await client.query(`
      UPDATE mapping_templates 
      SET currency = 'USD' 
      WHERE currency IS NULL OR currency = ''
    `);
    console.log('✅ Updated existing records');

    // Make column NOT NULL
    console.log('Making column NOT NULL...');
    await client.query(`
      ALTER TABLE mapping_templates 
      ALTER COLUMN currency SET NOT NULL
    `);
    console.log('✅ Made currency column NOT NULL');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addCurrencyColumn();