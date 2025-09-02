#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const PLATFORM_ADMIN = {
  email: 'admin@warren.com',
  password: 'admin123', // Change this!
  firstName: 'Platform',
  lastName: 'Admin'
};

async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🌱 Seeding database with initial data...\n');
    
    // 1. Create platform organization
    console.log('Creating platform organization...');
    const [platformOrg] = await sql`
      INSERT INTO organizations (name, subdomain, tier, locale, base_currency, fiscal_year_start, is_active)
      VALUES ('Warren Platform', 'platform', 'enterprise', 'en-US', 'USD', 1, true)
      RETURNING id, name
    `;
    console.log(`✅ Created: ${platformOrg.name}`);
    
    // 2. Create platform admin user
    console.log('\nCreating platform admin user...');
    const hashedPassword = await bcrypt.hash(PLATFORM_ADMIN.password, 12);
    const [adminUser] = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role, locale, is_active, is_email_verified)
      VALUES (${PLATFORM_ADMIN.email}, ${hashedPassword}, ${PLATFORM_ADMIN.firstName}, ${PLATFORM_ADMIN.lastName}, ${platformOrg.id}, 'super_admin', 'en-US', true, true)
      RETURNING id, email
    `;
    console.log(`✅ Created admin: ${adminUser.email}`);
    
    // 3. Create demo organization
    console.log('\nCreating demo organization...');
    const [demoOrg] = await sql`
      INSERT INTO organizations (name, subdomain, tier, locale, base_currency, fiscal_year_start, is_active)
      VALUES ('Demo Corporation', 'demo', 'professional', 'en-US', 'USD', 1, true)
      RETURNING id, name
    `;
    console.log(`✅ Created: ${demoOrg.name}`);
    
    // 4. Create demo company
    console.log('\nCreating demo company...');
    const [demoCompany] = await sql`
      INSERT INTO companies (organization_id, name, tax_id, industry, locale, base_currency, fiscal_year_start, is_active)
      VALUES (${demoOrg.id}, 'Demo Company Inc', 'TAX123456', 'Technology', 'en-US', 'USD', 1, true)
      RETURNING id, name
    `;
    console.log(`✅ Created: ${demoCompany.name}`);
    
    // 5. Create demo users
    console.log('\nCreating demo users...');
    
    // Company Admin
    const companyAdminHash = await bcrypt.hash('company123', 12);
    const [companyAdmin] = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role, locale, is_active, is_email_verified)
      VALUES ('admin@demo.com', ${companyAdminHash}, 'Company', 'Admin', ${demoOrg.id}, 'company_admin', 'en-US', true, true)
      RETURNING id, email
    `;
    console.log(`✅ Created: ${companyAdmin.email}`);
    
    // Regular User
    const userHash = await bcrypt.hash('user123', 12);
    const [regularUser] = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, organization_id, role, locale, is_active, is_email_verified)
      VALUES ('user@demo.com', ${userHash}, 'Demo', 'User', ${demoOrg.id}, 'user', 'en-US', true, true)
      RETURNING id, email
    `;
    console.log(`✅ Created: ${regularUser.email}`);
    
    // 6. Link users to company
    console.log('\nLinking users to company...');
    await sql`
      INSERT INTO company_users (company_id, user_id, role, is_active, joined_at)
      VALUES 
        (${demoCompany.id}, ${companyAdmin.id}, 'company_admin', true, NOW()),
        (${demoCompany.id}, ${regularUser.id}, 'user', true, NOW())
    `;
    console.log('✅ Users linked to company');
    
    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('You can now login with:');
    console.log('------------------------');
    console.log('Platform Admin:');
    console.log(`  Email: ${PLATFORM_ADMIN.email}`);
    console.log(`  Password: ${PLATFORM_ADMIN.password}`);
    console.log('\nCompany Admin:');
    console.log('  Email: admin@demo.com');
    console.log('  Password: company123');
    console.log('\nRegular User:');
    console.log('  Email: user@demo.com');
    console.log('  Password: user123');
    console.log('\n⚠️  Remember to change these passwords!\n');
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedDatabase();