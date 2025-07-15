const puppeteer = require('puppeteer');
const path = require('path');

async function testEnhancedMapper() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    console.log('🚀 Starting enhanced mapper test...');

    // Navigate to the application
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to home page');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Take screenshot of home page
    await page.screenshot({ path: 'screenshots/01-home.png', fullPage: true });
    console.log('📸 Screenshot: Home page');

    // Check if we need to login first
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      console.log('🔐 Login required - filling credentials...');
      
      // Fill login form (adjust selectors as needed)
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(3000);
      console.log('✅ Login completed');
    }

    // Navigate to upload page
    await page.goto('http://localhost:3000/upload');
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to upload page');

    // Take screenshot of upload page
    await page.screenshot({ path: 'screenshots/02-upload.png', fullPage: true });
    console.log('📸 Screenshot: Upload page');

    // Check viewport dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight
    }));
    
    console.log('📏 Viewport dimensions:', viewport);

    // Upload a test file (you'll need to provide a test Excel file)
    const testFilePath = path.join(__dirname, 'test-files', 'sample-pnl.xlsx');
    
    try {
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(testFilePath);
        console.log('📁 Test file uploaded');
        
        // Wait for file processing
        await page.waitForTimeout(5000);
        
        // Take screenshot after upload
        await page.screenshot({ path: 'screenshots/03-after-upload.png', fullPage: true });
        console.log('📸 Screenshot: After upload');
      }
    } catch (error) {
      console.log('⚠️ Could not upload test file:', error.message);
      
      // Continue with manual navigation to enhanced mapper
      await page.goto('http://localhost:3000/enhanced-mapper');
      await page.waitForTimeout(3000);
      console.log('✅ Navigated directly to enhanced mapper');
    }

    // Test the enhanced mapper interface
    console.log('🧪 Testing enhanced mapper interface...');

    // Wait for the mapper to load
    await page.waitForSelector('.bg-white', { timeout: 10000 });
    
    // Check if elements are visible without scrolling
    const elementsToCheck = [
      { selector: 'h1', name: 'Header' },
      { selector: '[data-testid="account-tree"], .bg-white', name: 'Account Tree' },
      { selector: 'button[class*="bg-blue"]', name: 'Action Buttons' }
    ];

    for (const element of elementsToCheck) {
      try {
        await page.waitForSelector(element.selector, { timeout: 5000 });
        const isVisible = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }, element.selector);
        
        console.log(`${isVisible ? '✅' : '❌'} ${element.name} visible without scrolling: ${isVisible}`);
      } catch (error) {
        console.log(`❌ ${element.name} not found: ${error.message}`);
      }
    }

    // Take screenshot of enhanced mapper
    await page.screenshot({ path: 'screenshots/04-enhanced-mapper.png', fullPage: true });
    console.log('📸 Screenshot: Enhanced mapper');

    // Measure scroll requirements
    const scrollInfo = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      return {
        windowHeight: window.innerHeight,
        documentHeight: Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        ),
        scrollRequired: Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        ) > window.innerHeight
      };
    });

    console.log('📊 Scroll Analysis:', scrollInfo);

    // Test scrolling behavior
    if (scrollInfo.scrollRequired) {
      console.log('⚠️ Scrolling required - testing scroll behavior...');
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      // Take screenshot at bottom
      await page.screenshot({ path: 'screenshots/05-mapper-bottom.png', fullPage: false });
      console.log('📸 Screenshot: Mapper bottom');
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
    }

    // Test account tree interaction
    console.log('🌳 Testing account tree interactions...');
    
    try {
      // Look for account tree items
      const accountItems = await page.$$('[class*="cursor-pointer"][class*="rounded-lg"]');
      
      if (accountItems.length > 0) {
        console.log(`Found ${accountItems.length} account items`);
        
        // Click on first account
        await accountItems[0].click();
        await page.waitForTimeout(1000);
        
        // Take screenshot after selection
        await page.screenshot({ path: 'screenshots/06-account-selected.png', fullPage: true });
        console.log('📸 Screenshot: Account selected');
        
        // Check if right panel is visible
        const rightPanelVisible = await page.evaluate(() => {
          const rightPanel = document.querySelector('[class*="flex-1"][class*="bg-gray-50"]');
          if (!rightPanel) return false;
          const rect = rightPanel.getBoundingClientRect();
          return rect.right <= window.innerWidth && rect.left >= 0;
        });
        
        console.log(`${rightPanelVisible ? '✅' : '❌'} Right panel visible: ${rightPanelVisible}`);
      }
    } catch (error) {
      console.log('⚠️ Could not test account tree:', error.message);
    }

    // Test category dropdown
    console.log('📋 Testing category dropdown...');
    
    try {
      // Look for category dropdown
      const categoryDropdown = await page.$('[class*="cursor-pointer"][class*="rounded-md"]');
      
      if (categoryDropdown) {
        await categoryDropdown.click();
        await page.waitForTimeout(1000);
        
        // Check if dropdown is visible
        const dropdownVisible = await page.evaluate(() => {
          const dropdown = document.querySelector('[class*="absolute"][class*="z-10"]');
          if (!dropdown) return false;
          const rect = dropdown.getBoundingClientRect();
          return rect.bottom <= window.innerHeight && rect.top >= 0;
        });
        
        console.log(`${dropdownVisible ? '✅' : '❌'} Dropdown visible: ${dropdownVisible}`);
        
        // Take screenshot with dropdown open
        await page.screenshot({ path: 'screenshots/07-dropdown-open.png', fullPage: true });
        console.log('📸 Screenshot: Dropdown open');
        
        // Close dropdown
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } catch (error) {
      console.log('⚠️ Could not test category dropdown:', error.message);
    }

    // Final measurements
    const finalMeasurements = await page.evaluate(() => {
      const header = document.querySelector('h1')?.getBoundingClientRect();
      const mainContent = document.querySelector('[class*="flex-1"][class*="flex"]')?.getBoundingClientRect();
      const actionButtons = document.querySelector('[class*="bg-blue"]')?.getBoundingClientRect();
      
      return {
        header: header ? { top: header.top, height: header.height } : null,
        mainContent: mainContent ? { top: mainContent.top, height: mainContent.height } : null,
        actionButtons: actionButtons ? { top: actionButtons.top, height: actionButtons.height } : null,
        windowHeight: window.innerHeight
      };
    });

    console.log('📐 Final measurements:', finalMeasurements);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      viewport: viewport,
      scrollInfo: scrollInfo,
      measurements: finalMeasurements,
      issues: []
    };

    if (scrollInfo.scrollRequired) {
      report.issues.push('Content height exceeds viewport - scrolling required');
    }

    if (finalMeasurements.actionButtons && finalMeasurements.actionButtons.top > viewport.height) {
      report.issues.push('Action buttons not visible without scrolling');
    }

    console.log('📋 Test Report:', report);

    // Save report
    require('fs').writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('💾 Test report saved to test-report.json');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

testEnhancedMapper().catch(console.error);