const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('response', response => {
    console.log('RESPONSE:', response.url(), response.status());
  });
  
  try {
    console.log('1. Going to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log('2. Current URL:', page.url());
    
    console.log('3. Looking for Try Demo button...');
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => btn.textContent.trim())
    );
    console.log('Available buttons:', buttons);
    
    // Find and click the demo button
    const demoButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const demoButton = buttons.find(btn => btn.textContent.includes('Try Demo') && !btn.textContent.includes('Try Demo Now'));
      if (demoButton) {
        demoButton.click();
        return true;
      }
      return false;
    });
    
    if (demoButtonClicked) {
      console.log('4. Demo button clicked successfully');
    } else {
      console.log('Could not find or click demo button');
      await browser.close();
      return;
    }
    
    console.log('5. Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('6. New URL:', page.url());
    
    // Check if we're on the demo page
    if (page.url().includes('/demo/cashflow')) {
      console.log('✅ Successfully navigated to demo page!');
      
      // Check for demo banner
      const demoBanner = await page.$('text=Demo Mode');
      if (demoBanner) {
        console.log('✅ Demo banner found!');
      } else {
        console.log('❌ Demo banner not found');
      }
      
    } else if (page.url().includes('/login')) {
      console.log('❌ Redirected to login page');
      
      // Check what's on the login page
      const pageContent = await page.content();
      console.log('Login page content (first 500 chars):', pageContent.substring(0, 500));
      
    } else {
      console.log('❌ Unexpected URL:', page.url());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('7. Keeping browser open for inspection...');
  // Don't close the browser so we can inspect
  // await browser.close();
})();