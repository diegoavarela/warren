const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUploadFlow() {
  console.log('=== TESTING FULL UPLOAD FLOW ===\n');
  
  try {
    // 1. First login to get token
    console.log('1. Logging in...');
    const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@vort-ex.com',
      password: 'vortex123'
    });
    
    console.log('Login response:', loginRes.data);
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('Got token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    // 2. Upload the Excel file
    console.log('\n2. Uploading Excel file...');
    const form = new FormData();
    const fileStream = fs.createReadStream('../Vortex/Cashflow_2025.xlsx');
    form.append('file', fileStream, 'Cashflow_2025.xlsx');
    
    const uploadRes = await axios.post('http://localhost:3002/api/cashflow/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Upload response:', uploadRes.data);
    
    // 3. Check the dashboard immediately
    console.log('\n3. Checking dashboard immediately after upload...');
    const dashboardRes = await axios.get('http://localhost:3002/api/cashflow/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Dashboard data:');
    console.log('- Is real data:', dashboardRes.data.data.isRealData);
    console.log('- Current month:', dashboardRes.data.data.currentMonth.month);
    console.log('- Total income:', dashboardRes.data.data.currentMonth.totalIncome);
    console.log('- Debug info:', dashboardRes.data.data.debug);
    
    // 4. Also check the test endpoint
    console.log('\n4. Checking test endpoint...');
    const testRes = await axios.get('http://localhost:3002/api/test-direct/test-dashboard');
    console.log('Test endpoint - Has stored metrics:', testRes.data.serviceInfo.hasStoredMetrics);
    console.log('Test endpoint - Stored metrics count:', testRes.data.serviceInfo.storedMetricsCount);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUploadFlow();