import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { CashflowServiceV2 } from '../services/CashflowServiceV2';
import { CashFlowAnalysisService } from '../services/CashFlowAnalysisService';
import { logger } from '../utils/logger';

// Create singleton instances
const cashflowServiceInstance = new CashflowServiceV2();
const analysisServiceInstance = new CashFlowAnalysisService();

export class CashflowController {
  private cashflowService = cashflowServiceInstance;
  private analysisService = analysisServiceInstance;

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

      const metrics = this.cashflowService.parseWorksheet(worksheet);
      logger.info(`Cashflow file uploaded by user ${req.user?.email}, ${metrics.length} months processed`);

      res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        data: {
          filename: req.file.originalname,
          monthsProcessed: metrics.length,
          dateRange: metrics.length > 0 ? {
            from: metrics[0].date,
            to: metrics[metrics.length - 1].date
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
      // Return the stored metrics for debugging
      const storedMetrics = this.cashflowService.getStoredMetrics();

      res.json({
        success: true,
        data: {
          monthsAvailable: storedMetrics.length,
          metrics: storedMetrics.map(m => ({
            month: m.month,
            column: m.columnLetter,
            totalIncome: m.totalIncome,
            totalExpense: m.totalExpense,
            monthlyGeneration: m.monthlyGeneration
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getRunwayAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const storedMetrics = this.cashflowService.getStoredMetrics();
      
      if (storedMetrics.length === 0) {
        return res.json({
          success: true,
          data: this.analysisService.calculateRunway([], -1)
        });
      }

      // Find current month index
      const now = new Date();
      const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
      let currentIndex = storedMetrics.findIndex(m => m.month === currentMonthName);
      
      // If current month not found, use the last available month
      if (currentIndex === -1) {
        currentIndex = storedMetrics.length - 1;
      }

      const runwayAnalysis = this.analysisService.calculateRunway(storedMetrics, currentIndex);

      res.json({
        success: true,
        data: runwayAnalysis
      });
    } catch (error) {
      next(error);
    }
  }

  async getBurnRateAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const storedMetrics = this.cashflowService.getStoredMetrics();
      
      if (storedMetrics.length === 0) {
        return res.json({
          success: true,
          data: this.analysisService.analyzeBurnRate([], -1)
        });
      }

      // Find current month index
      const now = new Date();
      const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
      let currentIndex = storedMetrics.findIndex(m => m.month === currentMonthName);
      
      // If current month not found, use the last available month
      if (currentIndex === -1) {
        currentIndex = storedMetrics.length - 1;
      }

      const burnRateAnalysis = this.analysisService.analyzeBurnRate(storedMetrics, currentIndex);

      res.json({
        success: true,
        data: burnRateAnalysis
      });
    } catch (error) {
      next(error);
    }
  }
}