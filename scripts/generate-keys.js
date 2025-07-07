#!/usr/bin/env node

const crypto = require('crypto');

console.log('\n🔐 Generating secure keys for your application...\n');

// Generate JWT Secret (32 bytes = 256 bits)
const jwtSecret = crypto.randomBytes(32).toString('base64url');
console.log(`JWT_SECRET=${jwtSecret}`);

// Generate Encryption Key (must be exactly 32 characters)
const encryptionKey = crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 hex chars
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

// Generate API Secret Key
const apiSecret = crypto.randomBytes(32).toString('base64url');
console.log(`API_SECRET_KEY=${apiSecret}`);

console.log('\n✅ Copy these values to your .env.local file');
console.log('⚠️  Keep these keys secret and never commit them to git!\n');