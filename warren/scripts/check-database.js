#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('📊 Checking database tables...\n');
    
    // Get all tables
    const tables = await sql`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `;
    
    console.log('Found tables:');
    tables.forEach(({ schemaname, tablename }) => {
      console.log(`  ${schemaname}.${tablename}`);
    });
    
    console.log(`\nTotal: ${tables.length} tables`);
    
    // Check if organizations table exists in public schema
    const orgTable = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'organizations'
      )
    `;
    
    console.log(`\nOrganizations table exists: ${orgTable[0].exists}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

checkDatabase();