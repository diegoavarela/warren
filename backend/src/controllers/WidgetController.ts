import { Request, Response } from 'express';
import { Pool } from 'pg';
import { pool } from '../config/database';
import { WidgetService } from '../services/WidgetService';
import { logger } from '../utils/logger';
import Joi from 'joi';

interface AuthRequest extends Request {
  user?: {
    id: number;
    companyId: string;
  };
}

export class WidgetController {
  private pool: Pool;
  private widgetService: WidgetService;

  constructor() {
    this.pool = pool;
    this.widgetService = WidgetService.getInstance(this.pool);
  }

  /**
   * Get available widget definitions
   */
  getWidgetDefinitions = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      const definitions = await this.widgetService.getWidgetDefinitions(companyId);
      
      res.json({
        success: true,
        data: definitions
      });
    } catch (error) {
      logger.error('Error fetching widget definitions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch widget definitions'
      });
    }
  };

  /**
   * Get dashboard layouts
   */
  getDashboardLayouts = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const layouts = await this.widgetService.getDashboardLayouts(userId, companyId);
      
      res.json({
        success: true,
        data: layouts
      });
    } catch (error) {
      logger.error('Error fetching dashboard layouts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard layouts'
      });
    }
  };

  /**
   * Get specific dashboard with widgets
   */
  getDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const dashboard = await this.widgetService.getDashboard(layoutId, userId, companyId);
      
      if (!dashboard) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard not found'
        });
      }
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard'
      });
    }
  };

  /**
   * Create dashboard
   */
  createDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard name is required'
        });
      }
      
      const dashboard = await this.widgetService.createDashboard({
        userId,
        companyId,
        name,
        description
      });
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error creating dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create dashboard'
      });
    }
  };

  /**
   * Create dashboard from template
   */
  createDashboardFromTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { name, templateRole } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      if (!name || !templateRole) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard name and template role are required'
        });
      }
      
      const dashboardId = await this.widgetService.createDashboardFromTemplate(
        userId,
        companyId,
        templateRole,
        name
      );
      
      const dashboard = await this.widgetService.getDashboard(dashboardId, userId, companyId);
      
      res.json({
        success: true,
        data: dashboard?.layout
      });
    } catch (error) {
      logger.error('Error creating dashboard from template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create dashboard from template'
      });
    }
  };

  /**
   * Update dashboard
   */
  updateDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const updates = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const dashboard = await this.widgetService.updateDashboard(
        layoutId,
        userId,
        companyId,
        updates
      );
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error updating dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard'
      });
    }
  };

  /**
   * Delete dashboard
   */
  deleteDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      await this.widgetService.deleteDashboard(layoutId, userId, companyId);
      
      res.json({
        success: true,
        message: 'Dashboard deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete dashboard'
      });
    }
  };

  /**
   * Add widget to dashboard
   */
  addWidget = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const { widgetDefinitionId, position, config, dataSourceId } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      if (!widgetDefinitionId || !position) {
        return res.status(400).json({
          success: false,
          error: 'Widget definition ID and position are required'
        });
      }
      
      const widget = await this.widgetService.addWidget({
        layoutId,
        userId,
        companyId,
        widgetDefinitionId,
        position,
        config,
        dataSourceId
      });
      
      res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      logger.error('Error adding widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add widget'
      });
    }
  };

  /**
   * Update widget
   */
  updateWidget = async (req: AuthRequest, res: Response) => {
    try {
      const { widgetId } = req.params;
      const { position, config, dataSourceId } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const widget = await this.widgetService.updateWidget(
        widgetId,
        userId,
        companyId,
        { position, config, dataSourceId }
      );
      
      res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      logger.error('Error updating widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update widget'
      });
    }
  };

  /**
   * Delete widget
   */
  deleteWidget = async (req: AuthRequest, res: Response) => {
    try {
      const { widgetId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      await this.widgetService.deleteWidget(widgetId, userId, companyId);
      
      res.json({
        success: true,
        message: 'Widget deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete widget'
      });
    }
  };

  /**
   * Get widget data
   */
  getWidgetData = async (req: AuthRequest, res: Response) => {
    try {
      const { widgetId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const data = await this.widgetService.getWidgetData(widgetId, userId, companyId);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Error fetching widget data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch widget data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Refresh widget data
   */
  refreshWidget = async (req: AuthRequest, res: Response) => {
    try {
      const { widgetId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const data = await this.widgetService.refreshWidgetData(widgetId, userId, companyId);
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Error refreshing widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh widget'
      });
    }
  };

  /**
   * Share dashboard
   */
  shareDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const { sharedWithUserId, sharedWithRole, permission } = req.body;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      if ((!sharedWithUserId && !sharedWithRole) || !permission) {
        return res.status(400).json({
          success: false,
          error: 'Share target and permission are required'
        });
      }
      
      await this.widgetService.shareDashboard({
        layoutId,
        userId,
        companyId,
        sharedWithUserId,
        sharedWithRole,
        permission
      });
      
      res.json({
        success: true,
        message: 'Dashboard shared successfully'
      });
    } catch (error) {
      logger.error('Error sharing dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share dashboard'
      });
    }
  };

  /**
   * Get dashboard shares
   */
  getDashboardShares = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      const shares = await this.widgetService.getDashboardShares(layoutId, userId, companyId);
      
      res.json({
        success: true,
        data: shares
      });
    } catch (error) {
      logger.error('Error fetching dashboard shares:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard shares'
      });
    }
  };

  /**
   * Remove dashboard share
   */
  removeDashboardShare = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId, shareId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      await this.widgetService.removeDashboardShare(shareId, layoutId, userId, companyId);
      
      res.json({
        success: true,
        message: 'Dashboard share removed successfully'
      });
    } catch (error) {
      logger.error('Error removing dashboard share:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove dashboard share'
      });
    }
  };

  /**
   * Get available templates
   */
  getTemplates = async (req: AuthRequest, res: Response) => {
    try {
      const templates = await this.widgetService.getTemplates();
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch templates'
      });
    }
  };

  /**
   * Update dashboard grid settings (including row height)
   */
  updateDashboardGridSettings = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      // Validate input
      const schema = Joi.object({
        gridColumns: Joi.number().min(4).max(24).optional(),
        gridRowHeight: Joi.number().min(40).max(200).optional()
      });
      
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }
      
      // Update grid settings
      const updated = await this.widgetService.updateDashboardGridSettings(
        layoutId,
        userId,
        companyId,
        value
      );
      
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      logger.error('Error updating dashboard grid settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard grid settings'
      });
    }
  };

  /**
   * Bulk update widget positions (useful for resizing multiple widgets)
   */
  bulkUpdateWidgetPositions = async (req: AuthRequest, res: Response) => {
    try {
      const { layoutId } = req.params;
      const userId = req.user!.id;
      const companyId = req.user!.companyId;
      
      // Validate input
      const schema = Joi.object({
        widgets: Joi.array().items(
          Joi.object({
            widgetId: Joi.string().uuid().required(),
            position: Joi.object({
              x: Joi.number().min(0).required(),
              y: Joi.number().min(0).required(),
              w: Joi.number().min(1).required(),
              h: Joi.number().min(1).required()
            }).required()
          })
        ).required()
      });
      
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }
      
      // Update widget positions
      const updated = await this.widgetService.bulkUpdateWidgetPositions(
        layoutId,
        userId,
        companyId,
        value.widgets
      );
      
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      logger.error('Error bulk updating widget positions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk update widget positions'
      });
    }
  };
}