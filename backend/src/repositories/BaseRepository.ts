/**
 * Base Repository
 * 
 * Abstract base class for all repositories providing common CRUD operations
 */

import { Pool, PoolClient } from 'pg';
import { Injectable, Inject, SERVICES } from '../core/Container';
import { logger } from '../utils/logger';

/**
 * Query result
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Transaction callback
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Base repository with common database operations
 */
@Injectable()
export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  protected abstract primaryKey: string;
  
  constructor(
    @Inject(SERVICES.Database) protected db: Pool,
    @Inject(SERVICES.Logger) protected logger: any
  ) {}
  
  /**
   * Find by ID
   */
  async findById(id: string | number): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.query<T>(query, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Find all with optional conditions
   */
  async findAll(conditions?: Partial<T>): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const values: any[] = [];
    
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    const result = await this.query<T>(query, values);
    return result.rows;
  }
  
  /**
   * Find one with conditions
   */
  async findOne(conditions: Partial<T>): Promise<T | null> {
    const results = await this.findAll(conditions);
    return results[0] || null;
  }
  
  /**
   * Find with pagination
   */
  async findPaginated(
    options: PaginationOptions,
    conditions?: Partial<T>
  ): Promise<PaginatedResult<T>> {
    const { page, limit, orderBy, orderDirection = 'ASC' } = options;
    const offset = (page - 1) * limit;
    
    // Build query
    let query = `SELECT * FROM ${this.tableName}`;
    let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    const values: any[] = [];
    
    // Add conditions
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
      countQuery += ` WHERE ${whereClause}`;
    }
    
    // Add ordering
    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }
    
    // Add pagination
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    // Execute queries
    const [dataResult, countResult] = await Promise.all([
      this.query<T>(query, values),
      this.query<{ count: string }>(countQuery, values.slice(0, -2))
    ]);
    
    const total = parseInt(countResult.rows[0]?.count || '0');
    
    return {
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.query<T>(query, values);
    return result.rows[0];
  }
  
  /**
   * Update a record
   */
  async update(id: string | number, data: Partial<T>): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    
    values.push(id);
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $${values.length}
      RETURNING *
    `;
    
    const result = await this.query<T>(query, values);
    return result.rows[0] || null;
  }
  
  /**
   * Delete a record
   */
  async delete(id: string | number): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }
  
  /**
   * Soft delete a record
   */
  async softDelete(id: string | number): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }
  
  /**
   * Count records
   */
  async count(conditions?: Partial<T>): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    const values: any[] = [];
    
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    const result = await this.query<{ count: string }>(query, values);
    return parseInt(result.rows[0]?.count || '0');
  }
  
  /**
   * Check if exists
   */
  async exists(conditions: Partial<T>): Promise<boolean> {
    const count = await this.count(conditions);
    return count > 0;
  }
  
  /**
   * Execute a raw query
   */
  protected async query<R = any>(
    text: string,
    values?: any[]
  ): Promise<QueryResult<R>> {
    const start = Date.now();
    
    try {
      const result = await this.db.query(text, values) as any;
      
      const duration = Date.now() - start;
      this.logger.debug('Query executed', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      this.logger.error('Query error', {
        text,
        values,
        error
      });
      throw error;
    }
  }
  
  /**
   * Execute a transaction
   */
  async transaction<R>(callback: TransactionCallback<R>): Promise<R> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Batch insert
   */
  async batchInsert(data: Partial<T>[]): Promise<T[]> {
    if (data.length === 0) return [];
    
    const fields = Object.keys(data[0]);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    data.forEach((item, batchIndex) => {
      const rowPlaceholders = fields.map((_, fieldIndex) => {
        const index = batchIndex * fields.length + fieldIndex + 1;
        return `$${index}`;
      });
      
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...Object.values(item));
    });
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    
    const result = await this.query<T>(query, values);
    return result.rows;
  }
  
  /**
   * Upsert (insert or update)
   */
  async upsert(
    data: Partial<T>,
    conflictFields: string[]
  ): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    
    const updateClause = fields
      .filter(field => !conflictFields.includes(field))
      .map(field => `${field} = EXCLUDED.${field}`)
      .join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${conflictFields.join(', ')})
      DO UPDATE SET ${updateClause}, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await this.query<T>(query, values);
    return result.rows[0];
  }
}