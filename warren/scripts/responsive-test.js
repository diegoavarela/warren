const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Define all viewport sizes
const viewports = {
  'mobile-se': { width: 375, height: 667, description: 'iPhone SE' },
  'mobile-12': { width: 390, height: 844, description: 'iPhone 12' },
  'mobile-14': { width: 430, height: 932, description: 'iPhone 14 Pro' },
  'tablet': { width: 768, height: 1024, description: 'iPad' },
  'tablet-air': { width: 820, height: 1180, description: 'iPad Air' },
  'tablet-landscape': { width: 1024, height: 768, description: 'Tablet Landscape' },
  'desktop-small': { width: 1366, height: 768, description: 'Small Desktop' },
  'desktop-fhd': { width: 1920, height: 1080, description: 'Full HD Desktop' },
  'desktop-2k': { width: 2560, height: 1440, description: '2K Desktop' },
  'tv-4k': { width: 3840, height: 2160, description: '4K TV' }
};

// Define pages to test
const pages = [
  { url: '/', name: 'landing-page', needsAuth: false },
  { url: '/login', name: 'login-page', needsAuth: false },
  { url: '/dashboard', name: 'dashboard', needsAuth: true },
  { url: '/dashboard/company-admin/pnl', name: 'pnl-dashboard', needsAuth: true },
  { url: '/dashboard/company-admin/cashflow', name: 'cashflow-dashboard', needsAuth: true },
  { url: '/dashboard/company-admin/uploads', name: 'uploads-history', needsAuth: true },
  { url: '/dashboard/platform-admin', name: 'platform-admin', needsAuth: true },
  { url: '/dashboard/org-admin', name: 'org-admin', needsAuth: true }
];

// Configuration
const config = {
  baseUrl: 'http://localhost:4000',
  outputDir: './screenshots',
  loginEmail: 'platform@warren.com',
  loginPassword: 'platform123',
  waitForNetwork: 2000, // Wait 2 seconds for animations/network
  quality: 90
};

class ResponsiveTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      totalScreenshots: 0,
      errors: [],
      summary: {}
    };
  }

  async init() {
    console.log('🚀 Starting Warren Responsive Test Suite...');
    
    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set default viewport and user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Browser launched successfully');
  }

  async login() {
    console.log('🔐 Logging in...');
    
    try {
      await this.page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle0' });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fill login form - check multiple selectors
      const emailInputs = await this.page.$$('input[type="email"], input[name="email"], #email');
      const passwordInputs = await this.page.$$('input[type="password"], input[name="password"], #password');
      
      if (emailInputs.length > 0) {
        await emailInputs[0].type(config.loginEmail);
      } else {
        console.log('❌ Email input not found');
        return false;
      }
      
      if (passwordInputs.length > 0) {
        await passwordInputs[0].type(config.loginPassword);
      } else {
        console.log('❌ Password input not found');
        return false;
      }
      
      // Submit form - look for submit buttons
      const submitButtons = await this.page.$$('button[type="submit"], .submit-btn, button');
      let buttonClicked = false;
      
      for (const button of submitButtons) {
        const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('sign in') || text.includes('login') || text.includes('iniciar')) {
          await button.click();
          buttonClicked = true;
          break;
        }
      }
      
      if (!buttonClicked && submitButtons.length > 0) {
        // Fallback to first submit button
        await submitButtons[0].click();
        buttonClicked = true;
      }
      
      if (!buttonClicked) {
        console.log('❌ Submit button not found');
        return false;
      }
      
      // Wait for redirect with timeout
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        console.log('✅ Login successful');
        return true;
      } catch (navError) {
        console.log('⚠️ Navigation timeout, but may still be logged in');
        // Check if we're on dashboard page
        const url = this.page.url();
        if (url.includes('/dashboard')) {
          console.log('✅ Login successful (dashboard detected)');
          return true;
        }
        return false;
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      this.results.errors.push(`Login failed: ${error.message}`);
      return false;
    }
  }

  async takeScreenshot(url, pageName, viewportName, viewport) {
    try {
      // Set viewport
      await this.page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1
      });

      // Navigate to page
      await this.page.goto(`${config.baseUrl}${url}`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for animations and content to load
      await new Promise(resolve => setTimeout(resolve, config.waitForNetwork));

      // Take screenshot
      const filename = `${pageName}_${viewportName}_${viewport.width}x${viewport.height}.png`;
      const filepath = path.join(config.outputDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });

      console.log(`📸 Screenshot saved: ${filename}`);
      this.results.totalScreenshots++;
      
      return { success: true, filename, filepath };
    } catch (error) {
      const errorMsg = `Failed to screenshot ${pageName} at ${viewportName}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.results.errors.push(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async testResponsiveness() {
    console.log('📱 Starting responsive tests...');
    
    let loggedIn = false;

    for (const page of pages) {
      console.log(`\n🔍 Testing page: ${page.name} (${page.url})`);
      
      // Login if needed and not already logged in
      if (page.needsAuth && !loggedIn) {
        loggedIn = await this.login();
        if (!loggedIn) {
          console.log(`⏭️  Skipping ${page.name} - authentication required`);
          continue;
        }
      }

      this.results.summary[page.name] = {
        url: page.url,
        needsAuth: page.needsAuth,
        screenshots: {},
        errors: []
      };

      // Test all viewports for this page
      for (const [viewportName, viewport] of Object.entries(viewports)) {
        console.log(`  📐 Testing ${viewportName} (${viewport.width}x${viewport.height}) - ${viewport.description}`);
        
        const result = await this.takeScreenshot(page.url, page.name, viewportName, viewport);
        
        this.results.summary[page.name].screenshots[viewportName] = {
          viewport: viewport,
          result: result
        };

        if (!result.success) {
          this.results.summary[page.name].errors.push(result.error);
        }
      }
    }
  }

  async generateReport() {
    console.log('📋 Generating test report...');
    
    const reportPath = path.join(config.outputDir, 'responsive-test-report.json');
    const htmlReportPath = path.join(config.outputDir, 'responsive-test-report.html');
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('✅ Reports generated:');
    console.log(`   📄 JSON: ${reportPath}`);
    console.log(`   🌐 HTML: ${htmlReportPath}`);
  }

  generateHtmlReport() {
    const pages = Object.keys(this.results.summary);
    const viewportNames = Object.keys(viewports);
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warren Responsive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; margin-bottom: 10px; }
        .summary { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .summary-item { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: white; border-radius: 4px; border-left: 4px solid #2563eb; }
        .error { color: #dc2626; background: #fef2f2; border-left-color: #dc2626; }
        .success { color: #059669; background: #f0fdf4; border-left-color: #059669; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .screenshot-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; background: white; }
        .screenshot-item img { width: 100%; height: auto; border-radius: 4px; }
        .viewport-info { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .error-item { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Warren Responsive Test Report</h1>
        <p><strong>Generated:</strong> ${this.results.timestamp}</p>
        
        <div class="summary">
            <div class="summary-item success">
                <strong>${this.results.totalScreenshots}</strong><br>Screenshots Taken
            </div>
            <div class="summary-item ${this.results.errors.length > 0 ? 'error' : 'success'}">
                <strong>${this.results.errors.length}</strong><br>Errors
            </div>
            <div class="summary-item">
                <strong>${pages.length}</strong><br>Pages Tested
            </div>
            <div class="summary-item">
                <strong>${viewportNames.length}</strong><br>Viewports Tested
            </div>
        </div>`;

    if (this.results.errors.length > 0) {
      html += `<h2>❌ Errors</h2>`;
      this.results.errors.forEach(error => {
        html += `<div class="error-item">${error}</div>`;
      });
    }

    html += `<h2>📊 Test Results</h2>`;
    
    pages.forEach(pageName => {
      const pageData = this.results.summary[pageName];
      html += `
        <h3>🏠 ${pageName} ${pageData.needsAuth ? '🔐' : ''}</h3>
        <p><code>${pageData.url}</code></p>
        
        <div class="screenshot-grid">`;
      
      viewportNames.forEach(viewportName => {
        const screenshot = pageData.screenshots[viewportName];
        if (screenshot && screenshot.result.success) {
          html += `
            <div class="screenshot-item">
                <img src="${screenshot.result.filename}" alt="${pageName} - ${viewportName}">
                <strong>${viewportName}</strong>
                <div class="viewport-info">${screenshot.viewport.width}×${screenshot.viewport.height}<br>${screenshot.viewport.description}</div>
            </div>`;
        }
      });
      
      html += `</div>`;
      
      if (pageData.errors.length > 0) {
        html += `<h4>Errors:</h4>`;
        pageData.errors.forEach(error => {
          html += `<div class="error-item">${error}</div>`;
        });
      }
    });

    html += `
    </div>
</body>
</html>`;
    
    return html;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testResponsiveness();
      await this.generateReport();
      
      console.log('\n🎉 Responsive testing completed!');
      console.log(`📊 Total screenshots: ${this.results.totalScreenshots}`);
      console.log(`❌ Total errors: ${this.results.errors.length}`);
      
      if (this.results.errors.length === 0) {
        console.log('✅ All tests passed successfully!');
      } else {
        console.log('⚠️  Some tests had issues - check the report for details.');
      }
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      this.results.errors.push(`Test suite failure: ${error.message}`);
    } finally {
      await this.close();
    }
  }
}

// Add to package.json scripts
const updatePackageJson = () => {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!packageJson.scripts['test:responsive']) {
    packageJson.scripts['test:responsive'] = 'node scripts/responsive-test.js';
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added test:responsive script to package.json');
  }
};

// Run if called directly
if (require.main === module) {
  updatePackageJson();
  const testSuite = new ResponsiveTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = ResponsiveTestSuite;