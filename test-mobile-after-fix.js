const puppeteer = require('puppeteer');

async function testMobileAfterFix() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('🔧 Testing mobile responsiveness AFTER hydration fixes...');
    
    // Navigate to dashboard directly
    console.log('📱 Navigating to cash flow dashboard...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Current URL:', await page.url());
    
    // Test viewport sizes
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPhone 12 Pro', width: 390, height: 844 },
      { name: 'iPhone SE', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.width <= 390 ? 2 : 1
      });
      
      // Wait longer for hydration and component mounting
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot
      const screenshotName = `mobile-fixed-${viewport.name.toLowerCase().replace(/ /g, '-')}.png`;
      await page.screenshot({
        path: screenshotName,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${screenshotName}`);
      
      // Comprehensive analysis after hydration fix
      const analysis = await page.evaluate((viewportName) => {
        const results = {
          viewport: viewportName,
          url: window.location.href,
          hasContent: false,
          hydrationComplete: document.querySelector('[data-testid="loading"]') === null,
          elements: {
            loading: document.querySelectorAll('[class*="animate-pulse"], [class*="loading"]').length,
            metricCards: document.querySelectorAll('[class*="metric"], .bg-white.rounded-xl, [class*="card"]').length,
            charts: document.querySelectorAll('canvas, [class*="chart"], svg').length,
            buttons: document.querySelectorAll('button').length,
            inputs: document.querySelectorAll('input, select, textarea').length,
            dashboardContent: document.querySelectorAll('[class*="dashboard"], [class*="cash"], [class*="flow"]').length
          },
          layout: {
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            bodyWidth: document.body ? document.body.scrollWidth : 0,
            windowWidth: window.innerWidth,
            contentHeight: document.body ? document.body.scrollHeight : 0
          },
          responsive: {
            gridContainers: document.querySelectorAll('[class*="grid"], [class*="md:"], [class*="lg:"]').length,
            hideOnMobile: document.querySelectorAll('[class*="hidden"], [class*="sm:block"], [class*="md:block"]').length
          },
          issues: []
        };
        
        // Check if page has meaningful content (not just loading state)
        results.hasContent = results.elements.metricCards > 0 || results.elements.charts > 0 || 
                            results.elements.dashboardContent > 0 || results.elements.buttons > 5;
        
        // Detect issues
        if (results.layout.hasHorizontalScroll) {
          results.issues.push('Horizontal scroll detected');
        }
        
        if (results.elements.loading > 0) {
          results.issues.push(`${results.elements.loading} loading elements still visible`);
        }
        
        // Check for mobile touch targets
        if (window.innerWidth <= 390) {
          const buttons = document.querySelectorAll('button, a[role="button"], [role="button"]');
          let smallTargets = 0;
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
              smallTargets++;
            }
          });
          if (smallTargets > 0) {
            results.issues.push(`${smallTargets} touch targets smaller than 44px`);
          }
        }
        
        return results;
      }, viewport.name);
      
      // Enhanced reporting
      console.log(`📊 ${viewport.name} Analysis:`);
      console.log(`   Content loaded: ${analysis.hasContent ? '✅ YES' : '❌ NO'}`);
      console.log(`   Loading elements: ${analysis.elements.loading}`);
      console.log(`   Metric cards: ${analysis.elements.metricCards}`);
      console.log(`   Charts: ${analysis.elements.charts}`);
      console.log(`   Buttons: ${analysis.elements.buttons}`);
      console.log(`   Responsive grids: ${analysis.responsive.gridContainers}`);
      console.log(`   Horizontal scroll: ${analysis.layout.hasHorizontalScroll ? '❌ YES' : '✅ NO'}`);
      console.log(`   Content height: ${analysis.layout.contentHeight}px`);
      
      if (analysis.issues.length > 0) {
        console.log(`   Issues: ⚠️  ${analysis.issues.join(', ')}`);
      } else {
        console.log(`   Issues: ✅ None detected`);
      }
      
      // Mobile-specific tests
      if (viewport.width <= 768) {
        console.log(`   📱 Running mobile-specific tests...`);
        
        // Test scroll behavior
        await page.evaluate(() => {
          window.scrollTo({ top: 200, behavior: 'smooth' });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`   ✅ Scroll behavior tested`);
        
        // Test any dropdown interactions
        try {
          const dropdown = await page.$('select, [role="combobox"]');
          if (dropdown) {
            console.log(`   📝 Testing dropdown interaction...`);
            await dropdown.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (e) {
          console.log(`   📝 No dropdowns found to test`);
        }
      }
    }

    console.log('\n🎉 HYDRATION FIX TEST COMPLETED!');
    console.log('\nKey improvements should be visible in the new screenshots.');
    
  } catch (error) {
    console.error('❌ Error during mobile testing after fix:', error);
    
    try {
      const page = browser.defaultBrowserContext().pages()[0];
      await page.screenshot({ path: 'error-after-fix.png', fullPage: true });
      console.log('📸 Error screenshot saved: error-after-fix.png');
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testMobileAfterFix();