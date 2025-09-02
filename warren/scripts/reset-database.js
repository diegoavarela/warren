#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will drop all tables in your database!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🗑️  Dropping all tables...');
    
    // Get all table names
    const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    `;
    
    // Drop each table
    for (const { tablename } of tables) {
      console.log(`   Dropping table: ${tablename}`);
      await sql`DROP TABLE IF EXISTS ${sql(tablename)} CASCADE`;
    }
    
    console.log('\n✅ All tables dropped successfully!');
    console.log('\nNow you can run:');
    console.log('  npm run db:migrate');
    console.log('  node scripts/seed-database.js');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

resetDatabase();