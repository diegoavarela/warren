const puppeteer = require('puppeteer');

async function simpleMobileTest() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('Starting simple mobile test...');
    
    // Try to access dashboard directly first
    console.log('Trying direct access to dashboard...');
    await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('Current URL:', await page.url());
    
    // If we're redirected to login, handle it
    if (await page.url().includes('login') || await page.url().includes('auth') || await page.url().includes('signin')) {
      console.log('Redirected to login, handling authentication...');
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to find and fill login form
      try {
        const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
        const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
        
        if (emailInput && passwordInput) {
          console.log('Found login form, filling credentials...');
          await emailInput.type('diego.varela@vort-ex.com');
          await passwordInput.type('lachotadebill');
          
          // Find and click submit button
          const submitButton = await page.$('button[type="submit"]') || await page.$('button');
          if (submitButton) {
            await submitButton.click();
            console.log('Clicked submit button, waiting for navigation...');
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
            
            // Try to navigate to cash flow dashboard again
            await page.goto('http://localhost:4000/dashboard/company-admin/cashflow', {
              waitUntil: 'networkidle0',
              timeout: 15000
            });
          }
        } else {
          console.log('Could not find login form inputs');
        }
      } catch (loginError) {
        console.log('Error during login:', loginError.message);
      }
    }
    
    // Test mobile viewports regardless of auth status
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPhone SE', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.width <= 390 ? 2 : 1
      });
      
      // Wait for layout adjustment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot
      const screenshotName = `responsive-${viewport.name.toLowerCase().replace(' ', '-')}.png`;
      await page.screenshot({
        path: screenshotName,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${screenshotName}`);
      
      // Analyze page content and responsive issues
      const analysis = await page.evaluate((viewportName) => {
        const results = {
          viewport: viewportName,
          url: window.location.href,
          title: document.title,
          hasContent: false,
          elements: {
            total: document.querySelectorAll('*').length,
            visible: 0,
            cards: 0,
            buttons: 0,
            inputs: 0,
            charts: 0
          },
          layout: {
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            bodyWidth: document.body ? document.body.scrollWidth : 0,
            windowWidth: window.innerWidth,
            hasFixedElements: false
          },
          issues: []
        };
        
        // Count visible elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0) {
            results.elements.visible++;
          }
          
          if (style.position === 'fixed') {
            results.layout.hasFixedElements = true;
          }
        });
        
        // Count specific element types
        results.elements.cards = document.querySelectorAll('.bg-white, [class*="card"], .rounded-xl').length;
        results.elements.buttons = document.querySelectorAll('button').length;
        results.elements.inputs = document.querySelectorAll('input, select, textarea').length;
        results.elements.charts = document.querySelectorAll('canvas, [class*="chart"]').length;
        
        // Check if page has meaningful content
        results.hasContent = results.elements.visible > 10;
        
        // Check for responsive issues
        if (results.layout.hasHorizontalScroll) {
          results.issues.push('Horizontal scroll detected');
        }
        
        // Check for small touch targets on mobile
        if (window.innerWidth <= 390) {
          const buttons = document.querySelectorAll('button, a, [role="button"]');
          let smallTargets = 0;
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
              smallTargets++;
            }
          });
          if (smallTargets > 0) {
            results.issues.push(`${smallTargets} touch targets smaller than 44px`);
          }
        }
        
        return results;
      }, viewport.name);
      
      console.log(`📊 Analysis for ${viewport.name}:`);
      console.log(`   URL: ${analysis.url}`);
      console.log(`   Has content: ${analysis.hasContent ? '✅' : '❌'}`);
      console.log(`   Visible elements: ${analysis.elements.visible}`);
      console.log(`   Cards: ${analysis.elements.cards}, Buttons: ${analysis.elements.buttons}, Charts: ${analysis.elements.charts}`);
      console.log(`   Horizontal scroll: ${analysis.layout.hasHorizontalScroll ? '❌ YES' : '✅ NO'}`);
      
      if (analysis.issues.length > 0) {
        console.log(`   Issues: ${analysis.issues.join(', ')}`);
      } else {
        console.log(`   Issues: ✅ None detected`);
      }
      
      // Test scrolling behavior on mobile
      if (viewport.width <= 768) {
        console.log(`   Testing scroll behavior...`);
        await page.evaluate(() => {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`   ✅ Scroll test completed`);
      }
    }

    console.log('\n🎉 Mobile responsiveness test completed!');
    console.log('\nCheck the generated screenshots to see the responsive behavior.');
    
  } catch (error) {
    console.error('❌ Error during mobile testing:', error);
  } finally {
    await browser.close();
  }
}

simpleMobileTest();