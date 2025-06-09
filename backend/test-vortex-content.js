const puppeteer = require('puppeteer');

async function extractVortexContent() {
  console.log('Extracting content from Vortex website...');
  
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
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for dynamic content to load
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find main content containers
    await page.waitForSelector('body', { timeout: 10000 });

    // Extract comprehensive content
    const content = await page.evaluate(() => {
      // Get title
      const title = document.title || 'Vortex';
      
      // Extract all text content
      const allText = document.body.innerText || '';
      
      // Find all headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent?.trim())
        .filter(text => text && text.length > 2)
        .slice(0, 20);
      
      // Find contact information
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      
      const emails = allText.match(emailRegex) || [];
      const phones = allText.match(phoneRegex) || [];
      
      // Extract paragraphs with meaningful content
      const paragraphs = Array.from(document.querySelectorAll('p, div, span'))
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 30 && text.length < 500)
        .slice(0, 10);
      
      // Look for specific business information
      const businessKeywords = ['develop', 'design', 'solution', 'service', 'technology', 'software', 'web', 'app', 'digital', 'innovation'];
      const businessTexts = paragraphs.filter(text => 
        businessKeywords.some(keyword => text.toLowerCase().includes(keyword))
      );
      
      // Extract navigation or menu items
      const navItems = Array.from(document.querySelectorAll('nav a, .menu a, .navbar a, header a'))
        .map(a => a.textContent?.trim())
        .filter(text => text && text.length > 2 && text.length < 30)
        .slice(0, 10);
      
      return {
        title: title,
        headings: headings,
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        paragraphs: paragraphs,
        businessTexts: businessTexts,
        navigation: navItems,
        bodyLength: allText.length,
        preview: allText.substring(0, 1000)
      };
    });

    console.log('=== EXTRACTED CONTENT FROM VORTEX WEBSITE ===');
    console.log('Title:', content.title);
    console.log('Body text length:', content.bodyLength);
    console.log('\nHeadings found:');
    content.headings.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
    console.log('\nEmails found:');
    content.emails.forEach(email => console.log(`  - ${email}`));
    console.log('\nPhones found:');
    content.phones.forEach(phone => console.log(`  - ${phone}`));
    console.log('\nNavigation items:');
    content.navigation.forEach(nav => console.log(`  - ${nav}`));
    console.log('\nBusiness-related paragraphs:');
    content.businessTexts.forEach((text, i) => console.log(`  ${i + 1}. ${text.substring(0, 100)}...`));
    console.log('\nFirst 1000 characters of content:');
    console.log(content.preview);

    return content;

  } catch (error) {
    console.error('Error extracting content:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

extractVortexContent();