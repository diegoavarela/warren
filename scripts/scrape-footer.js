const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://lineup-murex.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Wait for footer to be visible
    await page.waitForSelector('footer', { visible: true });
    
    // Extract footer HTML and computed styles
    const footerData = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (!footer) return null;
      
      // Get the outer HTML
      const html = footer.outerHTML;
      
      // Get computed styles for the footer
      const styles = window.getComputedStyle(footer);
      const footerStyles = {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        padding: styles.padding,
        margin: styles.margin
      };
      
      // Get all links and their href
      const links = [];
      footer.querySelectorAll('a').forEach(link => {
        links.push({
          text: link.textContent.trim(),
          href: link.href,
          className: link.className
        });
      });
      
      // Get text content structure
      const sections = [];
      footer.querySelectorAll('div > h5').forEach(heading => {
        const parent = heading.parentElement;
        const items = [];
        parent.querySelectorAll('li').forEach(li => {
          items.push(li.textContent.trim());
        });
        sections.push({
          title: heading.textContent.trim(),
          items: items
        });
      });
      
      return {
        html,
        styles: footerStyles,
        links,
        sections,
        className: footer.className
      };
    });
    
    console.log('Footer Data:', JSON.stringify(footerData, null, 2));
    
  } catch (error) {
    console.error('Error scraping footer:', error);
  } finally {
    await browser.close();
  }
})();