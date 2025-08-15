const puppeteer = require('puppeteer');

async function validateSearchChanges() {
  console.log('🚀 Validating Excel Search UI Changes...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  
  try {
    // Navigate to the homepage first
    console.log('📡 Navigating to homepage...');
    await page.goto('http://localhost:4000', {
      waitUntil: 'networkidle2'
    });
    
    await page.screenshot({ path: 'test-homepage.png', fullPage: false });
    console.log('📸 Homepage screenshot saved: test-homepage.png');
    
    // Check if the server is running properly
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Wait a moment to see if any content loads
    await page.waitForTimeout(3000);
    
    // Check for any visible content
    const bodyText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 200);
    });
    
    console.log(`📝 Page content preview: ${bodyText}`);
    
    // Check if there are any links or navigation elements
    const links = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.href
      })).filter(link => link.text && link.text.length > 0).slice(0, 5)
    );
    
    console.log('🔗 Found links:');
    links.forEach(link => console.log(`   - ${link.text}: ${link.href}`));
    
    // Try to find any configuration-related elements
    const configElements = await page.$$eval('*', elements => 
      Array.from(elements)
        .filter(el => el.textContent?.toLowerCase().includes('config') || 
                     el.textContent?.toLowerCase().includes('excel') ||
                     el.textContent?.toLowerCase().includes('warren'))
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 0 && text.length < 100)
        .slice(0, 5)
    );
    
    if (configElements.length > 0) {
      console.log('⚙️ Found configuration-related elements:');
      configElements.forEach(text => console.log(`   - ${text}`));
    }
    
    await page.screenshot({ path: 'test-validation-final.png', fullPage: true });
    console.log('📸 Full page screenshot saved: test-validation-final.png');
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    await page.screenshot({ path: 'test-validation-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: test-validation-error.png');
  } finally {
    await browser.close();
    console.log('\n🏁 Search UI Validation Complete');
  }
}

// Run the validation
validateSearchChanges().catch(console.error);