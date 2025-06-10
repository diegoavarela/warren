const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to standard desktop size
  await page.setViewport({ width: 1440, height: 900 });
  
  // Navigate to the home page
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  
  // Take screenshot
  await page.screenshot({ path: 'homepage-screenshot.png', fullPage: false });
  
  console.log('Screenshot saved as homepage-screenshot.png');
  console.log('Viewport height: 900px');
  
  // Get the actual height of the content
  const contentHeight = await page.evaluate(() => {
    return document.documentElement.scrollHeight;
  });
  
  console.log('Content height:', contentHeight + 'px');
  console.log('Content is', contentHeight > 900 ? 'TALLER' : 'SHORTER', 'than viewport');
  
  await browser.close();
})();