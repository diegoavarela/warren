const puppeteer = require('puppeteer');

async function testExcelModalSearch() {
  console.log('🚀 Testing Excel Modal Search Focus...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  
  // Listen to console logs from the page
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ExcelGrid:') || text.includes('DataRowsEditor:') || text.includes('🔍') || text.includes('🎯')) {
      console.log(`📋 Browser Console: ${text}`);
    }
  });
  
  try {
    console.log('📡 Navigating to configuration page...');
    await page.goto('http://localhost:4000/dashboard/company-admin/configurations', {
      waitUntil: 'domcontentloaded'
    });
    
    await page.screenshot({ path: 'config-page.png' });
    console.log('📸 Configuration page screenshot saved');
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for "New Configuration" or similar button
    const newConfigButtons = await page.$$eval('button', buttons => 
      buttons
        .filter(btn => btn.textContent?.toLowerCase().includes('configuration') || 
                      btn.textContent?.toLowerCase().includes('create'))
        .map(btn => btn.textContent?.trim())
    );
    
    console.log('🔗 Found buttons:', newConfigButtons);
    
    // Try to click on "New Configuration" or "Create Configuration"
    const createButton = await page.$('button');
    if (createButton) {
      const buttonText = await page.evaluate(el => el.textContent, createButton);
      console.log('🖱️ Attempting to click button:', buttonText);
      
      try {
        await createButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.screenshot({ path: 'after-button-click.png' });
        console.log('📸 After button click screenshot saved');
        
        // Look for Excel preview or file upload elements
        const excelElements = await page.$$eval('*', elements => 
          Array.from(elements)
            .filter(el => el.textContent?.toLowerCase().includes('excel') || 
                         el.textContent?.toLowerCase().includes('preview') ||
                         el.textContent?.toLowerCase().includes('file'))
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0 && text.length < 100)
            .slice(0, 5)
        );
        
        console.log('📊 Found Excel-related elements:', excelElements);
        
        // Test if we can find the search input
        const searchInputs = await page.$$('input[placeholder*="search" i], input[placeholder*="Search" i]');
        console.log(`🔍 Found ${searchInputs.length} search inputs`);
        
        if (searchInputs.length > 0) {
          console.log('✅ Search functionality is present');
          
          // Test typing in the first search input
          const searchInput = searchInputs[0];
          await searchInput.click();
          await new Promise(resolve => setTimeout(resolve, 200));
          
          console.log('⌨️ Testing typing in search input...');
          const testString = 'test';
          
          for (let i = 0; i < testString.length; i++) {
            const char = testString[i];
            
            // Check if input still has focus
            const hasFocus = await page.evaluate((input) => {
              return document.activeElement === input;
            }, searchInput);
            
            console.log(`   Char ${i + 1} (${char}): Focus = ${hasFocus}`);
            
            if (!hasFocus) {
              console.log('❌ FOCUS LOST during typing!');
              break;
            }
            
            await page.keyboard.type(char);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const finalValue = await page.evaluate(input => input.value, searchInput);
          console.log(`📝 Final input value: "${finalValue}"`);
          
        } else {
          console.log('⚠️ No search inputs found on this page');
        }
        
      } catch (error) {
        console.log('❌ Button click failed:', error.message);
      }
    }
    
    await page.screenshot({ path: 'test-final.png' });
    console.log('📸 Final screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();
    console.log('🏁 Excel Modal Search Test Complete');
  }
}

testExcelModalSearch().catch(console.error);