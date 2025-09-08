#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function checkTableStructure() {
  try {
    console.log('🔍 Checking ai_usage_logs table structure...\n');

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_logs'
      );
    `;

    console.log('📋 Table exists:', tableExists[0].exists);

    if (tableExists[0].exists) {
      // Get column information
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_logs'
        ORDER BY ordinal_position;
      `;

      console.log('\n🗂️  Column Structure:');
      columns.forEach((col: any) => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });

      // Try to insert a test record to see what works
      console.log('\n🧪 Testing insert with minimal data...');
      try {
        await sql`
          INSERT INTO ai_usage_logs (company_id, user_id, credits_used) 
          VALUES ('b1dea3ff-cac4-45cc-be78-5488e612c2a8', 'test-user-id', '0.001')
        `;
        console.log('✅ Minimal insert successful');
        
        // Clean up test record
        await sql`DELETE FROM ai_usage_logs WHERE user_id = 'test-user-id'`;
      } catch (error) {
        console.log('❌ Minimal insert failed:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();