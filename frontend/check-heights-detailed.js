const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Show browser
  const page = await browser.newPage();
  
  // Standard laptop viewport
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  
  // Wait a bit for any animations
  await page.waitForTimeout(1000);
  
  const measurements = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    
    // Get all main sections
    const sections = Array.from(document.querySelectorAll('div')).filter(div => {
      const rect = div.getBoundingClientRect();
      return rect.height > 100; // Only consider significant sections
    });
    
    return {
      bodyHeight: body.scrollHeight,
      htmlHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
      windowHeight: window.innerHeight,
      scrollable: html.scrollHeight > html.clientHeight,
      exceededBy: Math.max(0, html.scrollHeight - html.clientHeight),
      largeSections: sections.slice(0, 5).map(el => ({
        class: el.className,
        height: el.offsetHeight
      }))
    };
  });
  
  console.log('Page Analysis:');
  console.log('- Body height:', measurements.bodyHeight + 'px');
  console.log('- HTML height:', measurements.htmlHeight + 'px');
  console.log('- Client height:', measurements.clientHeight + 'px');
  console.log('- Window height:', measurements.windowHeight + 'px');
  console.log('- Is scrollable:', measurements.scrollable);
  console.log('- Content exceeds viewport by:', measurements.exceededBy + 'px');
  console.log('\nLarge sections:');
  measurements.largeSections.forEach((section, i) => {
    console.log(`${i + 1}. ${section.class.substring(0, 50)}... - ${section.height}px`);
  });
  
  // Take screenshot
  await page.screenshot({ path: 'homepage-laptop-view.png', fullPage: true });
  console.log('\nFull page screenshot saved as homepage-laptop-view.png');
  
  // Keep browser open for 5 seconds to see
  await page.waitForTimeout(5000);
  
  await browser.close();
})();