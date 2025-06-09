import { Router } from 'express';
import { LegalContentService } from '../services/LegalContentService';
import { logger } from '../utils/logger';

const router = Router();

// Get all legal pages
router.get('/pages', async (req, res, next) => {
  try {
    const legalPages = await LegalContentService.scrapeLegalContent();
    res.json({
      success: true,
      data: legalPages
    });
  } catch (error) {
    logger.error('Error fetching legal pages:', error);
    next(error);
  }
});

// Get terms and conditions
router.get('/terms', async (req, res, next) => {
  try {
    const legalPages = await LegalContentService.scrapeLegalContent();
    res.json({
      success: true,
      data: legalPages.termsAndConditions
    });
  } catch (error) {
    logger.error('Error fetching terms:', error);
    next(error);
  }
});

// Get privacy policy
router.get('/privacy', async (req, res, next) => {
  try {
    const legalPages = await LegalContentService.scrapeLegalContent();
    res.json({
      success: true,
      data: legalPages.privacyPolicy
    });
  } catch (error) {
    logger.error('Error fetching privacy policy:', error);
    next(error);
  }
});

// Get cookie policy
router.get('/cookies', async (req, res, next) => {
  try {
    const legalPages = await LegalContentService.scrapeLegalContent();
    res.json({
      success: true,
      data: legalPages.cookiePolicy
    });
  } catch (error) {
    logger.error('Error fetching cookie policy:', error);
    next(error);
  }
});

export { router as legalRouter };