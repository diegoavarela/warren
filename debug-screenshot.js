const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugCashFlow() {
  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Listen for console logs from the page
    page.on('console', msg => {
      console.log('BROWSER LOG:', msg.text());
    });
    
    // Listen for errors
    page.on('error', err => {
      console.log('PAGE ERROR:', err.message);
    });
    
    console.log('Navigating to login page...');
    await page.goto('http://localhost:4000/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Check if we're on login page and use development helper
    const isLoginPage = await page.$('input[type="email"]');
    if (isLoginPage) {
      console.log('Using development authentication helper...');
      
      // Use the development authentication helper
      await page.evaluate(() => {
        if (window.devQuickSetup) {
          return window.devQuickSetup();
        }
        return Promise.resolve();
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('Navigating to cash flow dashboard...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Taking screenshot...');
    await page.screenshot({
      path: '/Users/diegovarela/AI Agents/warren-v2/debug-cashflow.png',
      fullPage: true
    });
    
    // Get the actual text content to see what's being displayed
    const summaryCards = await page.$$eval('.space-y-8 [class*="grid"] > div', cards => {
      return cards.map(card => {
        const title = card.querySelector('h3, .text-sm')?.textContent?.trim();
        const value = card.querySelector('[class*="text-2xl"], [class*="text-3xl"], [class*="font-bold"]')?.textContent?.trim();
        return { title, value };
      });
    });
    
    console.log('Summary cards content:', JSON.stringify(summaryCards, null, 2));
    
    // Check if our test values are appearing
    const pageText = await page.evaluate(() => document.body.textContent);
    const hasTestValues = pageText.includes('TEST 60.2 M') || pageText.includes('TEST 54.7 M');
    console.log('Page contains test values:', hasTestValues);
    
    if (!hasTestValues) {
      console.log('Test values not found. Checking formatValue function...');
      
      // Check if the component is even loading our changes
      const componentLoaded = await page.evaluate(() => {
        return window.location.pathname === '/dashboard/company-admin/cashflow';
      });
      console.log('On correct URL:', componentLoaded);
    }
    
    console.log('Screenshot saved to debug-cashflow.png');
    
  } catch (error) {
    console.error('Error during debugging:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugCashFlow();