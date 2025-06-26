import { Pool } from 'pg'
import { logger } from '../utils/logger'

export interface FileUploadRecord {
  id: number
  userId: number
  fileType: 'cashflow' | 'pnl' | 'other'
  filename: string
  originalFilename: string
  fileSize: number
  mimeType?: string
  storagePath?: string
  uploadDate: Date
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingStartedAt?: Date
  processingCompletedAt?: Date
  processingError?: string
  isValid: boolean
  validationErrors?: any
  dataSummary?: any
  periodStart?: Date
  periodEnd?: Date
  monthsAvailable?: number
  recordsCount?: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  pnlUploadId?: number
}

export interface FileUploadCreateDto {
  userId: number
  companyId: string
  fileType: 'cashflow' | 'pnl' | 'other'
  filename: string
  originalFilename: string
  fileSize: number
  mimeType?: string
  storagePath?: string
}

export interface FileUploadUpdateDto {
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingStartedAt?: Date
  processingCompletedAt?: Date
  processingError?: string
  isValid?: boolean
  validationErrors?: any
  dataSummary?: any
  periodStart?: Date
  periodEnd?: Date
  monthsAvailable?: number
  recordsCount?: number
  pnlUploadId?: number
}

export class FileUploadService {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  /**
   * Create a new file upload record
   * Soft-deletes any existing active uploads of the same type for the user
   */
  async createFileUpload(data: FileUploadCreateDto): Promise<FileUploadRecord> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // First, soft-delete any existing active uploads of the same type for this user
      const softDeleteQuery = `
        UPDATE file_uploads 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1 AND file_type = $2 AND company_id = $3 AND deleted_at IS NULL
      `
      await client.query(softDeleteQuery, [data.userId, data.fileType, data.companyId])
      
      // Now create the new upload record
      const insertQuery = `
        INSERT INTO file_uploads (
          user_id, company_id, file_type, filename, original_filename, 
          file_size, mime_type, storage_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `
      
      const values = [
        data.userId,
        data.companyId,
        data.fileType,
        data.filename,
        data.originalFilename,
        data.fileSize,
        data.mimeType,
        data.storagePath
      ]

      const result = await client.query(insertQuery, values)
      await client.query('COMMIT')
      
      logger.info(`Created file upload record: ${result.rows[0].id} (soft-deleted previous uploads)`)
      return this.mapToFileUploadRecord(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error creating file upload record:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update a file upload record
   */
  async updateFileUpload(id: number, data: FileUploadUpdateDto): Promise<FileUploadRecord> {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    // Build dynamic update query
    if (data.processingStatus !== undefined) {
      updates.push(`processing_status = $${paramCount}`)
      values.push(data.processingStatus)
      paramCount++
    }

    if (data.processingStartedAt !== undefined) {
      updates.push(`processing_started_at = $${paramCount}`)
      values.push(data.processingStartedAt)
      paramCount++
    }

    if (data.processingCompletedAt !== undefined) {
      updates.push(`processing_completed_at = $${paramCount}`)
      values.push(data.processingCompletedAt)
      paramCount++
    }

    if (data.processingError !== undefined) {
      updates.push(`processing_error = $${paramCount}`)
      values.push(data.processingError)
      paramCount++
    }

    if (data.isValid !== undefined) {
      updates.push(`is_valid = $${paramCount}`)
      values.push(data.isValid)
      paramCount++
    }

    if (data.validationErrors !== undefined) {
      updates.push(`validation_errors = $${paramCount}`)
      values.push(JSON.stringify(data.validationErrors))
      paramCount++
    }

    if (data.dataSummary !== undefined) {
      updates.push(`data_summary = $${paramCount}`)
      values.push(JSON.stringify(data.dataSummary))
      paramCount++
    }

    if (data.periodStart !== undefined) {
      updates.push(`period_start = $${paramCount}`)
      // Validate date before inserting
      const startDate = data.periodStart instanceof Date ? data.periodStart : new Date(data.periodStart);
      values.push(isNaN(startDate.getTime()) ? null : startDate)
      paramCount++
    }

    if (data.periodEnd !== undefined) {
      updates.push(`period_end = $${paramCount}`)
      // Validate date before inserting
      const endDate = data.periodEnd instanceof Date ? data.periodEnd : new Date(data.periodEnd);
      values.push(isNaN(endDate.getTime()) ? null : endDate)
      paramCount++
    }

    if (data.monthsAvailable !== undefined) {
      updates.push(`months_available = $${paramCount}`)
      values.push(data.monthsAvailable)
      paramCount++
    }

    if (data.recordsCount !== undefined) {
      updates.push(`records_count = $${paramCount}`)
      values.push(data.recordsCount)
      paramCount++
    }

    if (data.pnlUploadId !== undefined) {
      updates.push(`pnl_upload_id = $${paramCount}`)
      values.push(data.pnlUploadId)
      paramCount++
    }

    // Add the ID to the values array
    values.push(id)

    const query = `
      UPDATE file_uploads 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    try {
      const result = await this.pool.query(query, values)
      if (result.rows.length === 0) {
        throw new Error(`File upload record not found: ${id}`)
      }
      logger.info(`Updated file upload record: ${id}`)
      return this.mapToFileUploadRecord(result.rows[0])
    } catch (error) {
      logger.error('Error updating file upload record:', error)
      throw error
    }
  }

  /**
   * Get a file upload record by ID
   */
  async getFileUploadById(id: number): Promise<FileUploadRecord | null> {
    const query = 'SELECT * FROM file_uploads WHERE id = $1 AND deleted_at IS NULL'
    
    try {
      const result = await this.pool.query(query, [id])
      if (result.rows.length === 0) {
        return null
      }
      return this.mapToFileUploadRecord(result.rows[0])
    } catch (error) {
      logger.error('Error getting file upload record:', error)
      throw error
    }
  }

  /**
   * Get all file uploads for a user
   */
  async getFileUploadsByUser(userId: number): Promise<FileUploadRecord[]> {
    const query = `
      SELECT * FROM file_uploads 
      WHERE user_id = $1 AND deleted_at IS NULL 
      ORDER BY upload_date DESC
    `
    
    try {
      const result = await this.pool.query(query, [userId])
      return result.rows.map(row => this.mapToFileUploadRecord(row))
    } catch (error) {
      logger.error('Error getting file uploads for user:', error)
      throw error
    }
  }

  /**
   * Get the latest valid file upload for a user and file type
   */
  async getLatestValidUpload(userId: number, fileType: 'cashflow' | 'pnl', companyId?: string): Promise<FileUploadRecord | null> {
    let query = `
      SELECT * FROM file_uploads 
      WHERE user_id = $1 
        AND file_type = $2 
        AND deleted_at IS NULL
        AND processing_status = 'completed'
        AND is_valid = TRUE
    `
    const params: (number | string)[] = [userId, fileType]
    
    // Add company filter if provided
    if (companyId) {
      query += ` AND company_id = $3`
      params.push(companyId)
    }
    
    query += ` ORDER BY upload_date DESC LIMIT 1`
    
    try {
      const result = await this.pool.query(query, params)
      if (result.rows.length === 0) {
        return null
      }
      return this.mapToFileUploadRecord(result.rows[0])
    } catch (error) {
      logger.error('Error getting latest valid upload:', error)
      throw error
    }
  }

  /**
   * Get data availability summary for a user
   */
  async getDataAvailability(userId: number, companyId?: string): Promise<{
    cashflow: FileUploadRecord | null
    pnl: FileUploadRecord | null
  }> {
    try {
      const [cashflow, pnl] = await Promise.all([
        this.getLatestValidUpload(userId, 'cashflow', companyId),
        this.getLatestValidUpload(userId, 'pnl', companyId)
      ])

      return { cashflow, pnl }
    } catch (error) {
      logger.error('Error getting data availability:', error)
      throw error
    }
  }

  /**
   * Soft delete a file upload record
   */
  async deleteFileUpload(id: number): Promise<void> {
    const query = 'UPDATE file_uploads SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1'
    
    try {
      await this.pool.query(query, [id])
      logger.info(`Soft deleted file upload record: ${id}`)
    } catch (error) {
      logger.error('Error deleting file upload record:', error)
      throw error
    }
  }

  /**
   * Mark upload processing as started
   */
  async markProcessingStarted(id: number): Promise<FileUploadRecord> {
    return this.updateFileUpload(id, {
      processingStatus: 'processing',
      processingStartedAt: new Date()
    })
  }

  /**
   * Mark upload processing as completed
   */
  async markProcessingCompleted(
    id: number, 
    data: {
      isValid: boolean
      validationErrors?: any
      dataSummary?: any
      periodStart?: Date
      periodEnd?: Date
      monthsAvailable?: number
      recordsCount?: number
      pnlUploadId?: number
    }
  ): Promise<FileUploadRecord> {
    return this.updateFileUpload(id, {
      ...data,
      processingStatus: 'completed',
      processingCompletedAt: new Date()
    })
  }

  /**
   * Mark upload processing as failed
   */
  async markProcessingFailed(id: number, error: string): Promise<FileUploadRecord> {
    return this.updateFileUpload(id, {
      processingStatus: 'failed',
      processingError: error,
      processingCompletedAt: new Date()
    })
  }

  /**
   * Map database row to FileUploadRecord
   */
  private mapToFileUploadRecord(row: any): FileUploadRecord {
    return {
      id: row.id,
      userId: row.user_id,
      fileType: row.file_type,
      filename: row.filename,
      originalFilename: row.original_filename,
      fileSize: parseInt(row.file_size),
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      uploadDate: row.upload_date,
      processingStatus: row.processing_status,
      processingStartedAt: row.processing_started_at,
      processingCompletedAt: row.processing_completed_at,
      processingError: row.processing_error,
      isValid: row.is_valid,
      validationErrors: row.validation_errors,
      dataSummary: row.data_summary,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      monthsAvailable: row.months_available,
      recordsCount: row.records_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      pnlUploadId: row.pnl_upload_id
    }
  }
}