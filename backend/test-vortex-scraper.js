const puppeteer = require('puppeteer');

async function testVortexScraper() {
  console.log('Testing Vortex website scraping...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to www.vort-ex.com...');
    await page.goto('https://www.vort-ex.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Page loaded, extracting content...');
    
    // Get basic page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 10),
        links: Array.from(document.querySelectorAll('a[href*="mailto"], a[href*="tel"]')).map(a => ({
          href: a.href,
          text: a.textContent?.trim()
        })).slice(0, 5),
        paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(text => text && text.length > 30).slice(0, 5)
      };
    });

    console.log('=== SCRAPED DATA FROM VORTEX WEBSITE ===');
    console.log('Title:', pageInfo.title);
    console.log('URL:', pageInfo.url);
    console.log('\nHeadings:');
    pageInfo.headings.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
    console.log('\nContact Links:');
    pageInfo.links.forEach((l, i) => console.log(`  ${i + 1}. ${l.href} - ${l.text}`));
    console.log('\nKey Paragraphs:');
    pageInfo.paragraphs.forEach((p, i) => console.log(`  ${i + 1}. ${p.substring(0, 100)}...`));
    console.log('\nFirst 500 chars of body:');
    console.log(pageInfo.bodyText);

  } catch (error) {
    console.error('Error scraping Vortex website:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testVortexScraper();