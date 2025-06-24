import { Request, Response, NextFunction } from 'express';
import { AIExcelAnalysisService } from '../services/AIExcelAnalysisService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface AuthRequest extends Request {
  user?: any;
}

export class ExcelAnalysisController {
  private aiService: AIExcelAnalysisService;

  constructor() {
    this.aiService = AIExcelAnalysisService.getInstance();
  }

  /**
   * Analyze Excel structure using AI
   */
  async analyzeExcel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Excel analysis request received', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mappingType: req.body?.mappingType
      });
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { mappingType } = req.body;
      if (!mappingType || !['cashflow', 'pnl'].includes(mappingType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mapping type. Must be "cashflow" or "pnl"'
        });
      }

      logger.info(`Analyzing ${mappingType} Excel file for user ${req.user?.email}`);

      // Calculate file hash
      const fileHash = crypto.createHash('sha256')
        .update(req.file.buffer)
        .digest('hex');

      // Analyze with AI
      const mapping = await this.aiService.analyzeExcelStructure(
        req.file.buffer,
        mappingType as 'cashflow' | 'pnl'
      );

      // Add file info to mapping
      mapping.fileName = req.file.originalname;

      // Validate the mapping
      const validation = await this.aiService.validateMapping(mapping, req.file.buffer);

      // Get sample data for the editor
      const sampleData = await this.getSampleData(req.file.buffer);

      res.json({
        success: true,
        data: {
          mapping,
          fileHash,
          validation,
          sampleData,
          message: mapping.aiGenerated 
            ? 'AI analysis completed successfully' 
            : 'Pattern matching analysis completed'
        }
      });

    } catch (error: any) {
      logger.error('Excel analysis error:', error);
      
      // Provide better error messages
      if (error.message?.includes('rate limit') || error.response?.status === 429) {
        return res.status(503).json({
          success: false,
          error: 'AI service temporarily unavailable due to rate limits. Using pattern matching fallback.',
          fallbackUsed: true
        });
      }
      
      if (error.message?.includes('API key')) {
        return res.status(503).json({
          success: false,
          error: 'AI service configuration error. Using pattern matching fallback.',
          fallbackUsed: true
        });
      }
      
      // Generic error
      res.status(500).json({
        success: false,
        error: 'Failed to analyze Excel file. Please try again.',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  /**
   * Preview data extraction using a mapping
   */
  async previewExtraction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { mapping } = req.body;
      if (!mapping) {
        return res.status(400).json({
          success: false,
          error: 'No mapping provided'
        });
      }

      logger.info(`Previewing data extraction for user ${req.user?.email}`, {
        mappingType: mapping.type,
        dateRow: mapping.structure?.dateRow,
        dateColumns: mapping.structure?.dateColumns
      });

      // Parse mapping if it's a string
      const parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;

      // Extract data using the mapping
      const extractedData = await this.extractDataWithMapping(
        req.file.buffer,
        parsedMapping
      );

      res.json({
        success: true,
        data: {
          preview: extractedData,
          rowCount: extractedData.months?.length || 0,
          message: 'Data extraction preview generated'
        }
      });

    } catch (error) {
      logger.error('Preview extraction error:', error);
      next(error);
    }
  }

  /**
   * Save a validated mapping
   */
  async saveMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mapping, companyId } = req.body;
      
      if (!mapping) {
        return res.status(400).json({
          success: false,
          error: 'No mapping provided'
        });
      }

      logger.info(`Saving mapping for user ${req.user?.email}`);

      // TODO: Save to database
      // For now, just return success
      res.json({
        success: true,
        data: {
          id: Date.now().toString(),
          message: 'Mapping saved successfully'
        }
      });

    } catch (error) {
      logger.error('Save mapping error:', error);
      next(error);
    }
  }

  /**
   * Get saved mappings
   */
  async getMappings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId, mappingType } = req.query;

      logger.info(`Fetching mappings for user ${req.user?.email}`);

      // TODO: Fetch from database
      // For now, return empty array
      res.json({
        success: true,
        data: {
          mappings: [],
          message: 'No saved mappings found'
        }
      });

    } catch (error) {
      logger.error('Get mappings error:', error);
      next(error);
    }
  }

  /**
   * Process file with mapping and store data
   */
  async processWithMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      const { mapping } = req.body;
      
      if (!mapping) {
        return res.status(400).json({
          success: false,
          error: 'No mapping provided'
        });
      }

      // Parse mapping if it's a string
      let parsedMapping;
      try {
        parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mapping format - must be valid JSON'
        });
      }

      if (!parsedMapping || !parsedMapping.mappingType) {
        return res.status(400).json({
          success: false,
          error: 'Mapping must include mappingType field'
        });
      }

      logger.info(`Processing ${parsedMapping.mappingType} file with custom mapping for user ${req.user?.email}`, {
        fileName: req.file.originalname,
        mappingType: parsedMapping.mappingType,
        hasDateRow: !!parsedMapping.structure?.dateRow,
        hasDateColumns: !!parsedMapping.structure?.dateColumns,
        metricCount: parsedMapping.structure?.metricMappings ? Object.keys(parsedMapping.structure.metricMappings).length : 0
      });

      // Extract data using the mapping
      const extractedData = await this.extractDataWithMapping(req.file.buffer, parsedMapping);
      
      logger.info('Data extraction completed', {
        monthsExtracted: extractedData.months?.length || 0,
        hasData: !!extractedData.months
      });

      // Process the extracted data based on type
      if (parsedMapping.mappingType === 'pnl') {
        // Store in P&L service
        const { PnLService } = require('../services/PnLService');
        const pnlService = PnLService.getInstance();
        
        // Process the extracted data and store it
        await pnlService.processExtractedData(extractedData, req.file.originalname);
        
        // Get the stored metrics and summary
        const metrics = pnlService.getStoredMetrics();
        const summary = pnlService.getSummary();
        
        // Return success response directly instead of calling uploadPnL
        return res.json({
          success: true,
          message: 'P&L file processed successfully with custom mapping',
          data: {
            monthsProcessed: metrics.length,
            summary: {
              totalRevenue: summary.totalRevenue,
              totalCOGS: summary.totalCOGS,
              totalGrossProfit: summary.totalGrossProfit,
              avgGrossMargin: summary.avgGrossMargin
            },
            lastMonth: metrics[metrics.length - 1]?.month || 'N/A'
          }
        });
      } else if (parsedMapping.mappingType === 'cashflow') {
        // Store in Enhanced Cashflow service
        const { CashflowServiceV2Enhanced } = require('../services/CashflowServiceV2Enhanced');
        const cashflowServiceInstance = new CashflowServiceV2Enhanced();
        
        // Process the extracted data and store it
        await cashflowServiceInstance.processExtractedData(extractedData, req.file.originalname);
        
        // Generate dashboard data to return
        const dashboardData = cashflowServiceInstance.generateDashboard();
        
        // Return success response
        return res.json({
          success: true,
          message: 'Cashflow file processed successfully with custom mapping',
          data: {
            monthsProcessed: extractedData.months?.length || 0,
            dashboard: dashboardData
          }
        });
      }

      res.json({
        success: true,
        message: 'File processed successfully with custom mapping',
        data: {
          monthsProcessed: extractedData.months?.length || 0
        }
      });

    } catch (error: any) {
      logger.error('Process with mapping error:', {
        error: error.message,
        stack: error.stack,
        fileName: req.file?.originalname,
        mappingType: req.body?.mapping?.mappingType || 'unknown'
      });
      
      // Return structured error response instead of using next()
      res.status(500).json({
        success: false,
        error: 'Failed to process file with mapping',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }

  /**
   * Helper: Extract data using a mapping
   */
  private async extractDataWithMapping(buffer: Buffer, mapping: any): Promise<any> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    const result: any = {
      months: []
    };

    // Extract dates
    if (mapping.structure.dateRow && mapping.structure.dateColumns) {
      const dateRow = worksheet.getRow(mapping.structure.dateRow);
      
      for (const col of mapping.structure.dateColumns) {
        const dateValue = dateRow.getCell(col).value;
        logger.info(`Processing column ${col}, raw value:`, { value: dateValue, type: typeof dateValue });
        let processedDate: Date | null = null;
        let monthName = '';
        
        // Try different date formats
        if (dateValue instanceof Date) {
          processedDate = dateValue;
          monthName = dateValue.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (typeof dateValue === 'number') {
          // Excel date serial number
          try {
            processedDate = new Date((dateValue - 25569) * 86400 * 1000);
            monthName = processedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          } catch {
            // If date conversion fails, use column number as month
            monthName = `Month ${col}`;
          }
        } else if (typeof dateValue === 'string') {
          // Try to parse string date
          try {
            processedDate = new Date(dateValue);
            if (!isNaN(processedDate.getTime())) {
              monthName = processedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } else {
              // Use the string as is for month name
              monthName = dateValue;
            }
          } catch {
            monthName = dateValue;
          }
        } else {
          // Fallback to column-based naming
          monthName = `Column ${col}`;
        }
        
        // Always create month data, even if date parsing failed
        const monthData: any = {
          date: processedDate,
          month: monthName,
          data: {}
        };

        // Extract metrics for this month
        for (const [key, config] of Object.entries(mapping.structure.metricMappings)) {
          const metricConfig = config as any;
          const value = worksheet.getRow(metricConfig.row).getCell(col).value;
          monthData.data[key] = {
            value: this.getCellValue(value),
            description: metricConfig.description
          };
        }

        result.months.push(monthData);
      }
    }

    return result;
  }

  /**
   * Helper: Get cell value
   */
  private getCellValue(value: any): any {
    if (value === null || value === undefined) return 0;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'object' && 'result' in value) {
      return value.result;
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    
    return 0;
  }

  /**
   * Helper: Get sample data from Excel
   */
  private async getSampleData(buffer: Buffer): Promise<any> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    const sample = {
      worksheetName: worksheet.name,
      totalRows: worksheet.rowCount,
      totalColumns: worksheet.columnCount,
      rows: [] as any[]
    };

    // Extract first 50 rows for editor
    const maxRows = Math.min(50, worksheet.rowCount);
    
    for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = {
        rowNumber: rowNum,
        cells: [] as any[]
      };

      // Extract first 20 columns
      const maxCols = Math.min(20, worksheet.columnCount);
      
      for (let colNum = 1; colNum <= maxCols; colNum++) {
        const cell = row.getCell(colNum);
        const value = this.getCellValue(cell.value);
        
        rowData.cells.push({
          column: colNum,
          value: value,
          type: typeof value
        });
      }
      
      sample.rows.push(rowData);
    }

    return sample;
  }

  /**
   * NEW: Universal Excel analysis that can handle ANY format
   */
  async analyzeUniversal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Universal Excel analysis request received', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mappingType: req.body?.mappingType
      });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { mappingType } = req.body;
      if (!mappingType || !['cashflow', 'pnl'].includes(mappingType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mapping type. Must be "cashflow" or "pnl"'
        });
      }

      logger.info(`Starting UNIVERSAL analysis for ${mappingType} Excel file`);

      // Use the new universal analyzer
      const result = await this.aiService.analyzeUniversalStructure(
        req.file.buffer,
        mappingType as 'cashflow' | 'pnl'
      );

      // Add file info
      result.mapping.fileName = req.file.originalname;

      res.json({
        success: true,
        data: {
          ...result,
          message: 'Universal analysis completed - found ' + result.allMetrics.length + ' metrics'
        }
      });

    } catch (error: any) {
      logger.error('Universal Excel analysis error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to perform universal Excel analysis',
        details: error.message
      });
    }
  }
}