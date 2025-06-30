import { Request, Response } from 'express';
import { Pool } from 'pg';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: number;
    companyId: string;
  };
}

export class DataSourceController {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * List data sources for the company
   */
  listDataSources = async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      
      const query = `
        SELECT 
          id,
          company_id as "companyId",
          name,
          type,
          status,
          config,
          last_sync as "lastSync",
          next_sync as "nextSync",
          sync_frequency as "syncFrequency",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM data_sources 
        WHERE company_id = $1 AND status != 'deleted'
        ORDER BY created_at DESC
      `;
      
      const result = await this.pool.query(query, [companyId]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching data sources:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data sources'
      });
    }
  };

  /**
   * Get a specific data source
   */
  getDataSource = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      
      const query = `
        SELECT 
          id,
          company_id as "companyId",
          name,
          type,
          status,
          config,
          last_sync as "lastSync",
          next_sync as "nextSync",
          sync_frequency as "syncFrequency",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM data_sources 
        WHERE id = $1 AND company_id = $2
      `;
      
      const result = await this.pool.query(query, [id, companyId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data source'
      });
    }
  };

  /**
   * Create a new data source
   */
  createDataSource = async (req: AuthRequest, res: Response) => {
    try {
      const { name, type, config, syncFrequency } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Name and type are required'
        });
      }
      
      const query = `
        INSERT INTO data_sources (
          company_id, name, type, config, sync_frequency, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW(), NOW())
        RETURNING 
          id,
          company_id as "companyId",
          name,
          type,
          status,
          config,
          sync_frequency as "syncFrequency",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const result = await this.pool.query(query, [
        companyId,
        name,
        type,
        JSON.stringify(config || {}),
        syncFrequency || 'manual',
        userId
      ]);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error creating data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create data source'
      });
    }
  };

  /**
   * Update a data source
   */
  updateDataSource = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, config, syncFrequency, status } = req.body;
      const companyId = req.user!.companyId;
      
      // Verify ownership
      const verifyQuery = 'SELECT id FROM data_sources WHERE id = $1 AND company_id = $2';
      const verifyResult = await this.pool.query(verifyQuery, [id, companyId]);
      
      if (verifyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }
      
      if (type !== undefined) {
        updateFields.push(`type = $${paramCount}`);
        values.push(type);
        paramCount++;
      }
      
      if (config !== undefined) {
        updateFields.push(`config = $${paramCount}`);
        values.push(JSON.stringify(config));
        paramCount++;
      }
      
      if (syncFrequency !== undefined) {
        updateFields.push(`sync_frequency = $${paramCount}`);
        values.push(syncFrequency);
        paramCount++;
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id, companyId);
      
      const query = `
        UPDATE data_sources 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
        RETURNING 
          id,
          company_id as "companyId",
          name,
          type,
          status,
          config,
          sync_frequency as "syncFrequency",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
      
      const result = await this.pool.query(query, values);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update data source'
      });
    }
  };

  /**
   * Delete a data source
   */
  deleteDataSource = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      
      // Soft delete - just mark as deleted
      const query = `
        UPDATE data_sources 
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND company_id = $2
        RETURNING id
      `;
      
      const result = await this.pool.query(query, [id, companyId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Data source deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete data source'
      });
    }
  };

  /**
   * Sync a data source
   */
  syncDataSource = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;
      
      // Verify ownership
      const verifyQuery = 'SELECT * FROM data_sources WHERE id = $1 AND company_id = $2';
      const verifyResult = await this.pool.query(verifyQuery, [id, companyId]);
      
      if (verifyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data source not found'
        });
      }
      
      // Update last sync time
      const updateQuery = `
        UPDATE data_sources 
        SET last_sync = NOW(), updated_at = NOW()
        WHERE id = $1 AND company_id = $2
      `;
      
      await this.pool.query(updateQuery, [id, companyId]);
      
      // TODO: Implement actual sync logic based on data source type
      // For now, just return success
      
      res.json({
        success: true,
        message: 'Data source sync initiated'
      });
    } catch (error) {
      logger.error('Error syncing data source:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync data source'
      });
    }
  };
}