const puppeteer = require('puppeteer');

async function testMobileWithAuth() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('Starting authenticated mobile responsiveness test...');
    
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for login form to load
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Fill login credentials
    console.log('Logging in with diego.varela@vort-ex.com...');
    await page.type('input[type="email"], input[name="email"]', 'diego.varela@vort-ex.com');
    await page.type('input[type="password"], input[name="password"]', 'lachotadebill');
    
    // Submit login form
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Iniciar")');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    // Navigate to company selection or dashboard
    console.log('Looking for VTEX Solutions SRL...');
    await page.waitForTimeout(3000);
    
    // Check if we need to select a company
    const companyLinks = await page.$$('a, button');
    for (const link of companyLinks) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text && text.includes('VTEX Solutions SRL')) {
        console.log('Found VTEX Solutions SRL, clicking...');
        await link.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        break;
      }
    }
    
    // Navigate to cash flow dashboard
    console.log('Navigating to cash flow dashboard...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot
      await page.screenshot({
        path: `auth-mobile-test-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
      
      console.log(`Screenshot saved: auth-mobile-test-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
      
      // Check for horizontal scrollbars
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasHorizontalScroll) {
        console.log(`❌ ${viewport.name}: Has horizontal scroll (responsive issue detected)`);
      } else {
        console.log(`✅ ${viewport.name}: No horizontal scroll`);
      }
      
      // Check if dashboard elements are visible
      const elements = await page.evaluate(() => {
        const metrics = document.querySelectorAll('.metric-cards-container, [class*="metric"]').length;
        const charts = document.querySelectorAll('[class*="chart"], canvas').length;
        const cards = document.querySelectorAll('[class*="card"], .bg-white.rounded').length;
        return { metrics, charts, cards };
      });
      
      console.log(`${viewport.name}: Found ${elements.metrics} metric containers, ${elements.charts} charts, ${elements.cards} cards`);
      
      // Test specific mobile interactions on small screens
      if (viewport.width <= 390) {
        // Test dropdown interactions
        try {
          const dropdown = await page.$('select, [role="combobox"]');
          if (dropdown) {
            console.log(`${viewport.name}: Testing dropdown interaction`);
            await dropdown.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (e) {
          console.log(`${viewport.name}: No dropdown found for testing`);
        }
        
        // Test modal interactions if any
        try {
          const helpIcon = await page.$('[class*="help"], .help-icon');
          if (helpIcon) {
            console.log(`${viewport.name}: Testing help modal`);
            await helpIcon.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Close modal
            await page.keyboard.press('Escape');
          }
        } catch (e) {
          console.log(`${viewport.name}: No help icon found for testing`);
        }
      }
      
      // Scroll test for mobile
      if (viewport.width <= 768) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`${viewport.name}: Tested scrolling behavior`);
        
        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    console.log('\nMobile responsiveness test completed!');
    
  } catch (error) {
    console.error('Error during authenticated mobile testing:', error);
  } finally {
    await browser.close();
  }
}

testMobileWithAuth();