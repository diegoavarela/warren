import { Router } from 'express';
import { ScraperService } from '../services/ScraperService';
import { logger } from '../utils/logger';

const router = Router();

// Get team information from scraped data
router.get('/info', async (req, res) => {
  try {
    const teamInfo = await ScraperService.scrapeTeamAllocationSite();
    
    res.json({
      success: true,
      data: teamInfo
    });
  } catch (error) {
    logger.error('Error fetching team info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team information'
    });
  }
});

export { router as teamRouter };