import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { MultiSourceDataService } from '../services/MultiSourceDataService';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export class MultiSourceController {
  private multiSourceService: MultiSourceDataService;

  constructor() {
    this.multiSourceService = new MultiSourceDataService(pool);
  }

  /**
   * Get all data sources for the authenticated user
   */
  async getDataSources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      const fileType = req.query.fileType as string;
      
      const sources = await this.multiSourceService.getUserDataSources(userId, fileType);
      
      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error('Error fetching data sources:', error);
      next(createError('Failed to fetch data sources', 500));
    }
  }

  /**
   * Update data source metadata
   */
  async updateDataSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      const uploadId = parseInt(req.params.id);
      const updates = req.body;
      
      const success = await this.multiSourceService.updateDataSource(
        uploadId,
        userId,
        updates
      );
      
      if (!success) {
        return next(createError('Data source not found or no changes made', 404));
      }
      
      res.json({
        success: true,
        message: 'Data source updated successfully'
      });
    } catch (error) {
      logger.error('Error updating data source:', error);
      next(createError('Failed to update data source', 500));
    }
  }

  /**
   * Create a new data view
   */
  async createDataView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      const { name, viewType, fileUploadIds, description, configuration } = req.body;
      
      if (!name || !viewType || !fileUploadIds || fileUploadIds.length === 0) {
        return next(createError('Missing required fields', 400));
      }
      
      const dataView = await this.multiSourceService.createDataView(
        userId,
        name,
        viewType,
        fileUploadIds,
        description,
        configuration
      );
      
      res.json({
        success: true,
        data: dataView
      });
    } catch (error) {
      logger.error('Error creating data view:', error);
      next(createError('Failed to create data view', 500));
    }
  }

  /**
   * Get all data views for the authenticated user
   */
  async getDataViews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      
      const views = await this.multiSourceService.getUserDataViews(userId);
      
      res.json({
        success: true,
        data: views
      });
    } catch (error) {
      logger.error('Error fetching data views:', error);
      next(createError('Failed to fetch data views', 500));
    }
  }

  /**
   * Get a specific data view
   */
  async getDataView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      const viewId = parseInt(req.params.id);
      
      const view = await this.multiSourceService.getDataView(viewId, userId);
      
      if (!view) {
        return next(createError('Data view not found', 404));
      }
      
      res.json({
        success: true,
        data: view
      });
    } catch (error) {
      logger.error('Error fetching data view:', error);
      next(createError('Failed to fetch data view', 500));
    }
  }

  /**
   * Consolidate multiple data sources
   */
  async consolidateData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.user!.id);
      const { fileUploadIds, fileType } = req.body;
      
      if (!fileUploadIds || fileUploadIds.length === 0 || !fileType) {
        return next(createError('Missing required fields', 400));
      }
      
      const consolidatedData = await this.multiSourceService.consolidateDataSources(
        userId,
        fileUploadIds,
        fileType
      );
      
      res.json({
        success: true,
        data: consolidatedData
      });
    } catch (error) {
      logger.error('Error consolidating data:', error);
      next(createError('Failed to consolidate data sources', 500));
    }
  }

  /**
   * Bulk upload multiple files
   */
  async bulkUpload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return next(createError('No files uploaded', 400));
      }
      
      const userId = parseInt(req.user!.id);
      const fileType = req.body.fileType || 'cashflow';
      const results = [];
      
      logger.info(`Bulk upload: ${req.files.length} files received for user ${req.user?.email}`);
      
      // Process each file
      for (const file of req.files) {
        try {
          // TODO: Process each file using existing upload logic
          // For now, we'll just log the file info
          results.push({
            filename: file.originalname,
            size: file.size,
            status: 'pending',
            message: 'File queued for processing'
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            size: file.size,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        message: `Bulk upload initiated for ${req.files.length} files`,
        data: {
          totalFiles: req.files.length,
          results
        }
      });
    } catch (error) {
      logger.error('Error in bulk upload:', error);
      next(createError('Failed to process bulk upload', 500));
    }
  }
}