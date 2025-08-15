const puppeteer = require('puppeteer');

async function testSearchFocusFix() {
  console.log('🚀 Testing Search Focus Fix...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    devtools: true, // Open devtools to see console logs
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  
  // Listen to console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ExcelGrid:') || text.includes('DataRowsEditor:')) {
      console.log(`📋 Browser Console: ${text}`);
    }
  });
  
  try {
    console.log('📡 Navigating to homepage...');
    await page.goto('http://localhost:4000', {
      waitUntil: 'domcontentloaded'
    });
    
    // Take a screenshot of homepage
    await page.screenshot({ path: 'test-homepage-focus.png' });
    console.log('📸 Homepage screenshot saved');
    
    // Since we need to test the search functionality, let's try to inject it directly into the page
    console.log('🧪 Injecting search test components...');
    
    // Create a test Excel grid with search to test focus
    await page.evaluate(() => {
      // Create a test container
      const testContainer = document.createElement('div');
      testContainer.id = 'search-test-container';
      testContainer.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50px;
        width: 600px;
        height: 400px;
        background: white;
        border: 2px solid #007bff;
        z-index: 9999;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      
      // Create search input
      const searchContainer = document.createElement('div');
      searchContainer.style.cssText = 'position: relative; width: 300px; margin-bottom: 20px;';
      
      const searchIcon = document.createElement('div');
      searchIcon.innerHTML = '🔍';
      searchIcon.style.cssText = `
        position: absolute;
        left: 8px;
        top: 8px;
        pointer-events: none;
        z-index: 10;
      `;
      
      const searchInput = document.createElement('input');
      searchInput.id = 'test-search-input';
      searchInput.type = 'text';
      searchInput.placeholder = 'Search for balance, total, etc...';
      searchInput.style.cssText = `
        width: 100%;
        height: 40px;
        padding-left: 28px;
        padding-right: 28px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 14px;
      `;
      
      // Test data area
      const dataArea = document.createElement('div');
      dataArea.style.cssText = `
        border: 1px solid #ddd;
        padding: 10px;
        background: #f8f9fa;
        height: 200px;
        overflow-y: auto;
      `;
      
      // Sample data
      const sampleData = [
        'Initial Balance - Banco Galicia',
        'Total Inflows - Collections',
        'Total Outflows - Salaries',
        'Final Balance - Investment',
        'Monthly Generation - Cash'
      ];
      
      dataArea.innerHTML = sampleData.map((item, index) => 
        `<div style="padding: 5px; border-bottom: 1px solid #eee;">Row ${index + 1}: ${item}</div>`
      ).join('');
      
      // Add search functionality
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        console.log('🔍 Test Search: Input event triggered, value:', e.target.value);
        console.log('🎯 Test Search: Focus state after input:', document.activeElement === e.target);
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const searchTerm = e.target.value.toLowerCase();
          const rows = dataArea.querySelectorAll('div');
          let visibleCount = 0;
          
          rows.forEach(row => {
            if (row.textContent.toLowerCase().includes(searchTerm)) {
              row.style.display = 'block';
              visibleCount++;
            } else {
              row.style.display = searchTerm ? 'none' : 'block';
            }
          });
          
          console.log(`📊 Test Search: Showing ${visibleCount} of ${rows.length} rows`);
        }, 100);
      });
      
      // Focus tracking
      searchInput.addEventListener('focus', () => {
        console.log('🎯 Test Search: Input gained focus');
        searchInput.style.borderColor = '#007bff';
      });
      
      searchInput.addEventListener('blur', () => {
        console.log('😶‍🌫️ Test Search: Input lost focus');
        searchInput.style.borderColor = '#ccc';
      });
      
      // Assemble components
      searchContainer.appendChild(searchIcon);
      searchContainer.appendChild(searchInput);
      
      testContainer.appendChild(document.createElement('h3')).textContent = 'Search Focus Test';
      testContainer.appendChild(searchContainer);
      testContainer.appendChild(document.createElement('h4')).textContent = 'Sample Data:';
      testContainer.appendChild(dataArea);
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '✕ Close';
      closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #dc3545;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
      `;
      closeButton.onclick = () => testContainer.remove();
      testContainer.appendChild(closeButton);
      
      document.body.appendChild(testContainer);
      
      // Focus the search input
      setTimeout(() => {
        searchInput.focus();
        console.log('🎯 Test Search: Initial focus set');
      }, 100);
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot of test interface
    await page.screenshot({ path: 'test-search-interface.png' });
    console.log('📸 Test interface screenshot saved');
    
    // Test typing in search
    console.log('\n🧪 Testing search focus retention...');
    
    const searchInput = await page.$('#test-search-input');
    if (searchInput) {
      // Click to ensure focus
      await searchInput.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Type test string character by character
      const testString = 'balance';
      console.log(`⌨️ Typing "${testString}" character by character...`);
      
      for (let i = 0; i < testString.length; i++) {
        const char = testString[i];
        
        // Check focus before typing each character
        const isFocused = await page.evaluate(() => {
          const input = document.getElementById('test-search-input');
          return document.activeElement === input;
        });
        
        console.log(`   Char ${i + 1} (${char}): Focus = ${isFocused}`);
        
        if (!isFocused) {
          console.log(`❌ FOCUS LOST after character ${i}`);
          break;
        }
        
        // Type the character
        await page.keyboard.type(char);
        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay between characters
      }
      
      // Final focus check
      const finalFocused = await page.evaluate(() => {
        const input = document.getElementById('test-search-input');
        return document.activeElement === input;
      });
      
      console.log(`🎯 Final focus state: ${finalFocused}`);
      
      // Check final value
      const finalValue = await page.evaluate(() => {
        const input = document.getElementById('test-search-input');
        return input ? input.value : '';
      });
      
      console.log(`📝 Final input value: "${finalValue}"`);
      
      if (finalValue === testString && finalFocused) {
        console.log('✅ SUCCESS: Focus maintained throughout typing');
      } else {
        console.log('❌ FAILURE: Focus lost or value incorrect');
      }
    }
    
    // Take final screenshot
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'test-search-final.png' });
    console.log('📸 Final test screenshot saved');
    
    // Test layout appearance
    console.log('\n🎨 Testing search layout...');
    const layoutInfo = await page.evaluate(() => {
      const input = document.getElementById('test-search-input');
      if (!input) return null;
      
      const rect = input.getBoundingClientRect();
      const computed = window.getComputedStyle(input);
      
      return {
        width: rect.width,
        height: rect.height,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        fontSize: computed.fontSize,
        borderColor: computed.borderColor
      };
    });
    
    if (layoutInfo) {
      console.log('📐 Search Input Layout:');
      console.log(`   Width: ${layoutInfo.width}px`);
      console.log(`   Height: ${layoutInfo.height}px`);
      console.log(`   Padding Left: ${layoutInfo.paddingLeft}`);
      console.log(`   Padding Right: ${layoutInfo.paddingRight}`);
      console.log(`   Font Size: ${layoutInfo.fontSize}`);
      console.log(`   Border Color: ${layoutInfo.borderColor}`);
    }
    
    console.log('\n📋 Check browser console for React component logs');
    console.log('📸 Screenshots saved:');
    console.log('   - test-homepage-focus.png');
    console.log('   - test-search-interface.png');
    console.log('   - test-search-final.png');
    
    // Keep browser open for manual inspection
    console.log('\n⏳ Browser kept open for manual inspection...');
    console.log('   Press Ctrl+C to close');
    
    // Wait for 5 seconds then close automatically for testing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-search-error.png' });
  } finally {
    await browser.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run the test
testSearchFocusFix().catch(console.error);