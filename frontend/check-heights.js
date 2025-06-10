const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Test different viewport heights
  const viewports = [
    { width: 1366, height: 768, name: 'Standard Laptop' },
    { width: 1440, height: 900, name: 'MacBook Pro' },
    { width: 1920, height: 1080, name: 'Full HD' }
  ];
  
  for (const viewport of viewports) {
    await page.setViewport(viewport);
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    
    const measurements = await page.evaluate(() => {
      const navbar = document.querySelector('.sticky');
      const heroSection = document.querySelector('.text-center.mb-16');
      const moduleCards = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      
      return {
        navbarHeight: navbar ? navbar.offsetHeight : 0,
        heroHeight: heroSection ? heroSection.offsetHeight : 0,
        cardsHeight: moduleCards ? moduleCards.offsetHeight : 0,
        totalScrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight
      };
    });
    
    console.log(`\n${viewport.name} (${viewport.width}x${viewport.height}):`);
    console.log('- Navbar height:', measurements.navbarHeight + 'px');
    console.log('- Hero section height:', measurements.heroHeight + 'px');
    console.log('- Module cards height:', measurements.cardsHeight + 'px');
    console.log('- Total content height:', measurements.totalScrollHeight + 'px');
    console.log('- Visible area height:', measurements.clientHeight + 'px');
    console.log('- Content exceeds viewport by:', Math.max(0, measurements.totalScrollHeight - measurements.clientHeight) + 'px');
  }
  
  await browser.close();
})();