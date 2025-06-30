/**
 * File Upload Controller V2
 * 
 * Refactored controller using dependency injection and decorators
 */

import { Request, Response } from 'express';
import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Body, 
  Param, 
  Query,
  UseMiddleware,
  Req,
  Res
} from '../core/decorators/Controller';
import { Injectable, Inject, SERVICES } from '../core/Container';
import { ParserService } from '../parser/ParserService';
import { FileUploadService } from '../services/FileUploadService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { FileFormat, ParserConfig } from '../types/parser';
import { logger } from '../utils/logger';
import Joi from 'joi';

/**
 * File upload request DTO
 */
interface FileUploadDto {
  fileName: string;
  fileSize: number;
  mimeType: string;
  mappingType: 'pnl' | 'cashflow' | 'balance_sheet';
  currency?: string;
  language?: string;
}

/**
 * File upload validation schema
 */
const fileUploadSchema = Joi.object({
  fileName: Joi.string().required(),
  fileSize: Joi.number().positive().max(100 * 1024 * 1024).required(), // 100MB max
  mimeType: Joi.string().required(),
  mappingType: Joi.string().valid('pnl', 'cashflow', 'balance_sheet').required(),
  currency: Joi.string().length(3).optional(),
  language: Joi.string().length(2).optional()
});

@Injectable()
@Controller('/api/v2/files')
@UseMiddleware(authenticateToken)
export class FileUploadControllerV2 {
  constructor(
    @Inject(SERVICES.ParserService) private parserService: ParserService,
    @Inject(SERVICES.FileService) private fileService: FileUploadService,
    @Inject(SERVICES.Logger) private logger: any
  ) {}
  
  /**
   * Upload and parse a file
   */
  @Post('/upload')
  @UseMiddleware(validateRequest({ body: fileUploadSchema }))
  async uploadFile(
    @Body() uploadDto: FileUploadDto,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const startTime = Date.now();
    const userId = (req as any).user?.id;
    const companyId = (req as any).user?.companyId;
    
    try {
      this.logger.info('File upload request received', {
        userId,
        companyId,
        fileName: uploadDto.fileName,
        fileSize: uploadDto.fileSize,
        mappingType: uploadDto.mappingType
      });
      
      // Check if file is uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }
      
      // Detect file format
      const format = this.detectFileFormat(uploadDto.fileName, uploadDto.mimeType);
      if (!format) {
        res.status(400).json({
          success: false,
          error: 'Unsupported file format'
        });
        return;
      }
      
      // Create parser configuration
      const parserConfig: ParserConfig = {
        fileName: uploadDto.fileName,
        fileFormat: format,
        options: {
          currency: uploadDto.currency,
          language: uploadDto.language,
          mappingType: uploadDto.mappingType
        }
      };
      
      // Parse the file
      const parseResult = await this.parserService.parse(req.file.buffer, parserConfig);
      
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Failed to parse file',
          details: parseResult.errors
        });
        return;
      }
      
      // Save parsed data
      const savedFile = await this.fileService.saveUpload({
        userId,
        companyId,
        fileName: uploadDto.fileName,
        fileSize: uploadDto.fileSize,
        mimeType: uploadDto.mimeType,
        mappingType: uploadDto.mappingType,
        parsedData: parseResult.data,
        metadata: parseResult.metadata
      });
      
      // Log success
      this.logger.info('File uploaded and parsed successfully', {
        fileId: savedFile.id,
        processingTime: Date.now() - startTime,
        confidence: parseResult.confidence?.overall
      });
      
      res.status(200).json({
        success: true,
        data: {
          fileId: savedFile.id,
          fileName: uploadDto.fileName,
          statementType: parseResult.metadata?.statementType,
          periods: parseResult.metadata?.timePeriods,
          lineItemCount: parseResult.metadata?.lineItemCount,
          confidence: parseResult.confidence,
          processingTime: Date.now() - startTime
        }
      });
    } catch (error) {
      this.logger.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Get uploaded files
   */
  @Get('/')
  async getFiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('mappingType') mappingType: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      
      const files = await this.fileService.getFiles({
        companyId,
        page: parseInt(page),
        limit: parseInt(limit),
        mappingType: mappingType as any
      });
      
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      this.logger.error('Get files error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve files'
      });
    }
  }
  
  /**
   * Get file details
   */
  @Get('/:id')
  async getFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      
      const file = await this.fileService.getFile(parseInt(id), companyId, userId);
      
      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: file
      });
    } catch (error) {
      this.logger.error('Get file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file'
      });
    }
  }
  
  /**
   * Delete a file
   */
  @Delete('/:id')
  async deleteFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      
      const deleted = await this.fileService.deleteFile(parseInt(id), companyId, userId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'File not found'
        });
        return;
      }
      
      this.logger.info('File deleted', { fileId: id, userId });
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file'
      });
    }
  }
  
  /**
   * Get parser capabilities
   */
  @Get('/parser/capabilities')
  async getParserCapabilities(
    @Res() res: Response
  ): Promise<void> {
    try {
      const parsers = this.parserService.getAvailableParsers();
      const plugins = this.parserService.getAvailablePlugins();
      
      res.json({
        success: true,
        data: {
          parsers,
          plugins,
          supportedFormats: ['excel', 'csv', 'pdf'],
          maxFileSize: 100 * 1024 * 1024, // 100MB
          features: {
            aiEnhanced: true,
            multiCurrency: true,
            multiLanguage: true,
            confidenceScoring: true,
            anomalyDetection: true
          }
        }
      });
    } catch (error) {
      this.logger.error('Get capabilities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capabilities'
      });
    }
  }
  
  /**
   * Detect file format from filename and mime type
   */
  private detectFileFormat(fileName: string, mimeType: string): FileFormat | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Check by extension
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return FileFormat.EXCEL;
      case 'csv':
        return FileFormat.CSV;
      case 'pdf':
        return FileFormat.PDF;
    }
    
    // Check by mime type
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return FileFormat.EXCEL;
    }
    if (mimeType.includes('csv')) {
      return FileFormat.CSV;
    }
    if (mimeType.includes('pdf')) {
      return FileFormat.PDF;
    }
    
    return null;
  }
}