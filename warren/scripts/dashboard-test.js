const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Viewports for testing
const viewports = {
  'mobile-se': { width: 375, height: 667, description: 'iPhone SE' },
  'mobile-12': { width: 390, height: 844, description: 'iPhone 12' },
  'tablet': { width: 768, height: 1024, description: 'iPad' },
  'tablet-landscape': { width: 1024, height: 768, description: 'Tablet Landscape' },
  'desktop-small': { width: 1366, height: 768, description: 'Small Desktop' },
  'desktop-fhd': { width: 1920, height: 1080, description: 'Full HD Desktop' },
  'desktop-2k': { width: 2560, height: 1440, description: '2K Desktop' }
};

// Dashboard pages to test
const dashboardPages = [
  { url: '/dashboard', name: 'main-dashboard' },
  { url: '/dashboard/company-admin/pnl', name: 'pnl-dashboard' },
  { url: '/dashboard/company-admin/cashflow', name: 'cashflow-dashboard' },
  { url: '/dashboard/company-admin/uploads', name: 'uploads-dashboard' }
];

const config = {
  baseUrl: 'http://localhost:4000',
  outputDir: './screenshots/dashboard',
  loginEmail: 'diego.varela@vort-ex.com',
  loginPassword: 'password123',
  waitForNetwork: 3000
};

class DashboardTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.authenticated = false;
    this.results = {
      timestamp: new Date().toISOString(),
      screenshots: 0,
      errors: []
    };
  }

  async init() {
    console.log('🚀 Starting Dashboard Responsive Test...');
    
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
        '--disable-web-security'
      ]
    });

    this.page = await this.browser.newPage();
    console.log('✅ Browser launched');
  }

  async login() {
    console.log('🔐 Attempting login...');
    
    try {
      await this.page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Find and fill email using ID selector
      const emailInput = await this.page.$('#email');
      if (!emailInput) {
        throw new Error('Email input not found');
      }
      await emailInput.evaluate(el => el.value = '');
      await emailInput.type(config.loginEmail);
      
      // Find and fill password using ID selector
      const passwordInput = await this.page.$('#password');
      if (!passwordInput) {
        throw new Error('Password input not found');
      }
      await passwordInput.evaluate(el => el.value = '');
      await passwordInput.type(config.loginPassword);
      
      // Find submit button by type
      const submitButton = await this.page.$('button[type="submit"]');
      if (!submitButton) {
        throw new Error('Submit button not found');
      }
      
      await submitButton.click();
      
      // Wait for navigation - try multiple approaches
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      } catch (navError) {
        // Check if we're logged in by looking at URL
        await new Promise(resolve => setTimeout(resolve, 3000));
        const currentUrl = this.page.url();
        if (!currentUrl.includes('/dashboard')) {
          throw new Error('Login failed - not redirected to dashboard');
        }
      }
      
      console.log('✅ Login successful');
      this.authenticated = true;
      return true;
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      this.results.errors.push(`Login failed: ${error.message}`);
      return false;
    }
  }

  async takeScreenshot(url, pageName, viewportName, viewport) {
    try {
      console.log(`  📸 Testing ${viewportName} (${viewport.width}x${viewport.height})`);
      
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

      // Wait for content to load and animations
      await new Promise(resolve => setTimeout(resolve, config.waitForNetwork));

      // Take screenshot
      const filename = `${pageName}_${viewportName}_${viewport.width}x${viewport.height}.png`;
      const filepath = path.join(config.outputDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });

      console.log(`    ✅ Screenshot saved: ${filename}`);
      this.results.screenshots++;
      
      return { success: true, filename };
    } catch (error) {
      const errorMsg = `Screenshot failed for ${pageName} at ${viewportName}: ${error.message}`;
      console.error(`    ❌ ${errorMsg}`);
      this.results.errors.push(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async testDashboards() {
    if (!this.authenticated) {
      console.log('❌ Not authenticated, skipping dashboard tests');
      return;
    }

    console.log('📱 Testing dashboard pages...');
    
    for (const page of dashboardPages) {
      console.log(`\\n🔍 Testing: ${page.name} (${page.url})`);
      
      // Test key viewports first (mobile, tablet, desktop)
      const keyViewports = ['mobile-se', 'tablet', 'desktop-fhd'];
      
      for (const viewportName of keyViewports) {
        const viewport = viewports[viewportName];
        await this.takeScreenshot(page.url, page.name, viewportName, viewport);
      }
    }
  }

  async generateSummary() {
    const summary = {
      ...this.results,
      viewportsTested: Object.keys(viewports).length,
      pagesTested: dashboardPages.length
    };
    
    const summaryPath = path.join(config.outputDir, 'dashboard-test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\\n📋 Test Summary:');
    console.log(`   📸 Screenshots: ${this.results.screenshots}`);
    console.log(`   ❌ Errors: ${this.results.errors.length}`);
    console.log(`   📄 Summary saved: ${summaryPath}`);
    
    if (this.results.errors.length > 0) {
      console.log('\\n⚠️ Errors encountered:');
      this.results.errors.forEach(error => console.log(`   • ${error}`));
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      const loginSuccess = await this.login();
      if (loginSuccess) {
        await this.testDashboards();
      }
      
      await this.generateSummary();
      
      console.log('\\n🎉 Dashboard responsive testing completed!');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      this.results.errors.push(`Test suite failure: ${error.message}`);
    } finally {
      await this.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new DashboardTester();
  tester.run().catch(console.error);
}

module.exports = DashboardTester;