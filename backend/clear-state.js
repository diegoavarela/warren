// Script to clear any persisted state and test fresh
const { exec } = require('child_process');
const axios = require('axios');

async function clearAndTest() {
  console.log('=== CLEARING STATE AND TESTING ===\n');
  
  try {
    // 1. Kill all node processes
    console.log('1. Killing all Node processes...');
    exec('pkill -f node', (err) => {
      if (err) console.log('No processes to kill');
    });
    
    // Wait for processes to die
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. Clear any temp files
    console.log('2. Clearing temp files...');
    exec('rm -rf /tmp/warren-* 2>/dev/null || true');
    
    // 3. Start backend fresh
    console.log('3. Starting backend fresh...');
    const backend = exec('npm run dev', { cwd: process.cwd() });
    
    // Wait for backend to start
    console.log('4. Waiting for backend to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Check health
    console.log('5. Checking health...');
    try {
      const health = await axios.get('http://localhost:3002/health');
      console.log('Backend is healthy:', health.data);
    } catch (e) {
      console.error('Backend not responding!');
      process.exit(1);
    }
    
    // 5. Login
    console.log('\n6. Logging in...');
    const loginRes = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@vort-ex.com',
      password: 'vortex123'
    });
    const token = loginRes.data.token;
    console.log('Got token');
    
    // 6. Check dashboard BEFORE upload
    console.log('\n7. Checking dashboard BEFORE upload...');
    const dashboardBefore = await axios.get('http://localhost:3002/api/cashflow/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Dashboard before upload:');
    console.log('- Is real data:', dashboardBefore.data.data.isRealData);
    console.log('- Income:', dashboardBefore.data.data.currentMonth.totalIncome);
    
    // Kill backend
    backend.kill();
    console.log('\n\nTest complete. Backend killed.');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

clearAndTest();