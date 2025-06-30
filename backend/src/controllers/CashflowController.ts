import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/auth';

interface TenantAuthRequest extends AuthRequest {
  tenantId?: string;
}
import { createError } from '../middleware/errorHandler';
import { CashflowServiceV2Enhanced } from '../services/CashflowServiceV2Enhanced';
import { CashFlowAnalysisService } from '../services/CashFlowAnalysisService';
import { ExtendedFinancialService } from '../services/ExtendedFinancialService';
import { InvestmentDiagnosticService } from '../services/InvestmentDiagnosticService';
import { FileUploadService } from '../services/FileUploadService';
import { DataSourceService } from '../services/DataSourceService';
import { ExtendedFinancialData } from '../interfaces/FinancialData';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Create singleton instances
const cashflowServiceInstance = new CashflowServiceV2Enhanced();
const analysisServiceInstance = new CashFlowAnalysisService();
const extendedFinancialServiceInstance = ExtendedFinancialService.getInstance();

export class CashflowController {
  private cashflowService = cashflowServiceInstance;
  private analysisService = analysisServiceInstance;
  private extendedFinancialService = extendedFinancialServiceInstance;
  private investmentDiagnosticService = new InvestmentDiagnosticService();
  private fileUploadService = new FileUploadService(pool);
  private dataSourceService = DataSourceService.getInstance(pool);
  private aiExcelService = require('../services/AIExcelAnalysisService').AIExcelAnalysisService.getInstance();

  async uploadFile(req: TenantAuthRequest, res: Response, next: NextFunction) {
    let fileUploadId: number | null = null;
    
    try {
      if (!req.file) {
        return next(createError('No file uploaded', 400));
      }

      logger.info(`File received: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);

      // Create file upload record
      const fileUploadRecord = await this.fileUploadService.createFileUpload({
        userId: parseInt(req.user!.id),
        companyId: req.tenantId!,
        fileType: 'cashflow',
        filename: `cashflow_${Date.now()}_${req.file.originalname}`,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
      
      fileUploadId = fileUploadRecord.id;

      // Mark processing as started
      await this.fileUploadService.markProcessingStarted(fileUploadId);

      // Process file based on format detection
      let metrics: any[];
      let format: string;
      
      try {
        const result = await this.cashflowService.processExcelFile(req.file.buffer, req.file.originalname);
        metrics = result.metrics;
        format = result.format;
        logger.info(`Cashflow file uploaded by user ${req.user?.email}, format: ${format}, ${metrics.length} months processed`);
      } catch (error: any) {
        if (error.message.includes('AI wizard')) {
          // Format not detected, return error that triggers AI wizard
          await this.fileUploadService.markProcessingFailed(fileUploadId, error.message);
          return res.status(400).json({
            success: false,
            error: error.message,
            requiresMapping: true
          });
        }
        throw error;
      }

      // Check if no data was found
      if (metrics.length === 0) {
        throw new Error("Unable to detect data structure in the Excel file. Please use the AI wizard to map your custom format.");
      }

      // For Vortex format, also parse extended financial data
      let extendedData: ExtendedFinancialData = { operational: [], banks: [], taxes: [], investments: [] };
      if (format === 'Vortex') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);
        if (worksheet) {
          extendedData = this.extendedFinancialService.parseExtendedFinancialData(worksheet);
          logger.info(`Extended financial data parsed: ${extendedData.operational.length} operational months processed`);
        }
      }

      // Calculate date range
      const periodStart = metrics.length > 0 ? new Date(metrics[0].date) : null;
      const periodEnd = metrics.length > 0 ? new Date(metrics[metrics.length - 1].date) : null;

      // Create data summary
      const dataSummary = {
        monthsProcessed: metrics.length,
        dateRange: periodStart && periodEnd ? {
          from: periodStart.toISOString(),
          to: periodEnd.toISOString()
        } : null,
        extendedData: {
          operational: extendedData.operational.length,
          banks: extendedData.banks.length,
          taxes: extendedData.taxes.length,
          investments: extendedData.investments.length
        },
        metrics: {
          totalInflows: metrics.reduce((sum, m) => sum + m.totalInflow, 0),
          totalOutflows: metrics.reduce((sum, m) => sum + m.totalOutflow, 0),
          avgMonthlyGeneration: metrics.length > 0 ? 
            metrics.reduce((sum, m) => sum + m.monthlyGeneration, 0) / metrics.length : 0
        }
      };

      // Create data source for cashflow file
      let dataSourceId: string | undefined;
      try {
        const dataSource = await this.dataSourceService.createDataSource({
          companyId: req.tenantId!,
          name: `Cashflow File - ${req.file.originalname}`,
          type: 'excel',
          config: {
            fileType: 'cashflow',
            originalFilename: req.file.originalname,
            uploadDate: new Date().toISOString(),
            monthsProcessed: metrics.length,
            summary: dataSummary,
            description: `Cashflow data from ${req.file.originalname}`
          },
          userId: parseInt(req.user!.id)
        });
        
        dataSourceId = dataSource.id;
        
        // Link the uploaded file to the data source
        await this.dataSourceService.addFileToDataSource({
          dataSourceId,
          fileUploadId,
          fileName: req.file.originalname,
          fileType: 'cashflow',
          fileSize: req.file.size,
          rowCount: metrics.length
        });
        
        logger.info(`Created data source ${dataSourceId} for cashflow file: ${req.file.originalname}`);
        
        // Save cashflow data to structured tables
        if (dataSourceId) {
          await this.cashflowService.saveToCashflowDataTable(
            req.tenantId!, 
            dataSourceId, 
            parseInt(req.user!.id),
            metrics,
            extendedData
          );
          logger.info('Cashflow data successfully saved to cashflow_data table');
        }
      } catch (error) {
        logger.error('Failed to create data source for cashflow file:', error);
        // Don't fail the upload, but log the issue
      }

      // Mark processing as completed
      await this.fileUploadService.markProcessingCompleted(fileUploadId, {
        isValid: true,
        dataSummary,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        monthsAvailable: metrics.length,
        recordsCount: metrics.length
      });

      res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        data: {
          uploadId: fileUploadId,
          filename: req.file.originalname,
          monthsProcessed: metrics.length,
          dateRange: dataSummary.dateRange,
          extendedDataProcessed: dataSummary.extendedData,
          dataSourceId
        }
      });
    } catch (error: any) {
      logger.error('Error processing Excel file:', error);
      const errorMessage = error.message || 'Unknown error processing Excel file';
      
      // Mark processing as failed if we have a file upload ID
      if (fileUploadId) {
        await this.fileUploadService.markProcessingFailed(fileUploadId, errorMessage);
      }
      
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

  async getFinancialSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const extendedData = this.extendedFinancialService.getStoredExtendedData();
      const summary = this.extendedFinancialService.generateFinancialSummary(extendedData);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  async diagnoseInvestments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(createError('No file uploaded', 400));
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return next(createError('No worksheet found in Excel file', 400));
      }

      // Run investment diagnostic
      const diagnosticResults = await this.investmentDiagnosticService.diagnoseInvestmentData(worksheet);
      
      // Also find any investment-related rows
      const investmentRows = this.investmentDiagnosticService.findInvestmentRows(worksheet);

      res.json({
        success: true,
        message: 'Investment diagnostic completed',
        data: {
          diagnostic: diagnosticResults,
          investmentRows: investmentRows,
          recommendations: this.generateRecommendations(diagnosticResults)
        }
      });
    } catch (error: any) {
      logger.error('Error running investment diagnostic:', error);
      next(createError(`Error running diagnostic: ${error.message}`, 500));
    }
  }

  private generateRecommendations(diagnosticResults: any): string[] {
    const recommendations = [];
    
    if (diagnosticResults.issues.includes('All investment values in row 23 are the same')) {
      recommendations.push(
        'The investment portfolio values are identical across all months, which causes the 0% change.',
        'To fix this, ensure that investment values in the Excel file reflect actual month-to-month changes.',
        'Check if the investment data is being updated monthly or if it\'s a static value.'
      );
    }
    
    if (diagnosticResults.issues.includes('No investment values found in rows 21-22')) {
      recommendations.push(
        'No investment data found in the expected rows (21-22).',
        'Verify that investment data is placed in the correct rows in the Excel file.',
        'Consider checking if investment data is located in different rows.'
      );
    }

    return recommendations;
  }
}

export const cashflowController = new CashflowController();