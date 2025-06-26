#!/usr/bin/env node

// Test script to verify frontend authentication integration
const API_BASE = 'http://localhost:3002/api/v2';

async function testFrontendAuth() {
  console.log('🧪 Testing Frontend Authentication Integration\n');
  
  // Test 1: Login with company admin
  console.log('1. Testing company admin login response format...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@vort-ex.com',
        password: 'vortex123'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Login response format is correct');
      console.log('   Response structure:', JSON.stringify({
        success: data.success,
        token: '[TOKEN_PRESENT]',
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          companyId: data.user.companyId ? '[UUID]' : null,
          companyName: data.user.companyName,
          subscriptionTier: data.user.subscriptionTier,
          is2FAEnabled: data.user.is2FAEnabled
        }
      }, null, 2));
      
      // Test 2: Profile endpoint
      console.log('\n2. Testing profile endpoint...');
      const profileResponse = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      
      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        console.log('✅ Profile endpoint response format is correct');
        console.log('   User role:', profileData.user.role);
        console.log('   Company:', profileData.user.companyName);
      } else {
        console.log('❌ Profile endpoint failed:', profileData.error);
      }
      
    } else {
      console.log('❌ Login failed:', data.error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  console.log('\n🎉 Frontend authentication integration test completed!');
  console.log('\nNext steps:');
  console.log('- Start frontend: cd frontend && npm run dev');
  console.log('- Test login with: admin@vort-ex.com / vortex123');
  console.log('- Test login with: platform@warren.ai / Admin123!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ with fetch support');
  process.exit(1);
}

testFrontendAuth().catch(console.error);