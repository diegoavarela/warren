// Test script to verify demo login
const fetch = require('node-fetch');

async function testLogin(email, password) {
  try {
    console.log(`\nTesting login for: ${email}`);
    
    const response = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      console.log('Token:', data.token ? 'Generated' : 'Missing');
    } else {
      console.log('❌ Login failed:', data.message || data.error);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('Make sure the backend server is running on port 3002');
  }
}

// Test both accounts
async function runTests() {
  console.log('=== Testing Warren Login System ===');
  
  // Test admin account
  await testLogin('admin@vort-ex.com', 'vortex123');
  
  // Test demo account
  await testLogin('demo@warren.vortex.com', 'WarrenDemo2024!');
  
  // Test invalid login
  await testLogin('invalid@test.com', 'wrongpassword');
}

runTests();