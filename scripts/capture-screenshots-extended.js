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
    headless: 'new',
    defaultViewport: {
      width: 1920,
      height: 1200
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1200']
  });

  const page = await browser.newPage();

  try {
    // Set screenshot mode in session storage
    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem('screenshotMode', 'true');
    });

    console.log('Capturing Cash Flow Dashboard components...');
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture full page screenshots
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-full.png'),
      fullPage: true
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cashflow-dashboard-hero.png'),
      fullPage: false
    });

    // Capture specific components by scrolling and finding them
    const componentsToCapture = [
      { text: 'January 2025 Cashflow Overview', filename: 'cashflow-overview.png' },
      { text: 'Year to Date Summary', filename: 'year-to-date.png' },
      { text: '2025 Full Year Overview', filename: 'cashflow-chart.png' },
      { text: 'Cash Runway Widget', filename: 'cash-runway.png' },
      { text: 'Burn Rate Trend', filename: 'burn-rate.png' },
      { text: 'Scenario Planning', filename: 'scenario-planning.png' },
      { text: 'Cash Flow Composition', filename: 'cashflow-composition.png' },
      { text: 'Banking Overview', filename: 'banking-overview.png' },
      { text: 'Investment Portfolio', filename: 'investments.png' },
      { text: 'Tax Overview', filename: 'taxes.png' },
      { text: 'Operational Cost Analysis', filename: 'operational-analysis.png' }
    ];

    for (const component of componentsToCapture) {
      try {
        // Find and capture component
        const element = await page.evaluateHandle((searchText) => {
          // Search in h2, h3, and h4 tags
          const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
          const heading = headings.find(h => h.textContent?.includes(searchText));
          
          if (heading) {
            // Find the parent card element
            let parent = heading.parentElement;
            while (parent && !parent.classList.contains('bg-white') && !parent.classList.contains('border')) {
              parent = parent.parentElement;
            }
            return parent || heading.parentElement;
          }
          return null;
        }, component.text);
        
        if (element && element.asElement()) {
          const box = await element.asElement().boundingBox();
          if (box) {
            // Scroll element into view
            await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), element);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Take screenshot
            await element.asElement().screenshot({
              path: path.join(SCREENSHOT_DIR, component.filename)
            });
            console.log(`Captured ${component.filename}`);
          }
        } else {
          console.log(`Could not find component: ${component.text}`);
        }
      } catch (error) {
        console.log(`Error capturing ${component.filename}:`, error.message);
      }
    }

    // Capture P&L Dashboard
    console.log('\nCapturing P&L Dashboard components...');
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

    // Capture P&L specific components
    const pnlComponents = [
      { text: 'P&L Summary', filename: 'pnl-summary.png' },
      { text: 'Revenue & Expense Trends', filename: 'revenue-trends.png' },
      { text: 'Margin Analysis', filename: 'margin-analysis.png' },
      { text: 'Personnel Costs', filename: 'personnel-costs.png' },
      { text: 'Cost Efficiency', filename: 'cost-efficiency.png' },
      { text: 'Revenue Growth', filename: 'revenue-growth.png' }
    ];

    for (const component of pnlComponents) {
      try {
        const element = await page.evaluateHandle((searchText) => {
          const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
          const heading = headings.find(h => h.textContent?.includes(searchText));
          
          if (heading) {
            let parent = heading.parentElement;
            while (parent && !parent.classList.contains('bg-white') && !parent.classList.contains('border')) {
              parent = parent.parentElement;
            }
            return parent || heading.parentElement;
          }
          return null;
        }, component.text);
        
        if (element && element.asElement()) {
          const box = await element.asElement().boundingBox();
          if (box) {
            await page.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }), element);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await element.asElement().screenshot({
              path: path.join(SCREENSHOT_DIR, component.filename)
            });
            console.log(`Captured ${component.filename}`);
          }
        } else {
          console.log(`Could not find component: ${component.text}`);
        }
      } catch (error) {
        console.log(`Error capturing ${component.filename}:`, error.message);
      }
    }

    console.log('\nAll screenshots captured successfully!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots();