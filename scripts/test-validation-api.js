#!/usr/bin/env node

const TEST_COMPANY_ID = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'; // VTEX Solutions SRL

// Simple auth token - in real usage, you'd get this from login
const AUTH_TOKEN = 'test-token';

async function testValidationAPI() {
  console.log('🧪 Testing validation API...\n');

  try {
    // First, check if API is available
    const checkResponse = await fetch('http://localhost:4000/api/test/validate-persistence', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${AUTH_TOKEN}`
      }
    });

    if (!checkResponse.ok) {
      throw new Error(`API check failed: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();
    console.log('✅ API is available:', checkData.message);
    console.log('\n📋 Running validation tests...\n');

    // Run the validation test
    const testResponse = await fetch('http://localhost:4000/api/test/validate-persistence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        companyId: TEST_COMPANY_ID,
        cleanup: true // Clean up test data after validation
      })
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Validation test failed: ${testResponse.status} - ${errorText}`);
    }

    const results = await testResponse.json();
    
    // Display results
    console.log('📊 Test Results:\n');
    console.log('Overall:', results.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Message:', results.results.overall.message);
    
    console.log('\n📝 Individual Tests:');
    
    // Statement Creation
    console.log('\n1️⃣ Statement Creation:', 
      results.results.statementCreation.success ? '✅' : '❌',
      results.results.statementCreation.details
    );
    
    // Line Items Creation
    console.log('\n2️⃣ Line Items Creation:', 
      results.results.lineItemsCreation.success ? '✅' : '❌',
      results.results.lineItemsCreation.details
    );
    
    // Template Creation
    console.log('\n3️⃣ Template Creation:', 
      results.results.templateCreation.success ? '✅' : '❌',
      results.results.templateCreation.details
    );
    
    // Data Retrieval
    console.log('\n4️⃣ Data Retrieval:', 
      results.results.dataRetrieval.success ? '✅' : '❌',
      results.results.dataRetrieval.details
    );
    
    // Encryption
    console.log('\n5️⃣ Encryption/Decryption:', 
      results.results.encryption.success ? '✅' : '❌',
      results.results.encryption.details
    );

    console.log('\n✅ Validation complete at:', results.timestamp);

  } catch (error) {
    console.error('\n❌ Validation test failed:', error.message);
    process.exit(1);
  }
}

// Check if we can connect to the server
async function checkServer() {
  try {
    const response = await fetch('http://localhost:4000/api/auth/me');
    return response.ok || response.status === 401; // 401 means server is up but needs auth
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking if server is running...');
  
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error('❌ Server is not running on http://localhost:4000');
    console.log('💡 Please run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Note: In a real scenario, you'd need to login first to get a valid auth token
  console.log('⚠️  Note: This test assumes you are logged in.');
  console.log('   If you get 401 errors, please login first.\n');
  
  await testValidationAPI();
})();