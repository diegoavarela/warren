const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Your frontend URL
const SCREENSHOT_DIR = path.join(__dirname, '../frontend/public/screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    defaultViewport: {
      width: 1920,
      height: 1200
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1200'] // For compatibility
  });

  const page = await browser.newPage();

  try {
    // Set screenshot mode in session storage
    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem('screenshotMode', 'true');
    });

    // Capture Cash Flow Dashboard
    console.log('Capturing Cash Flow Dashboard...');
    await page.goto(`${BASE_URL}/cashflow?screenshot=true`, { waitUntil: 'networkidle2' });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Hide navbar and file upload section for cleaner screenshots
    await page.addStyleTag({
      content: `
        nav, [class*="Navbar"] { display: none !important; }
        [class*="FileUploadSection"] { display: none !important; }
        .sticky { position: static !important; }
        body { padding-top: 0 !important; }
      `
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Extra time for charts to render

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-full.png'),
      fullPage: true
    });

    // Take viewport screenshot (hero section)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-hero.png'),
      fullPage: false
    });

    // Capture specific sections
    const sections = [
      { selector: '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-5', name: 'cashflow-metrics' }
    ];
    
    // Additional specific widget captures
    const widgetSelectors = [
      { text: 'Cash Runway Widget', name: 'cash-runway' },
      { text: 'Burn Rate Trend', name: 'burn-rate' }
    ];

    for (const section of sections) {
      try {
        const element = await page.$(section.selector);
        if (element) {
          await element.screenshot({
            path: path.join(SCREENSHOT_DIR, `${section.name}.png`)
          });
          console.log(`Captured ${section.name}`);
        }
      } catch (error) {
        console.log(`Could not capture ${section.name}:`, error.message);
      }
    }
    
    // Capture widgets by finding their heading text
    for (const widget of widgetSelectors) {
      try {
        const element = await page.evaluateHandle((text) => {
          const headings = Array.from(document.querySelectorAll('h3'));
          const heading = headings.find(h => h.textContent?.includes(text));
          if (heading) {
            // Find the parent card element (usually 2-3 levels up)
            let parent = heading.parentElement;
            while (parent && !parent.classList.contains('bg-white')) {
              parent = parent.parentElement;
            }
            return parent;
          }
          return null;
        }, widget.text);
        
        if (element && element.asElement()) {
          await element.asElement().screenshot({
            path: path.join(SCREENSHOT_DIR, `${widget.name}.png`)
          });
          console.log(`Captured ${widget.name}`);
        }
      } catch (error) {
        console.log(`Could not capture ${widget.name}:`, error.message);
      }
    }

    // Capture P&L Dashboard
    console.log('Capturing P&L Dashboard...');
    await page.goto(`${BASE_URL}/pnl?screenshot=true`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Add the same styling for P&L page
    await page.addStyleTag({
      content: `
        nav, [class*="Navbar"] { display: none !important; }
        [class*="FileUploadSection"] { display: none !important; }
        .sticky { position: static !important; }
        body { padding-top: 0 !important; }
      `
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'pnl-dashboard-full.png'),
      fullPage: true
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'pnl-dashboard-hero.png'),
      fullPage: false
    });

    console.log('Screenshots captured successfully!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots();