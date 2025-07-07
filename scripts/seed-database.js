#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { createId } = require('@paralleldrive/cuid2');

// This script will help you seed initial data after setting up your Neon database
console.log('🌱 Database Seeding Script\n');
console.log('This script will create:');
console.log('- A platform admin user');
console.log('- A sample organization');
console.log('- A sample company');
console.log('- Some test users\n');

const PLATFORM_ADMIN = {
  email: 'admin@warren.com',
  password: 'admin123', // Change this!
  firstName: 'Platform',
  lastName: 'Admin'
};

async function seedDatabase() {
  try {
    // Import database after ensuring env is loaded
    const { db, organizations, users, companies, companyUsers } = require('../lib/db');
    
    console.log('🔄 Creating platform organization...');
    const [platformOrg] = await db.insert(organizations).values({
      id: createId(),
      name: 'Warren Platform',
      subdomain: 'platform',
      tier: 'enterprise',
      locale: 'en-US',
      baseCurrency: 'USD',
      fiscalYearStart: 1,
      isActive: true,
    }).returning();
    
    console.log('✅ Platform organization created');
    
    console.log('\n🔄 Creating platform admin user...');
    const hashedPassword = await bcrypt.hash(PLATFORM_ADMIN.password, 12);
    const [adminUser] = await db.insert(users).values({
      id: createId(),
      email: PLATFORM_ADMIN.email,
      passwordHash: hashedPassword,
      firstName: PLATFORM_ADMIN.firstName,
      lastName: PLATFORM_ADMIN.lastName,
      organizationId: platformOrg.id,
      role: 'super_admin',
      locale: 'en-US',
      isActive: true,
      isEmailVerified: true,
    }).returning();
    
    console.log('✅ Platform admin created');
    console.log(`   Email: ${PLATFORM_ADMIN.email}`);
    console.log(`   Password: ${PLATFORM_ADMIN.password} (Please change this!)`);
    
    console.log('\n🔄 Creating demo organization...');
    const [demoOrg] = await db.insert(organizations).values({
      id: createId(),
      name: 'Demo Corporation',
      subdomain: 'demo',
      tier: 'professional',
      locale: 'en-US',
      baseCurrency: 'USD',
      fiscalYearStart: 1,
      isActive: true,
    }).returning();
    
    console.log('✅ Demo organization created');
    
    console.log('\n🔄 Creating demo company...');
    const [demoCompany] = await db.insert(companies).values({
      id: createId(),
      organizationId: demoOrg.id,
      name: 'Demo Company Inc',
      taxId: 'TAX123456',
      industry: 'Technology',
      locale: 'en-US',
      baseCurrency: 'USD',
      fiscalYearStart: 1,
      isActive: true,
    }).returning();
    
    console.log('✅ Demo company created');
    
    console.log('\n🔄 Creating demo users...');
    
    // Company Admin
    const companyAdminHash = await bcrypt.hash('company123', 12);
    const [companyAdmin] = await db.insert(users).values({
      id: createId(),
      email: 'admin@demo.com',
      passwordHash: companyAdminHash,
      firstName: 'Company',
      lastName: 'Admin',
      organizationId: demoOrg.id,
      role: 'company_admin',
      locale: 'en-US',
      isActive: true,
      isEmailVerified: true,
    }).returning();
    
    // Regular User
    const userHash = await bcrypt.hash('user123', 12);
    const [regularUser] = await db.insert(users).values({
      id: createId(),
      email: 'user@demo.com',
      passwordHash: userHash,
      firstName: 'Demo',
      lastName: 'User',
      organizationId: demoOrg.id,
      role: 'user',
      locale: 'en-US',
      isActive: true,
      isEmailVerified: true,
    }).returning();
    
    console.log('✅ Demo users created');
    
    console.log('\n🔄 Linking users to company...');
    
    await db.insert(companyUsers).values([
      {
        id: createId(),
        companyId: demoCompany.id,
        userId: companyAdmin.id,
        role: 'company_admin',
        isActive: true,
        joinedAt: new Date(),
      },
      {
        id: createId(),
        companyId: demoCompany.id,
        userId: regularUser.id,
        role: 'user',
        isActive: true,
        joinedAt: new Date(),
        invitedBy: companyAdmin.id,
      }
    ]);
    
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
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    console.error('\nMake sure you have:');
    console.error('1. Set up your DATABASE_URL in .env.local');
    console.error('2. Run migrations with: npm run db:migrate');
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password')) {
  console.error('❌ DATABASE_URL not configured properly in .env.local');
  console.error('Please follow the setup guide in docs/NEON_SETUP.md');
  process.exit(1);
}

// Run seeding
seedDatabase();