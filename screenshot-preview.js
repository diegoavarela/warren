const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function takePreviewScreenshots() {
  console.log('🚀 Starting Puppeteer to capture expense cards preview...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to the preview HTML file
    const previewPath = `file://${path.join(__dirname, 'expense-cards-preview.html')}`;
    console.log(`📡 Loading preview from: ${previewPath}`);
    
    await page.goto(previewPath, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Wait a moment for everything to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'expense-cards-preview-full.png'),
      fullPage: true
    });
    console.log('✅ Full preview screenshot saved');

    // Take screenshot of just the comparison section
    console.log('📸 Taking comparison section screenshot...');
    const comparisonSection = await page.$('.grid.grid-cols-1.lg\\:grid-cols-2.gap-8.mb-12');
    if (comparisonSection) {
      await comparisonSection.screenshot({
        path: path.join(__dirname, 'screenshots', 'before-after-comparison.png')
      });
      console.log('✅ Before/After comparison screenshot saved');
    }

    // Take screenshot of the improved full layout
    console.log('📸 Taking improved layout screenshot...');
    const improvedLayout = await page.$('.bg-white.rounded-2xl.shadow-lg.p-6:last-of-type');
    if (improvedLayout) {
      await improvedLayout.screenshot({
        path: path.join(__dirname, 'screenshots', 'improved-expense-cards.png')
      });
      console.log('✅ Improved layout screenshot saved');
    }

    // Test responsive layouts
    const viewports = [
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 812, name: 'mobile' },
      { width: 1440, height: 900, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})...`);
      await page.setViewport(viewport);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.screenshot({
        path: path.join(__dirname, 'screenshots', `expense-cards-${viewport.name}.png`),
        fullPage: true
      });
      console.log(`✅ ${viewport.name} screenshot saved`);
    }

    // Test card interaction
    console.log('🖱️ Testing card interaction...');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Hover over a card to show the interaction
    const firstCard = await page.$('[class*="aspect-square"]:first-of-type');
    if (firstCard) {
      await firstCard.hover();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'card-hover-effect.png'),
        fullPage: false
      });
      console.log('✅ Card hover effect screenshot saved');
    }

    // Get card measurements for validation
    const cardMetrics = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="aspect-square"]');
      if (cards.length === 0) return { error: 'No cards found' };
      
      const results = [];
      cards.forEach((card, index) => {
        if (index < 3) { // Just check first 3 cards
          const rect = card.getBoundingClientRect();
          const styles = window.getComputedStyle(card);
          
          results.push({
            cardIndex: index,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            aspectRatio: Math.round((rect.width / rect.height) * 100) / 100,
            padding: styles.padding,
            isSquare: Math.abs(rect.width - rect.height) < 5 // Within 5px tolerance
          });
        }
      });
      
      return {
        totalCards: cards.length,
        sampleCards: results,
        allSquare: results.every(card => card.isSquare)
      };
    });
    
    console.log('📏 Card Validation Results:');
    console.log(JSON.stringify(cardMetrics, null, 2));
    
    // Save metrics to file
    fs.writeFileSync(
      path.join(__dirname, 'screenshots', 'card-metrics.json'),
      JSON.stringify(cardMetrics, null, 2)
    );

    console.log('🎉 All preview screenshots captured successfully!');
    console.log('📂 Check the screenshots folder for results');

  } catch (error) {
    console.error('❌ Error during preview capture:', error);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the preview capture
takePreviewScreenshots().catch(console.error);