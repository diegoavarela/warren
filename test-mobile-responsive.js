const puppeteer = require('puppeteer');
const fs = require('fs');

async function testMobileResponsive() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Test different viewport sizes
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 }
    ];

    console.log('Starting mobile responsiveness test...');
    
    // Navigate to the cash flow dashboard
    console.log('Navigating to localhost:4000...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    for (const viewport of viewports) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1
      });
      
      // Wait for layout to adjust
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot
      const screenshot = await page.screenshot({
        path: `mobile-test-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
      
      console.log(`Screenshot saved: mobile-test-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
      
      // Check for horizontal scrollbars (indicates responsive issues)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasHorizontalScroll) {
        console.log(`❌ ${viewport.name}: Has horizontal scroll (responsive issue detected)`);
      } else {
        console.log(`✅ ${viewport.name}: No horizontal scroll`);
      }
      
      // Check if elements are properly visible
      const cardElements = await page.$$('.metric-cards-container > div');
      console.log(`${viewport.name}: Found ${cardElements.length} metric cards`);
      
      // Test scrolling on small devices
      if (viewport.width <= 390) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`${viewport.name}: Scrolled to bottom successfully`);
      }
    }

  } catch (error) {
    console.error('Error during mobile testing:', error);
  } finally {
    await browser.close();
  }
}

testMobileResponsive();