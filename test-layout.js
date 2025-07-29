const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testDashboardLayout() {
  console.log('🚀 Starting Puppeteer dashboard layout test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    console.log('📱 Navigating to dashboard...');
    
    // Try different possible URLs for the P&L dashboard
    const possibleUrls = [
      'http://localhost:4000/dashboard/company-admin/pnl',
      'http://localhost:4000/dashboard/company-admin/pnl?useMockData=true',
      'http://localhost:4000/dashboard/pnl', 
      'http://localhost:4000/pnl',
      'http://localhost:4000'
    ];
    
    let dashboardFound = false;
    for (const url of possibleUrls) {
      try {
        console.log(`Trying URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Check if we're on a login page or if dashboard content is visible
        const isLoginPage = await page.$('input[type="password"], input[name="password"], .login, [class*="login"]');
        const hasDashboardContent = await page.$('.metric-card, [class*="metric"], [class*="dashboard"], h1, h2, h3');
        
        if (!isLoginPage && hasDashboardContent) {
          console.log(`✅ Dashboard found at: ${url}`);
          dashboardFound = true;
          break;
        } else if (isLoginPage) {
          console.log(`🔐 Login required at: ${url}`);
        } else {
          console.log(`❌ No dashboard content at: ${url}`);
        }
      } catch (error) {
        console.log(`❌ Failed to load: ${url} - ${error.message}`);
      }
    }
    
    if (!dashboardFound) {
      console.log('⚠️  No accessible dashboard found. Will analyze whatever page loaded.');
    }

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="pnl-dashboard"], .metric-cards-container, h1, h2', { timeout: 10000 });

    console.log('📊 Dashboard loaded, capturing screenshots...');

    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'full-dashboard.png'),
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'dashboard-viewport.png')
    });

    console.log('🔍 Analyzing layout and language issues...');

    // Collect all text content for language analysis
    const textContent = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, label, th, td');
      const textData = [];
      
      elements.forEach((el, index) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0) {
          textData.push({
            index,
            tagName: el.tagName,
            className: el.className,
            text: text,
            hasTranslationKey: text.includes('.') && (text.includes('metrics') || text.includes('dashboard') || text.includes('efficiency')),
            isLikelyUntranslated: text.includes('.') && text.split('.').length > 1,
            xpath: getXPath(el)
          });
        }
      });
      
      function getXPath(element) {
        if (element.id !== '') {
          return 'id("' + element.id + '")';
        }
        if (element === document.body) {
          return element.tagName;
        }
        
        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          if (sibling === element) {
            return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
          }
          if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }
      
      return textData;
    });

    // Check for layout issues
    const layoutIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for duplicate elements
      const duplicates = new Map();
      document.querySelectorAll('[class*="grid"], [class*="flex"], .metric-card, .card').forEach(el => {
        const key = el.className + '|' + el.textContent?.substring(0, 50);
        if (duplicates.has(key)) {
          duplicates.set(key, duplicates.get(key) + 1);
        } else {
          duplicates.set(key, 1);
        }
      });
      
      duplicates.forEach((count, key) => {
        if (count > 1) {
          issues.push({
            type: 'duplicate',
            message: `Potential duplicate elements: ${key} (${count} instances)`,
            severity: 'warning'
          });
        }
      });
      
      // Check for overlapping elements
      const cards = document.querySelectorAll('.metric-card, [class*="card"], [class*="rounded"]');
      cards.forEach((card, i) => {
        const rect1 = card.getBoundingClientRect();
        cards.forEach((otherCard, j) => {
          if (i !== j) {
            const rect2 = otherCard.getBoundingClientRect();
            if (rect1.left < rect2.right && rect2.left < rect1.right &&
                rect1.top < rect2.bottom && rect2.top < rect1.bottom) {
              issues.push({
                type: 'overlap',
                message: `Potential overlapping elements detected`,
                severity: 'error',
                element1: card.className,
                element2: otherCard.className
              });
            }
          }
        });
      });
      
      // Check for missing cards or empty sections
      const expectedSections = [
        'YTD', 'Revenue', 'Cost', 'Efficiency', 'Personnel', 'Tax'
      ];
      
      expectedSections.forEach(section => {
        // Use textContent instead of :contains pseudo-selector which isn't supported
        const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const sectionFound = headers.some(h => h.textContent.includes(section)) ||
                            document.querySelector(`[class*="${section.toLowerCase()}"]`);
        if (!sectionFound) {
          issues.push({
            type: 'missing_section',
            message: `Expected section "${section}" not found`,
            severity: 'warning'
          });
        }
      });
      
      return issues;
    });

    // Check for specific sections from HOW_TO_MAP.md
    const expectedSections = await page.evaluate(() => {
      const sections = {
        'Current Month Overview': false,
        'Cost Structure': false,
        'Key Insights': false,
        'YTD Summary': false,
        'Operating Expenses Analysis': false,
        'COGS Analysis': false,
        'Revenue Growth Analysis': false,
        'Cost Analysis': false,
        'Cost Efficiency Metrics': false,
        'Personnel Cost Analysis': false,
        'Taxes': false,
        'Performance Overview': false
      };
      
      // Check if sections exist in the page
      const allText = document.body.textContent || '';
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent || '');
      
      // Look for section indicators
      Object.keys(sections).forEach(section => {
        const sectionVariations = [
          section,
          section.toLowerCase(),
          section.replace(/\s+/g, ''),
          // Spanish variations
          section === 'Current Month Overview' ? 'Resumen' : '',
          section === 'Cost Structure' ? 'Estructura de Costos' : '',
          section === 'Key Insights' ? 'Insights' : '',
          section === 'YTD Summary' ? 'YTD' : '',
          section === 'Operating Expenses Analysis' ? 'Gastos Operacionales' : '',
          section === 'Revenue Growth Analysis' ? 'Crecimiento' : '',
          section === 'Cost Efficiency Metrics' ? 'Eficiencia' : '',
          section === 'Personnel Cost Analysis' ? 'Personal' : '',
          section === 'Performance Overview' ? 'Performance' : ''
        ].filter(Boolean);
        
        sections[section] = sectionVariations.some(variation => 
          allText.includes(variation) || headings.some(h => h.includes(variation))
        );
      });
      
      return sections;
    });

    // Analyze language issues
    const languageIssues = textContent.filter(item => 
      item.isLikelyUntranslated || 
      item.text.includes('undefined') ||
      item.text.includes('null') ||
      item.text.includes('{{') ||
      item.text.includes('}}') ||
      (item.text.includes('.') && item.text.split('.').length >= 2 && !item.text.includes('@'))
    );

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      viewport: { width: 1920, height: 1080 },
      totalTextElements: textContent.length,
      languageIssues: languageIssues.length,
      layoutIssues: layoutIssues.length,
      expectedSections: expectedSections,
      details: {
        languageIssues: languageIssues,
        layoutIssues: layoutIssues,
        sectionsFound: Object.entries(expectedSections).filter(([_, found]) => found).map(([name, _]) => name),
        sectionsMissing: Object.entries(expectedSections).filter(([_, found]) => !found).map(([name, _]) => name),
        allText: textContent.filter(item => item.text.length > 2) // Filter out very short text
      }
    };

    // Save report
    fs.writeFileSync(
      path.join(screenshotsDir, 'layout-analysis-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate readable summary
    const summary = `
# Dashboard Layout Analysis Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total text elements found: ${report.totalTextElements}
- Language issues detected: ${report.languageIssues}
- Layout issues detected: ${report.layoutIssues}

## Language Issues (${languageIssues.length})
${languageIssues.map(issue => `- [${issue.tagName}] "${issue.text}" (${issue.xpath})`).join('\n')}

## Layout Issues (${layoutIssues.length})
${layoutIssues.map(issue => `- [${issue.severity.toUpperCase()}] ${issue.message}`).join('\n')}

## Screenshots Generated
- full-dashboard.png (Full page screenshot)
- dashboard-viewport.png (Viewport screenshot)

## Next Steps
1. Review language issues and update translations in lib/translations.ts
2. Fix any duplicate or overlapping elements
3. Ensure all sections are properly displayed
4. Test with different locales (es-MX, en-US)
`;

    fs.writeFileSync(
      path.join(screenshotsDir, 'ANALYSIS_SUMMARY.md'),
      summary
    );

    console.log('✅ Analysis complete!');
    console.log(`📊 Found ${languageIssues.length} language issues`);
    console.log(`🎨 Found ${layoutIssues.length} layout issues`);
    console.log(`📁 Results saved to: ${screenshotsDir}`);
    
    if (languageIssues.length > 0) {
      console.log('\n🔤 Language Issues Preview:');
      languageIssues.slice(0, 5).forEach(issue => {
        console.log(`  - "${issue.text}" in ${issue.tagName}`);
      });
      if (languageIssues.length > 5) {
        console.log(`  ... and ${languageIssues.length - 5} more`);
      }
    }

    if (layoutIssues.length > 0) {
      console.log('\n🎨 Layout Issues Preview:');
      layoutIssues.slice(0, 3).forEach(issue => {
        console.log(`  - [${issue.severity}] ${issue.message}`);
      });
    }

    return report;

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    
    // Try to take a screenshot even if there's an error
    try {
      const page = await browser.newPage();
      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'error-screenshot.png')
      });
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError.message);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testDashboardLayout()
    .then(report => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testDashboardLayout };