#!/usr/bin/env node

// Simple test script for multi-tenant authentication
const API_BASE = 'http://localhost:3002/api/v2';

async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    method,
    headers
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Warren Multi-Tenant Authentication\n');
  
  // Test 1: Login with platform admin
  console.log('1. Testing platform admin login...');
  const loginResult = await makeRequest('/auth/login', 'POST', {
    email: 'platform@warren.ai',
    password: 'Admin123!'
  });
  
  if (loginResult.data?.success) {
    console.log('✅ Platform admin login successful');
    console.log('   Token:', loginResult.data.token.substring(0, 20) + '...');
    
    // Test 2: Get profile
    console.log('\n2. Testing profile access...');
    const profileResult = await makeRequest('/auth/profile', 'GET', null, loginResult.data.token);
    
    if (profileResult.data?.success) {
      console.log('✅ Profile access successful');
      console.log('   User:', profileResult.data.user.email);
      console.log('   Role:', profileResult.data.user.role);
    } else {
      console.log('❌ Profile access failed:', profileResult.data?.error);
    }
    
    // Test 3: Try to access user management (should work for platform admin)
    console.log('\n3. Testing user management access...');
    const usersResult = await makeRequest('/users', 'GET', null, loginResult.data.token);
    
    if (usersResult.status === 200) {
      console.log('✅ User management access successful');
    } else {
      console.log('❌ User management access failed:', usersResult.data?.error || usersResult.error);
    }
    
  } else {
    console.log('❌ Platform admin login failed:', loginResult.data?.error || loginResult.error);
  }
  
  // Test 4: Try login with company admin
  console.log('\n4. Testing company admin login...');
  const companyLoginResult = await makeRequest('/auth/login', 'POST', {
    email: 'admin@vort-ex.com',
    password: 'vortex123'
  });
  
  if (companyLoginResult.data?.success) {
    console.log('✅ Company admin login successful');
    console.log('   Company:', companyLoginResult.data.user.companyName);
    console.log('   Subscription:', companyLoginResult.data.user.subscriptionTier);
  } else {
    console.log('❌ Company admin login failed:', companyLoginResult.data?.error || companyLoginResult.error);
  }
  
  // Test 5: Test 2FA setup (optional)
  if (companyLoginResult.data?.success) {
    console.log('\n5. Testing 2FA setup...');
    const twoFAResult = await makeRequest('/auth/2fa/setup', 'POST', {}, companyLoginResult.data.token);
    
    if (twoFAResult.data?.success) {
      console.log('✅ 2FA setup successful');
      console.log('   QR code generated (check console for email simulation)');
    } else {
      console.log('❌ 2FA setup failed:', twoFAResult.data?.error || twoFAResult.error);
    }
  }
  
  console.log('\n🎉 Multi-tenant authentication test completed!');
  console.log('\nNext steps:');
  console.log('- Set up a real email service (AWS SES, SendGrid, etc.)');
  console.log('- Test user invitation workflow');
  console.log('- Update frontend to use new authentication endpoints');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ with fetch support');
  console.log('   Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);