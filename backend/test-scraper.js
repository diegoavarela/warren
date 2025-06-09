const { ScraperService } = require('./dist/services/ScraperService.js');

async function testScraper() {
  try {
    console.log('Testing scraper...');
    const result = await ScraperService.scrapeTeamAllocationSite();
    console.log('Scraper result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Scraper error:', error.message);
  }
}

testScraper();