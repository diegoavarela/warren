const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('🔄 Navigating to login page...');
    await page.goto('http://localhost:4000', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    // Wait for login form to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check what selectors are available
    const loginElements = await page.evaluate(() => {
      const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
      const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
      const submitButtons = document.querySelectorAll('button[type="submit"], button');
      
      return {
        emailInputs: emailInputs.length,
        passwordInputs: passwordInputs.length,
        submitButtons: submitButtons.length,
        allInputs: document.querySelectorAll('input').length,
        allButtons: document.querySelectorAll('button').length
      };
    });
    
    console.log('🔍 Login form elements:', loginElements);
    
    // Login with company admin credentials
    console.log('🔑 Attempting to log in...');
    
    // Try different selectors for email
    try {
      await page.waitForSelector('input', { timeout: 5000 });
      const inputs = await page.$$('input');
      if (inputs.length >= 2) {
        await inputs[0].type('companyadmin@demo.com');
        await inputs[1].type('company123');
      }
      
      // Try to find submit button
      await page.click('button');
    } catch (e) {
      console.log('⚠️ Alternative login attempt failed:', e.message);
    }
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    console.log('✅ Logged in successfully');
    
    // Navigate to cash flow dashboard
    console.log('🔄 Navigating to cash flow dashboard...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    
    // Check what's on the page
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Wait for charts to load
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Look for any chart elements
    const chartElements = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const chartDivs = document.querySelectorAll('[class*="chart"]');
      const barCharts = document.querySelectorAll('.chartjs-render-monitor');
      const errorElements = document.querySelectorAll('[class*="error"]');
      
      return {
        canvases: canvases.length,
        chartDivs: chartDivs.length,
        barCharts: barCharts.length,
        errors: errorElements.length,
        hasChart: typeof window.Chart !== 'undefined',
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📊 Chart elements found:', chartElements);
    
    // Take a screenshot
    await page.screenshot({ 
      path: '/Users/diegovarela/AI Agents/warren-v2/cashflow-page-debug.png',
      fullPage: true 
    });
    
    console.log('✅ Debug screenshot captured');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();