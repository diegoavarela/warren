import { Request, Response, NextFunction } from 'express';
import { MondayService } from '../services/MondayService';
import { logger } from '../utils/logger';

export class MondayController {
  /**
   * Create a new lead in Monday.com
   */
  async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const leadData = req.body;
      
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'workEmail', 'companyName', 'jobTitle', 'companySize', 'useCase', 'timeline'];
      const missingFields = requiredFields.filter(field => !leadData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Create lead in Monday.com
      const result = await MondayService.createLead(leadData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error in createLead controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create lead'
      });
    }
  }

  /**
   * Get Monday.com board columns (for debugging/setup)
   */
  async getBoardColumns(req: Request, res: Response, next: NextFunction) {
    try {
      const columns = await MondayService.getBoardColumns();
      
      res.json({
        success: true,
        data: columns
      });
    } catch (error: any) {
      logger.error('Error in getBoardColumns controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch board columns'
      });
    }
  }
}