#!/usr/bin/env node

/**
 * Password Hash Generator for Admin Users
 * Generates secure bcrypt hashes for production admin accounts
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Warren Admin Password Hash Generator');
console.log('=====================================\n');

function generateHash(password) {
  return bcrypt.hash(password, 12);
}

function askForPassword() {
  return new Promise((resolve) => {
    rl.question('Enter the password for admin user: ', (password) => {
      if (!password || password.length < 8) {
        console.log('❌ Password must be at least 8 characters long');
        return askForPassword().then(resolve);
      }
      resolve(password);
    });
  });
}

function askForEmail() {
  return new Promise((resolve) => {
    rl.question('Enter the admin email address: ', (email) => {
      if (!email || !email.includes('@')) {
        console.log('❌ Please enter a valid email address');
        return askForEmail().then(resolve);
      }
      resolve(email);
    });
  });
}

async function main() {
  try {
    const email = await askForEmail();
    const password = await askForPassword();

    console.log('\n🔄 Generating secure hash...');
    const hash = await generateHash(password);

    console.log('\n✅ Password hash generated successfully!');
    console.log('\n📋 Use this information in your SQL script:');
    console.log('===========================================');
    console.log(`Email: ${email}`);
    console.log(`Hash:  ${hash}`);
    console.log('\n🔒 Security Notes:');
    console.log('- Save this hash securely');
    console.log('- Never store the plain password');
    console.log('- Use different passwords for each admin user');
    console.log('\n📝 SQL Template:');
    console.log(`
INSERT INTO users (
    id, email, password_hash, first_name, last_name,
    organization_id, role, locale, is_active, is_email_verified,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '${email}',
    '${hash}',
    'Admin',
    'User',
    'YOUR_ORGANIZATION_ID_HERE',
    'platform_admin',
    'en-US',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password_hash = '${hash}',
    role = 'platform_admin',
    is_active = true,
    updated_at = NOW();
    `);

  } catch (error) {
    console.error('❌ Error generating hash:', error);
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Password generation cancelled');
  rl.close();
  process.exit(0);
});

main();