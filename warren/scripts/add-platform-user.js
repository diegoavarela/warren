#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function addPlatformUser() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🔄 Creating platform@warren.com user...\n');
    
    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = 'platform@warren.com'
    `;
    
    if (existing.length > 0) {
      console.log('⚠️  User platform@warren.com already exists!');
      process.exit(0);
    }
    
    // Get the platform organization
    const [platformOrg] = await sql`
      SELECT id FROM organizations WHERE subdomain = 'platform'
    `;
    
    if (!platformOrg) {
      console.error('❌ Platform organization not found!');
      process.exit(1);
    }
    
    // Create platform user
    const hashedPassword = await bcrypt.hash('platform123', 12);
    const [newUser] = await sql`
      INSERT INTO users (
        email, password_hash, first_name, last_name, 
        organization_id, role, locale, is_active, is_email_verified
      )
      VALUES (
        'platform@warren.com', ${hashedPassword}, 'Platform', 'Admin',
        ${platformOrg.id}, 'super_admin', 'en-US', true, true
      )
      RETURNING id, email
    `;
    
    console.log('✅ Created platform admin user:');
    console.log('   Email: platform@warren.com');
    console.log('   Password: platform123');
    console.log('\n⚠️  Remember to change this password!\n');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addPlatformUser();