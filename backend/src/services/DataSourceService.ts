import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { encryptionService } from '../utils/encryption';
import { FileUploadService } from './FileUploadService';
import { auditService } from './saas/AuditService';

export interface DataSource {
  id: string;
  companyId: string;
  name: string;
  type: 'excel' | 'google_sheets' | 'quickbooks' | 'csv' | 'api' | 'manual';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  config?: any;
  lastSync?: Date;
  nextSync?: Date;
  syncFrequency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSourceFile {
  id: string;
  dataSourceId: string;
  fileUploadId?: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  sheetName?: string;
  columns?: any;
  rowCount?: number;
  dateRange?: { start: Date; end: Date };
  isActive: boolean;
  uploadedAt: Date;
}

export class DataSourceService {
  private static instance: DataSourceService;
  private pool: Pool;
  private fileUploadService: FileUploadService;

  private constructor(pool: Pool) {
    this.pool = pool;
    this.fileUploadService = new FileUploadService(pool);
  }

  static getInstance(pool: Pool): DataSourceService {
    if (!DataSourceService.instance) {
      DataSourceService.instance = new DataSourceService(pool);
    }
    return DataSourceService.instance;
  }

  /**
   * Create a new data source
   */
  async createDataSource(params: {
    companyId: string;
    name: string;
    type: DataSource['type'];
    config?: any;
    syncFrequency?: string;
    userId: number;
  }): Promise<DataSource> {
    // Check limit
    const canCreate = await this.checkDataSourceLimit(params.companyId);
    if (!canCreate) {
      throw new Error('Data source limit reached. Please upgrade your plan.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Encrypt sensitive config if present
      let encryptedConfig = params.config;
      if (params.config && params.type !== 'excel') {
        encryptedConfig = await encryptionService.encryptString(
          JSON.stringify(params.config),
          params.companyId
        );
      }

      const query = `
        INSERT INTO data_sources (
          company_id, name, type, config, sync_frequency, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await client.query(query, [
        params.companyId,
        params.name,
        params.type,
        encryptedConfig ? JSON.stringify({ encrypted: encryptedConfig }) : '{}',
        params.syncFrequency || 'manual',
        params.userId
      ]);

      await client.query('COMMIT');

      const dataSource = this.mapToDataSource(result.rows[0]);

      // Audit log
      await auditService.log({
        userId: params.userId,
        companyId: params.companyId,
        action: 'data_source.created',
        entityType: 'data_source',
        entityId: dataSource.id,
        newValues: { name: params.name, type: params.type }
      });

      logger.info(`Created data source: ${dataSource.id} for company: ${params.companyId}`);
      return dataSource;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating data source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List data sources for a company
   */
  async listDataSources(companyId: string): Promise<DataSource[]> {
    const query = `
      SELECT ds.*, 
        COUNT(DISTINCT dsf.id) as file_count,
        MAX(dsf.uploaded_at) as last_file_upload
      FROM data_sources ds
      LEFT JOIN data_source_files dsf ON ds.id = dsf.data_source_id AND dsf.is_active = true
      WHERE ds.company_id = $1
      GROUP BY ds.id
      ORDER BY ds.created_at DESC
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows.map(row => ({
      ...this.mapToDataSource(row),
      fileCount: parseInt(row.file_count),
      lastFileUpload: row.last_file_upload
    }));
  }

  /**
   * Add file to data source
   */
  async addFileToDataSource(params: {
    dataSourceId: string;
    fileUploadId: number;
    fileName: string;
    fileType: string;
    fileSize?: number;
    sheetName?: string;
    columns?: any;
    rowCount?: number;
    dateRange?: { start: Date; end: Date };
  }): Promise<DataSourceFile> {
    const query = `
      INSERT INTO data_source_files (
        data_source_id, file_upload_id, file_name, file_type,
        file_size, sheet_name, columns, row_count, date_range
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      params.dataSourceId,
      params.fileUploadId,
      params.fileName,
      params.fileType,
      params.fileSize,
      params.sheetName,
      params.columns ? JSON.stringify(params.columns) : null,
      params.rowCount,
      params.dateRange ? JSON.stringify(params.dateRange) : null
    ]);

    logger.info(`Added file to data source: ${params.dataSourceId}`);
    return this.mapToDataSourceFile(result.rows[0]);
  }

  /**
   * Get files for a data source
   */
  async getDataSourceFiles(
    dataSourceId: string,
    activeOnly: boolean = true
  ): Promise<DataSourceFile[]> {
    const query = `
      SELECT dsf.*, fu.original_filename, fu.file_size as upload_size
      FROM data_source_files dsf
      LEFT JOIN file_uploads fu ON dsf.file_upload_id = fu.id
      WHERE dsf.data_source_id = $1
      ${activeOnly ? 'AND dsf.is_active = true' : ''}
      ORDER BY dsf.uploaded_at DESC
    `;

    const result = await this.pool.query(query, [dataSourceId]);
    return result.rows.map(row => this.mapToDataSourceFile(row));
  }

  /**
   * Deactivate old files when new one is uploaded
   */
  async deactivateOldFiles(dataSourceId: string, keepLatest: number = 1): Promise<void> {
    const query = `
      UPDATE data_source_files
      SET is_active = false
      WHERE data_source_id = $1
      AND id NOT IN (
        SELECT id FROM data_source_files
        WHERE data_source_id = $1
        ORDER BY uploaded_at DESC
        LIMIT $2
      )
    `;

    await this.pool.query(query, [dataSourceId, keepLatest]);
  }

  /**
   * Update data source status
   */
  async updateDataSourceStatus(
    dataSourceId: string,
    status: DataSource['status'],
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE data_sources
      SET status = $1, 
          updated_at = CURRENT_TIMESTAMP,
          config = CASE 
            WHEN $2 IS NOT NULL 
            THEN jsonb_set(config, '{last_error}', $2::jsonb)
            ELSE config
          END
      WHERE id = $3
    `;

    await this.pool.query(query, [
      status,
      error ? JSON.stringify(error) : null,
      dataSourceId
    ]);
  }

  /**
   * Check if company can create more data sources
   */
  private async checkDataSourceLimit(companyId: string): Promise<boolean> {
    const query = `SELECT check_data_source_limit($1) as can_create`;
    const result = await this.pool.query(query, [companyId]);
    return result.rows[0].can_create;
  }

  /**
   * Get data source by ID
   */
  async getDataSource(dataSourceId: string, companyId: string): Promise<DataSource | null> {
    const query = `
      SELECT * FROM data_sources 
      WHERE id = $1 AND company_id = $2
    `;

    const result = await this.pool.query(query, [dataSourceId, companyId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToDataSource(result.rows[0]);
  }

  /**
   * Delete data source
   */
  async deleteDataSource(dataSourceId: string, companyId: string, userId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify ownership
      const checkQuery = `
        SELECT name FROM data_sources 
        WHERE id = $1 AND company_id = $2
      `;
      const checkResult = await client.query(checkQuery, [dataSourceId, companyId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Data source not found');
      }

      const dataSourceName = checkResult.rows[0].name;

      // Delete (cascades to files and records)
      await client.query('DELETE FROM data_sources WHERE id = $1', [dataSourceId]);

      await client.query('COMMIT');

      // Audit log
      await auditService.log({
        userId,
        companyId,
        action: 'data_source.deleted',
        entityType: 'data_source',
        entityId: dataSourceId,
        oldValues: { name: dataSourceName }
      });

      logger.info(`Deleted data source: ${dataSourceId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting data source:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create multiple Excel data sources from file array
   */
  async createMultipleExcelSources(params: {
    companyId: string;
    userId: number;
    files: Array<{
      fileUploadId: number;
      fileName: string;
      fileSize: number;
      metadata?: any;
    }>;
  }): Promise<DataSource[]> {
    const sources: DataSource[] = [];
    
    for (const file of params.files) {
      try {
        // Create a data source for each file
        const dataSource = await this.createDataSource({
          companyId: params.companyId,
          name: file.fileName,
          type: 'excel',
          userId: params.userId
        });

        // Add the file to the data source
        await this.addFileToDataSource({
          dataSourceId: dataSource.id,
          fileUploadId: file.fileUploadId,
          fileName: file.fileName,
          fileType: 'excel',
          fileSize: file.fileSize,
          ...file.metadata
        });

        sources.push(dataSource);
      } catch (error) {
        logger.error(`Error creating data source for file ${file.fileName}:`, error);
        // Continue with other files
      }
    }

    return sources;
  }

  /**
   * Map database row to DataSource
   */
  private mapToDataSource(row: any): DataSource {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      type: row.type,
      status: row.status,
      config: row.config,
      lastSync: row.last_sync,
      nextSync: row.next_sync,
      syncFrequency: row.sync_frequency,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to DataSourceFile
   */
  private mapToDataSourceFile(row: any): DataSourceFile {
    return {
      id: row.id,
      dataSourceId: row.data_source_id,
      fileUploadId: row.file_upload_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      sheetName: row.sheet_name,
      columns: row.columns,
      rowCount: row.row_count,
      dateRange: row.date_range,
      isActive: row.is_active,
      uploadedAt: row.uploaded_at
    };
  }
}