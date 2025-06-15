const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../frontend/public/screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: false, // Set to false to debug what's happening
    defaultViewport: null, // Use full screen
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await browser.newPage();
  
  // Set a realistic viewport
  await page.setViewport({ 
    width: 1920, 
    height: 1080,
    deviceScaleFactor: 1 
  });

  try {
    console.log('🚀 Starting screenshot capture...\n');

    // Set screenshot mode
    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem('screenshotMode', 'true');
      // Also disable animations for consistent screenshots
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });

    // === CAPTURE CASH FLOW DASHBOARD ===
    console.log('📊 Capturing Cash Flow Dashboard...');
    await page.goto(`${BASE_URL}/cashflow?screenshot=true`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for content to fully load
    await page.waitForTimeout(5000);
    
    // Verify we're on the right page
    const url = page.url();
    console.log(`Current URL: ${url}`);
    
    // Check if we have data loaded
    const hasData = await page.evaluate(() => {
      const metrics = document.querySelectorAll('[class*="grid-cols-5"] > div');
      return metrics.length > 0;
    });
    
    if (!hasData) {
      console.log('❌ No data found on dashboard. Waiting longer...');
      await page.waitForTimeout(10000);
    }

    // Hide UI elements that we don't want in screenshots
    await page.addStyleTag({
      content: `
        nav, [class*="Navbar"], header { display: none !important; }
        [class*="FileUploadSection"] { display: none !important; }
        .sticky { position: static !important; }
        body { padding-top: 0 !important; margin-top: 0 !important; }
        button[title*="help"], [class*="help"], .help-button { display: none !important; }
      `
    });

    await page.waitForTimeout(2000);

    // Take full page screenshot
    console.log('📸 Taking full dashboard screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-full.png'),
      fullPage: true,
      clip: null
    });

    // Take hero/viewport screenshot
    console.log('📸 Taking hero screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-hero.png'),
      fullPage: false,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });

    // === CAPTURE SPECIFIC COMPONENTS ===
    console.log('\n🔍 Capturing specific components...');
    
    const components = [
      {
        name: 'Metrics Overview',
        selector: '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-5',
        filename: 'cashflow-metrics.png'
      },
      {
        name: 'Monthly Overview',
        selector: 'h2:contains("Cashflow Overview")',
        filename: 'cashflow-overview.png',
        findBy: 'text'
      },
      {
        name: 'Year to Date',
        selector: 'h3:contains("Year to Date")',
        filename: 'year-to-date.png',
        findBy: 'text'
      },
      {
        name: 'Full Year Chart',
        selector: 'h3:contains("Full Year Overview")',
        filename: 'cashflow-chart.png',
        findBy: 'text'
      }
    ];

    for (const component of components) {
      try {
        console.log(`📸 Capturing ${component.name}...`);
        
        let element;
        if (component.findBy === 'text') {
          // Find by text content
          element = await page.evaluateHandle((text) => {
            const xpath = `//h2[contains(text(), "${text}")] | //h3[contains(text(), "${text}")] | //h4[contains(text(), "${text}")]`;
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const heading = result.singleNodeValue;
            
            if (heading) {
              // Find the parent container
              let parent = heading.parentElement;
              while (parent && !parent.classList.contains('bg-white') && !parent.classList.contains('border') && parent.tagName !== 'SECTION') {
                parent = parent.parentElement;
              }
              return parent || heading.parentElement;
            }
            return null;
          }, component.selector.replace(/.*:contains\("([^"]+)"\).*/, '$1'));
        } else {
          // Find by CSS selector
          element = await page.$(component.selector);
        }
        
        if (element) {
          // Scroll element into view
          await page.evaluate(el => {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          }, element);
          
          await page.waitForTimeout(1000);
          
          // Take screenshot of the element
          await element.screenshot({
            path: path.join(SCREENSHOT_DIR, component.filename)
          });
          
          console.log(`✅ Captured ${component.filename}`);
        } else {
          console.log(`❌ Could not find ${component.name}`);
        }
      } catch (error) {
        console.log(`❌ Error capturing ${component.name}:`, error.message);
      }
    }

    // === CAPTURE P&L DASHBOARD ===
    console.log('\n📊 Capturing P&L Dashboard...');
    await page.goto(`${BASE_URL}/pnl?screenshot=true`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);
    
    // Apply same styling
    await page.addStyleTag({
      content: `
        nav, [class*="Navbar"], header { display: none !important; }
        [class*="FileUploadSection"] { display: none !important; }
        .sticky { position: static !important; }
        body { padding-top: 0 !important; margin-top: 0 !important; }
        button[title*="help"], [class*="help"], .help-button { display: none !important; }
      `
    });

    await page.waitForTimeout(2000);

    console.log('📸 Taking P&L full screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'pnl-dashboard-full.png'),
      fullPage: true
    });

    console.log('📸 Taking P&L hero screenshot...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'pnl-dashboard-hero.png'),
      fullPage: false,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });

    console.log('\n🎉 All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);

    // List all captured files
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    console.log('\n📋 Captured files:');
    files.forEach(file => console.log(`   - ${file}`));

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

// Add error handling for the script
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
captureScreenshots().catch(console.error);