/**
 * Script to run the category type migration
 */

const { db } = require('../lib/db/index');
const { sql } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running categoryType migration...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../lib/db/migrations/add-category-type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL:');
    console.log(migrationSQL);
    console.log();
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'custom_financial_categories' 
      AND column_name = 'category_type'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column category_type exists:');
      console.log(result.rows[0]);
    } else {
      console.log('❌ Column category_type was not created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();