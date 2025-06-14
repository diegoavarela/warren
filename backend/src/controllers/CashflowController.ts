import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { CashflowServiceV2 } from '../services/CashflowServiceV2';
import { CashFlowAnalysisService } from '../services/CashFlowAnalysisService';
import { ExtendedFinancialService } from '../services/ExtendedFinancialService';
import { logger } from '../utils/logger';

// Create singleton instances
const cashflowServiceInstance = new CashflowServiceV2();
const analysisServiceInstance = new CashFlowAnalysisService();
const extendedFinancialServiceInstance = new ExtendedFinancialService();

export class CashflowController {
  private cashflowService = cashflowServiceInstance;
  private analysisService = analysisServiceInstance;
  private extendedFinancialService = extendedFinancialServiceInstance;

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

      const metrics = this.cashflowService.parseWorksheet(worksheet, req.file.originalname);
      logger.info(`Cashflow file uploaded by user ${req.user?.email}, ${metrics.length} months processed`);

      // Also parse extended financial data (operational costs, banks, taxes)
      const extendedData = this.extendedFinancialService.parseExtendedFinancialData(worksheet);
      logger.info(`Extended financial data parsed: ${extendedData.operational.length} operational months processed`);

      res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        data: {
          filename: req.file.originalname,
          monthsProcessed: metrics.length,
          dateRange: metrics.length > 0 ? {
            from: metrics[0].date,
            to: metrics[metrics.length - 1].date
          } : null,
          extendedDataProcessed: {
            operational: extendedData.operational.length,
            banks: extendedData.banks.length,
            taxes: extendedData.taxes.length
          }
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
            totalInflow: m.totalInflow,
            totalOutflow: m.totalOutflow,
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

  async getScenarioAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const storedMetrics = this.cashflowService.getStoredMetrics();
      
      // Get scenario parameters from request body
      const { base, best, worst } = req.body;
      
      // Default scenarios if not provided
      const scenarios = {
        base: base || { inflowChange: 0, outflowChange: 0, startingMonth: 0, duration: 12 },
        best: best || { inflowChange: 25, outflowChange: -15, startingMonth: 0, duration: 6 },
        worst: worst || { inflowChange: -30, outflowChange: 20, startingMonth: 0, duration: 3 }
      };

      const now = new Date();
      const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
      let currentIndex = storedMetrics.findIndex(m => m.month === currentMonthName);
      
      if (currentIndex === -1) {
        currentIndex = storedMetrics.length - 1;
      }

      const scenarioResults = this.analysisService.runScenarioAnalysis(storedMetrics, currentIndex, scenarios);

      res.json({
        success: true,
        data: scenarioResults
      });
    } catch (error) {
      next(error);
    }
  }

  async getWaterfallData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const storedMetrics = this.cashflowService.getStoredMetrics();
      
      if (storedMetrics.length === 0) {
        return res.json({
          success: true,
          data: { categories: [], startValue: 0, endValue: 0 }
        });
      }

      // Get period from query params (default to last 6 months)
      const period = parseInt(req.query.period as string) || 6;
      
      const now = new Date();
      const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
      let currentIndex = storedMetrics.findIndex(m => m.month === currentMonthName);
      
      if (currentIndex === -1) {
        currentIndex = storedMetrics.length - 1;
      }

      // Calculate start and end indices
      const endIndex = currentIndex;
      const startIndex = Math.max(0, currentIndex - period + 1);

      const waterfallData = this.analysisService.generateWaterfallData(storedMetrics, startIndex, endIndex);

      res.json({
        success: true,
        data: waterfallData
      });
    } catch (error) {
      next(error);
    }
  }

  async getOperationalData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // For now, return the stored extended financial data from the service
      // In a production environment, this would be stored in a database
      const extendedData = this.extendedFinancialService.getStoredExtendedData();
      
      res.json({
        success: true,
        data: extendedData.operational
      });
    } catch (error) {
      next(error);
    }
  }

  async getBankingData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const extendedData = this.extendedFinancialService.getStoredExtendedData();
      
      res.json({
        success: true,
        data: extendedData.banks
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaxesData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const extendedData = this.extendedFinancialService.getStoredExtendedData();
      
      res.json({
        success: true,
        data: extendedData.taxes
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvestmentsData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const extendedData = this.extendedFinancialService.getStoredExtendedData();
      
      res.json({
        success: true,
        data: extendedData.investments
      });
    } catch (error) {
      next(error);
    }
  }
}