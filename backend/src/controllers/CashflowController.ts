import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { CashflowService } from '../services/CashflowService';
import { logger } from '../utils/logger';

export class CashflowController {
  private cashflowService = new CashflowService();

  async uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(createError('No file uploaded', 400));
      }

      logger.info(`File received: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return next(createError('No worksheet found in Excel file', 400));
      }

      const cashflowData = this.cashflowService.parseWorksheet(worksheet);
      
      // Store the data in the service for dashboard use
      this.cashflowService.setCurrentData(cashflowData);
      
      logger.info(`Cashflow file uploaded by user ${req.user?.email}, ${cashflowData.length} rows processed`);

      res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        data: {
          filename: req.file.originalname,
          rowsProcessed: cashflowData.length,
          dateRange: cashflowData.length > 0 ? {
            from: cashflowData[0].date,
            to: cashflowData[cashflowData.length - 1].date
          } : null
        }
      });
    } catch (error: any) {
      logger.error('Error processing Excel file:', error);
      const errorMessage = error.message || 'Unknown error processing Excel file';
      next(createError(`Error processing Excel file: ${errorMessage}`, 500));
    }
  }

  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // In production, this would fetch from database
      const dashboardData = this.cashflowService.generateDashboard();

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = this.cashflowService.calculateMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }
}