/**
 * Company Repository
 * 
 * Repository for company data access with business-specific queries
 */

import { Injectable } from '../core/Container';
import { BaseRepository, PaginatedResult } from './BaseRepository';
import { PoolClient } from 'pg';

/**
 * Company entity
 */
export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  country?: string;
  currency: string;
  fiscal_year_start?: number;
  timezone?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  metadata?: any;
}

/**
 * Company user relationship
 */
export interface CompanyUser {
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joined_at: Date;
  invited_by?: string;
}

/**
 * Company statistics
 */
export interface CompanyStats {
  companyId: string;
  userCount: number;
  fileCount: number;
  lastActivityAt?: Date;
  storageUsed: number;
  apiCallsThisMonth: number;
}

/**
 * Company search options
 */
export interface CompanySearchOptions {
  query?: string;
  industry?: string;
  country?: string;
  minSize?: number;
  maxSize?: number;
  hasActiveSubscription?: boolean;
}

@Injectable()
export class CompanyRepository extends BaseRepository<Company> {
  protected tableName = 'companies';
  protected primaryKey = 'id';
  
  /**
   * Find company by domain
   */
  async findByDomain(domain: string): Promise<Company | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE domain = $1 AND deleted_at IS NULL
    `;
    
    const result = await this.query<Company>(query, [domain]);
    return result.rows[0] || null;
  }
  
  /**
   * Search companies
   */
  async search(
    options: CompanySearchOptions & { page: number; limit: number }
  ): Promise<PaginatedResult<Company>> {
    const { page, limit, query, industry, country, minSize, maxSize, hasActiveSubscription } = options;
    const offset = (page - 1) * limit;
    const conditions: string[] = ['c.deleted_at IS NULL'];
    const values: any[] = [];
    
    // Build search conditions
    if (query) {
      values.push(`%${query}%`);
      conditions.push(`(c.name ILIKE $${values.length} OR c.domain ILIKE $${values.length})`);
    }
    
    if (industry) {
      values.push(industry);
      conditions.push(`c.industry = $${values.length}`);
    }
    
    if (country) {
      values.push(country);
      conditions.push(`c.country = $${values.length}`);
    }
    
    if (minSize !== undefined) {
      values.push(minSize);
      conditions.push(`CAST(c.size AS INTEGER) >= $${values.length}`);
    }
    
    if (maxSize !== undefined) {
      values.push(maxSize);
      conditions.push(`CAST(c.size AS INTEGER) <= $${values.length}`);
    }
    
    if (hasActiveSubscription !== undefined) {
      conditions.push(
        hasActiveSubscription
          ? 'EXISTS (SELECT 1 FROM subscriptions s WHERE s.company_id = c.id AND s.status = \'active\')'
          : 'NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.company_id = c.id AND s.status = \'active\')'
      );
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Execute queries
    const dataQuery = `
      SELECT c.* FROM ${this.tableName} c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM ${this.tableName} c
      ${whereClause}
    `;
    
    values.push(limit, offset);
    
    const [dataResult, countResult] = await Promise.all([
      this.query<Company>(dataQuery, values),
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
   * Get company users
   */
  async getUsers(companyId: string): Promise<CompanyUser[]> {
    const query = `
      SELECT cu.*, u.email, u.first_name, u.last_name, u.avatar_url
      FROM company_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.company_id = $1
      ORDER BY cu.joined_at DESC
    `;
    
    const result = await this.query<CompanyUser & {
      email: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    }>(query, [companyId]);
    
    return result.rows;
  }
  
  /**
   * Add user to company
   */
  async addUser(
    companyId: string,
    userId: string,
    role: CompanyUser['role'],
    invitedBy?: string
  ): Promise<CompanyUser> {
    const query = `
      INSERT INTO company_users (company_id, user_id, role, permissions, invited_by, joined_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const permissions = this.getDefaultPermissions(role);
    const result = await this.query<CompanyUser>(query, [
      companyId,
      userId,
      role,
      permissions,
      invitedBy
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Update user role
   */
  async updateUserRole(
    companyId: string,
    userId: string,
    role: CompanyUser['role']
  ): Promise<CompanyUser | null> {
    const query = `
      UPDATE company_users
      SET role = $3, permissions = $4, updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const permissions = this.getDefaultPermissions(role);
    const result = await this.query<CompanyUser>(query, [
      companyId,
      userId,
      role,
      permissions
    ]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Remove user from company
   */
  async removeUser(companyId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM company_users
      WHERE company_id = $1 AND user_id = $2
    `;
    
    const result = await this.query(query, [companyId, userId]);
    return result.rowCount > 0;
  }
  
  /**
   * Get company statistics
   */
  async getStats(companyId: string): Promise<CompanyStats> {
    const query = `
      SELECT 
        $1 as company_id,
        (SELECT COUNT(*) FROM company_users WHERE company_id = $1) as user_count,
        (SELECT COUNT(*) FROM files WHERE company_id = $1 AND deleted_at IS NULL) as file_count,
        (SELECT MAX(created_at) FROM activity_logs WHERE company_id = $1) as last_activity_at,
        COALESCE((SELECT SUM(file_size) FROM files WHERE company_id = $1 AND deleted_at IS NULL), 0) as storage_used,
        COALESCE((
          SELECT COUNT(*) FROM api_calls 
          WHERE company_id = $1 
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) as api_calls_this_month
    `;
    
    const result = await this.query<CompanyStats>(query, [companyId]);
    return result.rows[0];
  }
  
  /**
   * Create company with owner
   */
  async createWithOwner(
    companyData: Partial<Company>,
    ownerId: string,
    client?: PoolClient
  ): Promise<Company> {
    const executeQuery = async (queryClient: PoolClient) => {
      // Create company
      const createQuery = `
        INSERT INTO ${this.tableName} (id, name, domain, industry, currency, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const companyResult = await queryClient.query<Company>(createQuery, [
        companyData.name,
        companyData.domain,
        companyData.industry,
        companyData.currency || 'USD'
      ]);
      
      const company = companyResult.rows[0];
      
      // Add owner to company
      const addOwnerQuery = `
        INSERT INTO company_users (company_id, user_id, role, permissions, joined_at)
        VALUES ($1, $2, 'owner', $3, CURRENT_TIMESTAMP)
      `;
      
      await queryClient.query(addOwnerQuery, [
        company.id,
        ownerId,
        this.getDefaultPermissions('owner')
      ]);
      
      return company;
    };
    
    // Execute in transaction
    if (client) {
      return executeQuery(client);
    } else {
      return this.transaction(executeQuery);
    }
  }
  
  /**
   * Get companies for user
   */
  async getCompaniesForUser(userId: string): Promise<(Company & { role: string })[]> {
    const query = `
      SELECT c.*, cu.role
      FROM ${this.tableName} c
      JOIN company_users cu ON c.id = cu.company_id
      WHERE cu.user_id = $1 AND c.deleted_at IS NULL
      ORDER BY cu.joined_at DESC
    `;
    
    const result = await this.query<Company & { role: string }>(query, [userId]);
    return result.rows;
  }
  
  /**
   * Check if user has access to company
   */
  async hasAccess(
    companyId: string,
    userId: string,
    requiredRole?: CompanyUser['role']
  ): Promise<boolean> {
    let query = `
      SELECT role FROM company_users
      WHERE company_id = $1 AND user_id = $2
    `;
    
    const result = await this.query<{ role: string }>(query, [companyId, userId]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    if (!requiredRole) {
      return true;
    }
    
    const userRole = result.rows[0].role as CompanyUser['role'];
    return this.hasRequiredRole(userRole, requiredRole);
  }
  
  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(role: CompanyUser['role']): string[] {
    const permissions: { [key: string]: string[] } = {
      owner: ['*'], // All permissions
      admin: [
        'company:read',
        'company:update',
        'users:read',
        'users:create',
        'users:update',
        'users:delete',
        'files:read',
        'files:create',
        'files:update',
        'files:delete',
        'analytics:read',
        'settings:read',
        'settings:update'
      ],
      member: [
        'company:read',
        'users:read',
        'files:read',
        'files:create',
        'files:update',
        'analytics:read',
        'settings:read'
      ],
      viewer: [
        'company:read',
        'users:read',
        'files:read',
        'analytics:read'
      ]
    };
    
    return permissions[role] || [];
  }
  
  /**
   * Check if user role has required permissions
   */
  private hasRequiredRole(
    userRole: CompanyUser['role'],
    requiredRole: CompanyUser['role']
  ): boolean {
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}