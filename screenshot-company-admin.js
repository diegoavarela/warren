const puppeteer = require('puppeteer');

async function captureCompanyAdmin() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // First login
    await page.goto('http://localhost:4000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for login form elements
    await page.waitForSelector('input[placeholder="you@email.com"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    // Fill login form with Company Admin credentials
    await page.type('input[placeholder="you@email.com"]', 'companyadmin@demo.com');
    await page.type('input[type="password"]', 'company123');
    
    // Click sign in button
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navigate to company admin page
    await page.goto('http://localhost:4000/dashboard/company-admin', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait a moment for any animations
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot of the full page
    await page.screenshot({ 
      path: '/Users/diegovarela/AI Agents/warren-v2/screenshots/company-admin-full.png',
      fullPage: true
    });

    // Take screenshot of viewport (what user sees initially)
    await page.screenshot({ 
      path: '/Users/diegovarela/AI Agents/warren-v2/screenshots/company-admin-viewport.png',
      fullPage: false
    });

    console.log('Screenshots saved:');
    console.log('- Full page: screenshots/company-admin-full.png');
    console.log('- Viewport: screenshots/company-admin-viewport.png');

  } catch (error) {
    console.error('Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

captureCompanyAdmin();