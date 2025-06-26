import { Pool } from 'pg';
import { logger } from '../../utils/logger';

export interface AuditLogEntry {
  userId: number;
  companyId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditQuery {
  companyId?: string;
  userId?: number;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private static instance: AuditService;
  private pool: Pool;

  // Critical actions that should always be logged
  private static CRITICAL_ACTIONS = [
    'user.login',
    'user.logout',
    'user.failed_login',
    'user.password_change',
    'user.2fa_enable',
    'user.2fa_disable',
    'data.export',
    'data.delete',
    'subscription.change',
    'subscription.cancel',
    'payment.success',
    'payment.failed',
    'company.settings_change',
    'user.invite',
    'user.remove',
    'api.key_created',
    'api.key_deleted'
  ];

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static getInstance(pool: Pool): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService(pool);
    }
    return AuditService.instance;
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, company_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await client.query(query, [
        entry.userId,
        entry.companyId,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]);

      // Log critical actions to system logger as well
      if (AuditService.CRITICAL_ACTIONS.includes(entry.action)) {
        logger.info(`AUDIT [${entry.action}]: User ${entry.userId} in company ${entry.companyId}`, {
          entityType: entry.entityType,
          entityId: entry.entityId,
          ipAddress: entry.ipAddress
        });
      }
    } catch (error) {
      logger.error('Failed to write audit log:', error);
      // Don't throw - audit failures shouldn't break the app
    } finally {
      client.release();
    }
  }

  /**
   * Query audit logs
   */
  async query(params: AuditQuery): Promise<any[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (params.companyId) {
      conditions.push(`company_id = $${paramCount++}`);
      values.push(params.companyId);
    }

    if (params.userId) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(params.userId);
    }

    if (params.action) {
      conditions.push(`action = $${paramCount++}`);
      values.push(params.action);
    }

    if (params.entityType) {
      conditions.push(`entity_type = $${paramCount++}`);
      values.push(params.entityType);
    }

    if (params.startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(params.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const query = `
      SELECT 
        al.*,
        u.email as user_email,
        u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get audit summary for a company
   */
  async getCompanySummary(companyId: string, days: number = 30): Promise<any> {
    const query = `
      WITH daily_stats AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action) as unique_actions
        FROM audit_logs
        WHERE company_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      action_stats AS (
        SELECT 
          action,
          COUNT(*) as count
        FROM audit_logs
        WHERE company_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      ),
      user_stats AS (
        SELECT 
          u.email,
          COUNT(*) as action_count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.company_id = $1
        AND al.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY u.email
        ORDER BY action_count DESC
        LIMIT 10
      )
      SELECT 
        (SELECT COUNT(*) FROM audit_logs WHERE company_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${days} days') as total_events,
        (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE company_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${days} days') as unique_users,
        (SELECT json_agg(daily_stats ORDER BY date DESC) FROM daily_stats) as daily_activity,
        (SELECT json_agg(action_stats) FROM action_stats) as top_actions,
        (SELECT json_agg(user_stats) FROM user_stats) as most_active_users
    `;

    const result = await this.pool.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Log data access
   */
  async logDataAccess(params: {
    userId: number;
    companyId: string;
    dataType: string;
    operation: 'view' | 'export' | 'modify' | 'delete';
    recordCount?: number;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      companyId: params.companyId,
      action: `data.${params.operation}`,
      entityType: params.dataType,
      metadata: {
        recordCount: params.recordCount,
        ...params.metadata
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }

  /**
   * Log authentication events
   */
  async logAuth(params: {
    userId?: number;
    email: string;
    companyId?: string;
    action: 'login' | 'logout' | 'failed_login' | 'password_reset' | '2fa_success' | '2fa_failed';
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    await this.log({
      userId: params.userId || 0,
      companyId: params.companyId || 'system',
      action: `user.${params.action}`,
      entityType: 'user',
      entityId: params.email,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }

  /**
   * Log subscription changes
   */
  async logSubscriptionChange(params: {
    userId: number;
    companyId: string;
    oldPlan?: string;
    newPlan: string;
    action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate';
    metadata?: any;
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      companyId: params.companyId,
      action: `subscription.${params.action}`,
      entityType: 'subscription',
      oldValues: params.oldPlan ? { plan: params.oldPlan } : undefined,
      newValues: { plan: params.newPlan },
      metadata: params.metadata
    });
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < CURRENT_DATE - INTERVAL '${retentionDays} days'
      RETURNING id
    `;

    const result = await this.pool.query(query);
    const deletedCount = result.rowCount;
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} audit log entries older than ${retentionDays} days`);
    }
    
    return deletedCount;
  }

  /**
   * Export audit logs for compliance
   */
  async exportForCompliance(companyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        al.id,
        al.created_at,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.metadata,
        u.email as user_email,
        u.name as user_name,
        c.name as company_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN companies c ON al.company_id = c.id
      WHERE al.company_id = $1
      AND al.created_at >= $2
      AND al.created_at <= $3
      ORDER BY al.created_at ASC
    `;

    const result = await this.pool.query(query, [companyId, startDate, endDate]);
    return result.rows;
  }
}