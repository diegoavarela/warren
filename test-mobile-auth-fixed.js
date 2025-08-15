const puppeteer = require('puppeteer');

async function testMobileWithAuth() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('Starting authenticated mobile responsiveness test...');
    
    // Navigate to app
    console.log('Navigating to app...');
    await page.goto('http://localhost:4000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Click on "Sign In" button to get to login form
    console.log('Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation or modal
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find login inputs (might be in a modal or new page)
    let loginInputs = await page.$$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    
    if (loginInputs.length === 0) {
      // Try to navigate directly to login page
      console.log('Trying direct login page...');
      await page.goto('http://localhost:4000/login', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      loginInputs = await page.$$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    }
    
    if (loginInputs.length === 0) {
      // Try auth page
      console.log('Trying auth page...');
      await page.goto('http://localhost:4000/auth', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      loginInputs = await page.$$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    }
    
    if (loginInputs.length === 0) {
      console.log('Could not find login form. Taking screenshot and listing current page elements...');
      await page.screenshot({ path: 'no-login-form.png', fullPage: true });
      
      const currentInputs = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        }));
      });
      console.log('Current inputs:', currentInputs);
      
      // Skip login and try to access dashboard directly
      console.log('Trying to access dashboard directly...');
      await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
    } else {
      // Fill login credentials
      console.log('Found login form, logging in...');
      await page.type('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'diego.varela@vort-ex.com');
      await page.type('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'lachotadebill');
      
      // Submit login form
      await page.click('button[type="submit"], button:contains("Sign In"), button:contains("Login")');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      
      // Handle company selection if needed
      await new Promise(resolve => setTimeout(resolve, 3000));
      const companyText = await page.evaluate(() => document.body.textContent);
      if (companyText.includes('VTEX Solutions SRL')) {
        console.log('Looking for VTEX Solutions SRL...');
        const vtexLink = await page.$x("//a[contains(text(), 'VTEX Solutions SRL')] | //button[contains(text(), 'VTEX Solutions SRL')]");
        if (vtexLink.length > 0) {
          await vtexLink[0].click();
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        }
      }
      
      // Navigate to cash flow dashboard
      await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
    }
    
    console.log('Current URL:', await page.url());
    
    // Test different viewport sizes
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.width <= 390 ? 2 : 1
      });
      
      // Wait for layout to adjust
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Take screenshot
      await page.screenshot({
        path: `mobile-${viewport.name.toLowerCase().replace(' ', '-')}-dashboard.png`,
        fullPage: true
      });
      
      console.log(`Screenshot saved: mobile-${viewport.name.toLowerCase().replace(' ', '-')}-dashboard.png`);
      
      // Analyze responsive issues
      const analysis = await page.evaluate(() => {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        
        // Check for horizontal scroll
        const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        
        // Count dashboard elements
        const elements = {
          metricCards: document.querySelectorAll('[class*="metric"], .bg-white.rounded-xl').length,
          charts: document.querySelectorAll('canvas, [class*="chart"]').length,
          buttons: document.querySelectorAll('button').length,
          dropdowns: document.querySelectorAll('select, [role="combobox"]').length
        };
        
        // Check for overflow containers
        const overflowElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = getComputedStyle(el);
          return style.overflowX === 'auto' || style.overflowX === 'scroll';
        }).length;
        
        // Check for small touch targets (less than 44px)
        const smallButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        }).length;
        
        return {
          viewport,
          hasHorizontalScroll,
          elements,
          overflowElements,
          smallButtons
        };
      });
      
      console.log(`${viewport.name} Analysis:`, analysis);
      
      if (analysis.hasHorizontalScroll) {
        console.log(`❌ ${viewport.name}: Has horizontal scroll`);
      } else {
        console.log(`✅ ${viewport.name}: No horizontal scroll`);
      }
      
      if (analysis.smallButtons > 0) {
        console.log(`⚠️  ${viewport.name}: Found ${analysis.smallButtons} buttons smaller than 44px (touch target issue)`);
      }
      
      // Test interactions on mobile
      if (viewport.width <= 390) {
        console.log(`Testing mobile interactions for ${viewport.name}...`);
        
        // Test scrolling
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.evaluate(() => window.scrollTo(0, 0));
        
        console.log(`${viewport.name}: Scrolling test completed`);
      }
    }

    console.log('\n🎉 Mobile responsiveness test completed!');
    
  } catch (error) {
    console.error('Error during mobile testing:', error);
    
    // Take error screenshot
    try {
      const page = browser.defaultBrowserContext().pages()[0];
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('Error screenshot saved: error-screenshot.png');
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testMobileWithAuth();