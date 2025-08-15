const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 100,
    args: ['--no-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('🔄 Opening browser to check the site manually...');
    await page.goto('http://localhost:4000', { 
      waitUntil: 'networkidle0', 
      timeout: 20000 
    });
    
    // Just wait and let user manually navigate to test the chart
    console.log('✅ Browser opened. Please manually login and navigate to cash flow dashboard to test the chart.');
    console.log('📍 URL to navigate to: http://localhost:4000/dashboard/company-admin/cashflow');
    
    // Keep the browser open for manual testing
    await new Promise(resolve => {
      console.log('🔍 Browser will stay open for 60 seconds for manual testing...');
      setTimeout(resolve, 60000);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed.');
  }
})();