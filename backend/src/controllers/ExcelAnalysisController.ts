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

    } catch (error) {
      logger.error('Excel analysis error:', error);
      next(error);
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

      logger.info(`Previewing data extraction for user ${req.user?.email}`);

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
        if (dateValue instanceof Date) {
          const monthData: any = {
            date: dateValue,
            month: dateValue.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
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
}