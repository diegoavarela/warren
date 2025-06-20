import { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface DataSource {
  id: number;
  userId: number;
  fileType: string;
  dataSourceType: string;
  yearStart?: number;
  yearEnd?: number;
  filename: string;
  originalFilename: string;
  uploadedAt: Date;
  isActive: boolean;
  tags: string[];
  dataSummary?: any;
}

export interface DataView {
  id: number;
  userId: number;
  name: string;
  description?: string;
  viewType: 'multi_year' | 'comparison' | 'consolidated';
  fileUploadIds: number[];
  configuration: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsolidatedData {
  viewId?: number;
  viewName?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  sources: DataSource[];
  mergedData: {
    cashflow?: any[];
    pnl?: any[];
    metrics?: any;
  };
  statistics: {
    totalMonths: number;
    totalYears: number;
    dataGaps: Array<{start: Date; end: Date}>;
    overlapPeriods: Array<{start: Date; end: Date; sources: number[]}>;
  };
}

export class MultiSourceDataService {
  constructor(private pool: Pool) {}

  /**
   * Get all data sources for a user
   */
  async getUserDataSources(userId: number, fileType?: string): Promise<DataSource[]> {
    try {
      let query = `
        SELECT 
          id,
          user_id,
          file_type,
          data_source_type,
          year_start,
          year_end,
          filename,
          original_filename,
          uploaded_at,
          is_active,
          tags,
          data_summary
        FROM file_uploads
        WHERE user_id = $1 AND is_active = true
      `;
      
      const params: any[] = [userId];
      
      if (fileType) {
        query += ' AND file_type = $2';
        params.push(fileType);
      }
      
      query += ' ORDER BY year_start DESC, uploaded_at DESC';
      
      const result = await this.pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        fileType: row.file_type,
        dataSourceType: row.data_source_type,
        yearStart: row.year_start,
        yearEnd: row.year_end,
        filename: row.filename,
        originalFilename: row.original_filename,
        uploadedAt: row.uploaded_at,
        isActive: row.is_active,
        tags: row.tags || [],
        dataSummary: row.data_summary
      }));
    } catch (error) {
      logger.error('Error fetching user data sources:', error);
      throw error;
    }
  }

  /**
   * Create a new data view
   */
  async createDataView(
    userId: number,
    name: string,
    viewType: 'multi_year' | 'comparison' | 'consolidated',
    fileUploadIds: number[],
    description?: string,
    configuration?: any
  ): Promise<DataView> {
    try {
      const result = await this.pool.query(
        `INSERT INTO data_views (user_id, name, description, view_type, file_upload_ids, configuration)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, name, description, viewType, fileUploadIds, configuration || {}]
      );
      
      return this.mapDataView(result.rows[0]);
    } catch (error) {
      logger.error('Error creating data view:', error);
      throw error;
    }
  }

  /**
   * Get user's data views
   */
  async getUserDataViews(userId: number): Promise<DataView[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM data_views 
         WHERE user_id = $1 
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );
      
      return result.rows.map(row => this.mapDataView(row));
    } catch (error) {
      logger.error('Error fetching user data views:', error);
      throw error;
    }
  }

  /**
   * Get a specific data view
   */
  async getDataView(viewId: number, userId: number): Promise<DataView | null> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM data_views WHERE id = $1 AND user_id = $2`,
        [viewId, userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapDataView(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching data view:', error);
      throw error;
    }
  }

  /**
   * Update data source metadata
   */
  async updateDataSource(
    uploadId: number,
    userId: number,
    updates: Partial<{
      yearStart: number;
      yearEnd: number;
      tags: string[];
      isActive: boolean;
    }>
  ): Promise<boolean> {
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (updates.yearStart !== undefined) {
        updateFields.push(`year_start = $${paramCount++}`);
        values.push(updates.yearStart);
      }
      
      if (updates.yearEnd !== undefined) {
        updateFields.push(`year_end = $${paramCount++}`);
        values.push(updates.yearEnd);
      }
      
      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramCount++}`);
        values.push(JSON.stringify(updates.tags));
      }
      
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
      }
      
      if (updateFields.length === 0) {
        return false;
      }
      
      values.push(uploadId, userId);
      
      const result = await this.pool.query(
        `UPDATE file_uploads 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount} AND user_id = $${paramCount + 1}`,
        values
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error updating data source:', error);
      throw error;
    }
  }

  /**
   * Consolidate multiple data sources into a single dataset
   */
  async consolidateDataSources(
    userId: number,
    fileUploadIds: number[],
    fileType: 'cashflow' | 'pnl'
  ): Promise<ConsolidatedData> {
    try {
      // Get all data sources
      const sources = await this.getDataSourcesByIds(fileUploadIds, userId);
      
      if (sources.length === 0) {
        throw new Error('No valid data sources found');
      }
      
      // Sort sources by date range
      sources.sort((a, b) => {
        const aStart = a.yearStart || 2020;
        const bStart = b.yearStart || 2020;
        return aStart - bStart;
      });
      
      // Determine overall date range
      const startYear = sources[0].yearStart || new Date(sources[0].uploadedAt).getFullYear();
      const endYear = sources[sources.length - 1].yearEnd || new Date().getFullYear();
      
      // TODO: Implement actual data merging logic based on fileType
      // This would involve:
      // 1. Loading data from each source
      // 2. Handling overlapping periods
      // 3. Merging data with conflict resolution
      // 4. Identifying data gaps
      
      const consolidatedData: ConsolidatedData = {
        dateRange: {
          start: new Date(startYear, 0, 1),
          end: new Date(endYear, 11, 31)
        },
        sources,
        mergedData: {
          cashflow: [],
          pnl: [],
          metrics: {}
        },
        statistics: {
          totalMonths: (endYear - startYear + 1) * 12,
          totalYears: endYear - startYear + 1,
          dataGaps: [],
          overlapPeriods: []
        }
      };
      
      // Log the consolidation operation
      await this.logIntegration(
        userId,
        'consolidate',
        fileUploadIds,
        'completed',
        consolidatedData.statistics
      );
      
      return consolidatedData;
    } catch (error) {
      logger.error('Error consolidating data sources:', error);
      
      // Log the failed operation
      await this.logIntegration(
        userId,
        'consolidate',
        fileUploadIds,
        'failed',
        null,
        error.message
      );
      
      throw error;
    }
  }

  /**
   * Log data integration operations
   */
  private async logIntegration(
    userId: number,
    integrationType: string,
    sourceFiles: number[],
    status: string,
    resultSummary?: any,
    errorDetails?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO data_integration_logs 
         (user_id, integration_type, source_files, status, result_summary, error_details, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          integrationType,
          sourceFiles,
          status,
          resultSummary ? JSON.stringify(resultSummary) : null,
          errorDetails,
          status === 'completed' ? new Date() : null
        ]
      );
    } catch (error) {
      logger.error('Error logging integration:', error);
      // Don't throw here to avoid breaking the main operation
    }
  }

  /**
   * Get data sources by IDs
   */
  private async getDataSourcesByIds(ids: number[], userId: number): Promise<DataSource[]> {
    try {
      const result = await this.pool.query(
        `SELECT 
          id,
          user_id,
          file_type,
          data_source_type,
          year_start,
          year_end,
          filename,
          original_filename,
          uploaded_at,
          is_active,
          tags,
          data_summary
        FROM file_uploads
        WHERE id = ANY($1) AND user_id = $2 AND is_active = true`,
        [ids, userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        fileType: row.file_type,
        dataSourceType: row.data_source_type,
        yearStart: row.year_start,
        yearEnd: row.year_end,
        filename: row.filename,
        originalFilename: row.original_filename,
        uploadedAt: row.uploaded_at,
        isActive: row.is_active,
        tags: row.tags || [],
        dataSummary: row.data_summary
      }));
    } catch (error) {
      logger.error('Error fetching data sources by IDs:', error);
      throw error;
    }
  }

  /**
   * Map database row to DataView interface
   */
  private mapDataView(row: any): DataView {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      viewType: row.view_type,
      fileUploadIds: row.file_upload_ids,
      configuration: row.configuration,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}