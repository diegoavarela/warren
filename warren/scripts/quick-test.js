const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Quick test for landing page only
const viewports = {
  'mobile': { width: 375, height: 667, description: 'iPhone SE' },
  'tablet': { width: 768, height: 1024, description: 'iPad' },
  'desktop': { width: 1920, height: 1080, description: 'Desktop' }
};

async function quickTest() {
  console.log('🚀 Quick responsive test for landing page...');
  
  // Create screenshots directory
  const outputDir = './screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let screenshots = 0;
  
  for (const [name, viewport] of Object.entries(viewports)) {
    console.log(`📱 Testing ${name} (${viewport.width}x${viewport.height})`);
    
    // Set viewport
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1
    });
    
    // Go to landing page
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle0' });
    
    // Wait a bit for animations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot
    const filename = `landing_${name}_${viewport.width}x${viewport.height}.png`;
    await page.screenshot({
      path: path.join(outputDir, filename),
      fullPage: true,
      type: 'png'
    });
    
    console.log(`✅ Screenshot saved: ${filename}`);
    screenshots++;
  }
  
  await browser.close();
  console.log(`🎉 Quick test complete! ${screenshots} screenshots taken.`);
}

quickTest().catch(console.error);