const puppeteer = require('puppeteer');

async function debugLogin() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('Debugging login page structure...');
    
    // Navigate to app
    await page.goto('http://localhost:4000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Take screenshot to see current page
    await page.screenshot({
      path: 'debug-login-page.png',
      fullPage: true
    });
    
    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    console.log(`Page title: ${title}`);
    console.log(`Page URL: ${url}`);
    
    // Get all input fields
    const inputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }));
    });
    
    console.log('Found inputs:', inputs);
    
    // Get all buttons
    const buttons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(button => ({
        text: button.textContent?.trim(),
        type: button.type,
        className: button.className
      }));
    });
    
    console.log('Found buttons:', buttons);
    
    // Get all links
    const links = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map(link => ({
        text: link.textContent?.trim(),
        href: link.href
      }));
    });
    
    console.log('Found links:', links);
    
    console.log('Waiting 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Error debugging login:', error);
  } finally {
    await browser.close();
  }
}

debugLogin();