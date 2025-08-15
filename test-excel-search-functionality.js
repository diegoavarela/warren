const puppeteer = require('puppeteer');
const path = require('path');

async function testExcelSearchFunctionality() {
  console.log('🚀 Starting Excel Search Functionality Tests...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  
  try {
    // Navigate to the configurations page
    console.log('📡 Navigating to configurations page...');
    await page.goto('http://localhost:4000/dashboard/company-admin/configurations', {
      waitUntil: 'networkidle2'
    });
    
    // Wait for the page to load and find a configuration to edit
    await page.waitForSelector('[data-testid="configuration-item"], .configuration-item, a[href*="configurations"]', {
      timeout: 10000
    });
    
    // Click on an existing configuration or create new one
    console.log('🔧 Opening configuration editor...');
    const configLinks = await page.$$('a[href*="configurations"][href*="edit"]');
    if (configLinks.length > 0) {
      await configLinks[0].click();
    } else {
      // If no configurations exist, we'll need to create one first
      console.log('No existing configurations found. Please create a configuration first.');
      return;
    }
    
    // Wait for configuration edit page to load
    await page.waitForSelector('.configuration-edit, [data-testid="configuration-form"]', {
      timeout: 10000
    });
    
    // Navigate to the "FILAS DE DATOS" tab or section
    console.log('📊 Navigating to Data Rows section...');
    const dataRowsTab = await page.$('button:has-text("FILAS DE DATOS"), [data-testid="data-rows-tab"], button[role="tab"]:has-text("Data")');
    if (dataRowsTab) {
      await dataRowsTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for Excel preview button
    console.log('👁️ Opening Excel preview...');
    const excelPreviewButton = await page.$('button:has-text("Excel Preview"), button:has-text("Vista Previa"), [data-testid="excel-preview-button"]');
    if (!excelPreviewButton) {
      // Try to find any button that might open Excel preview
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && (text.includes('Excel') || text.includes('Vista') || text.includes('Preview'))) {
          await button.click();
          break;
        }
      }
    } else {
      await excelPreviewButton.click();
    }
    
    // Wait for Excel preview modal to open
    console.log('⏳ Waiting for Excel preview modal...');
    await page.waitForSelector('.excel-grid, [data-testid="excel-preview"], .modal', {
      timeout: 15000
    });
    
    await page.waitForTimeout(2000); // Allow modal to fully load
    
    // TEST 1: Verify search bar positioning
    console.log('\n🧪 TEST 1: Search Bar Positioning');
    await page.screenshot({ path: 'test-search-positioning-before.png', fullPage: false });
    
    // Check if search appears between badges and Excel grid
    const badges = await page.$$('.badge, [data-testid="excel-badge"]');
    const searchInput = await page.$('#excel-search-input, input[placeholder*="search"], input[placeholder*="Buscar"]');
    const excelGrid = await page.$('.excel-grid .border-gray-200, table, .grid-container');
    
    if (!searchInput) {
      console.log('❌ FAIL: Search input not found');
      return;
    }
    
    // Get positions
    const badgesBounds = badges.length > 0 ? await badges[0].boundingBox() : null;
    const searchBounds = await searchInput.boundingBox();
    const gridBounds = excelGrid ? await excelGrid.boundingBox() : null;
    
    console.log('📍 Element positions:');
    console.log(`   Badges: ${badgesBounds ? badgesBounds.y : 'N/A'}`);
    console.log(`   Search: ${searchBounds ? searchBounds.y : 'N/A'}`);
    console.log(`   Grid: ${gridBounds ? gridBounds.y : 'N/A'}`);
    
    if (badgesBounds && searchBounds && gridBounds) {
      if (searchBounds.y > badgesBounds.y && searchBounds.y < gridBounds.y) {
        console.log('✅ PASS: Search positioned correctly between badges and grid');
      } else {
        console.log('❌ FAIL: Search not positioned between badges and grid');
      }
    }
    
    // TEST 2: Search input focus retention
    console.log('\n🧪 TEST 2: Search Focus Retention');
    
    // Click on search input
    await searchInput.click();
    await page.waitForTimeout(300);
    
    // Type multiple characters and check focus
    const testSearch = 'total';
    let focusLost = false;
    
    for (let i = 0; i < testSearch.length; i++) {
      const char = testSearch[i];
      
      // Check if search input is focused before typing
      const isFocused = await page.evaluate(() => {
        const searchEl = document.getElementById('excel-search-input') || 
                        document.querySelector('input[placeholder*="search"]') || 
                        document.querySelector('input[placeholder*="Buscar"]');
        return document.activeElement === searchEl;
      });
      
      if (!isFocused && i > 0) {
        console.log(`❌ FAIL: Focus lost after typing "${testSearch.substring(0, i)}"`);
        focusLost = true;
        break;
      }
      
      await page.type('#excel-search-input, input[placeholder*="search"], input[placeholder*="Buscar"]', char);
      await page.waitForTimeout(100); // Small delay between characters
    }
    
    if (!focusLost) {
      console.log('✅ PASS: Search input maintained focus during typing');
    }
    
    // TEST 3: Search functionality
    console.log('\n🧪 TEST 3: Search Functionality');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Check if search results are displayed
    const resultsText = await page.$eval('.text-gray-600:has-text("results"), .search-results, .results-counter', 
      el => el.textContent, 
    ).catch(() => null);
    
    if (resultsText && resultsText.includes('results')) {
      console.log('✅ PASS: Search results counter displayed');
      console.log(`   Results: ${resultsText}`);
    } else {
      console.log('❓ INFO: Search results counter not found or different format');
    }
    
    // TEST 4: Search input styling
    console.log('\n🧪 TEST 4: Search Input Styling');
    
    const searchStyles = await page.evaluate(() => {
      const searchEl = document.getElementById('excel-search-input') || 
                      document.querySelector('input[placeholder*="search"]') || 
                      document.querySelector('input[placeholder*="Buscar"]');
      if (!searchEl) return null;
      
      const computed = window.getComputedStyle(searchEl);
      const container = searchEl.parentElement;
      const containerComputed = window.getComputedStyle(container);
      
      return {
        width: computed.width,
        height: computed.height,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        containerWidth: containerComputed.width,
        hasIcon: !!container.querySelector('svg'),
        hasClearButton: !!container.querySelector('button')
      };
    });
    
    if (searchStyles) {
      console.log('📐 Search Input Styles:');
      console.log(`   Input Width: ${searchStyles.width}`);
      console.log(`   Input Height: ${searchStyles.height}`);
      console.log(`   Padding Left: ${searchStyles.paddingLeft}`);
      console.log(`   Padding Right: ${searchStyles.paddingRight}`);
      console.log(`   Has Search Icon: ${searchStyles.hasIcon ? 'Yes' : 'No'}`);
      console.log(`   Has Clear Button: ${searchStyles.hasClearButton ? 'Yes' : 'No'}`);
      
      // Check if padding is sufficient for icon
      const paddingLeftNum = parseInt(searchStyles.paddingLeft);
      if (paddingLeftNum >= 32 && searchStyles.hasIcon) {
        console.log('✅ PASS: Sufficient padding for search icon');
      } else if (searchStyles.hasIcon) {
        console.log('❌ FAIL: Insufficient padding for search icon');
      }
    }
    
    // TEST 5: Row number preservation during search
    console.log('\n🧪 TEST 5: Row Number Preservation');
    
    // Get original row numbers
    const originalRowNumbers = await page.$$eval('.excel-grid .w-16:has-text("10"), .row-number, .sticky.left-0', 
      elements => elements.map(el => el.textContent?.trim()).filter(text => /^\d+$/.test(text))
    ).catch(() => []);
    
    console.log(`📊 Found ${originalRowNumbers.length} row numbers before search`);
    
    // Clear search and type new search term
    await page.evaluate(() => {
      const searchEl = document.getElementById('excel-search-input') || 
                      document.querySelector('input[placeholder*="search"]') || 
                      document.querySelector('input[placeholder*="Buscar"]');
      if (searchEl) {
        searchEl.value = '';
        searchEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    await page.waitForTimeout(500);
    await page.type('#excel-search-input, input[placeholder*="search"], input[placeholder*="Buscar"]', 'balance');
    await page.waitForTimeout(1000);
    
    // Get filtered row numbers
    const filteredRowNumbers = await page.$$eval('.excel-grid .w-16', 
      elements => elements.map(el => el.textContent?.trim()).filter(text => /^\d+$/.test(text))
    ).catch(() => []);
    
    console.log(`🔍 Found ${filteredRowNumbers.length} row numbers after search`);
    console.log(`   Filtered rows: ${filteredRowNumbers.join(', ')}`);
    
    // Check if row numbers are original Excel row numbers (not 1,2,3...)
    const hasOriginalNumbers = filteredRowNumbers.some(num => parseInt(num) > filteredRowNumbers.length);
    if (hasOriginalNumbers) {
      console.log('✅ PASS: Original Excel row numbers preserved during search');
    } else if (filteredRowNumbers.length > 0) {
      console.log('❌ FAIL: Row numbers appear to be renumbered (1,2,3...) instead of original Excel rows');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-search-functionality-final.png', fullPage: false });
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - test-search-positioning-before.png');
    console.log('   - test-search-functionality-final.png');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test-search-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: test-search-error.png');
  } finally {
    await browser.close();
    console.log('\n🏁 Excel Search Functionality Tests Complete');
  }
}

// Run the test
testExcelSearchFunctionality().catch(console.error);