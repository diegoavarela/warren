import { Pool } from 'pg';
import { logger } from '../../utils/logger';

export interface AIUsageData {
  companyId: string;
  userId: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  requestType: string;
  requestId?: string;
  responseTimeMs?: number;
  error?: string;
}

export interface UsageSummary {
  totalCostCents: number;
  remainingCreditsCents: number;
  limitCents: number;
  percentUsed: number;
  tokenCount: number;
  requestCount: number;
}

export class AIUsageService {
  private static instance: AIUsageService;
  private pool: Pool;

  // OpenAI pricing per 1K tokens (in cents)
  private readonly PRICING = {
    'gpt-4-turbo-preview': { prompt: 1.0, completion: 3.0 },
    'gpt-4': { prompt: 3.0, completion: 6.0 },
    'gpt-3.5-turbo': { prompt: 0.05, completion: 0.15 },
    'gpt-4o': { prompt: 0.5, completion: 1.5 },
    'gpt-4o-mini': { prompt: 0.015, completion: 0.06 }
  };

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static getInstance(pool: Pool): AIUsageService {
    if (!AIUsageService.instance) {
      AIUsageService.instance = new AIUsageService(pool);
    }
    return AIUsageService.instance;
  }

  /**
   * Track AI usage for a request
   */
  async trackUsage(data: AIUsageData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert usage record
      const insertQuery = `
        INSERT INTO ai_usage (
          company_id, user_id, model, prompt_tokens, completion_tokens,
          total_tokens, cost_cents, request_type, request_id,
          response_time_ms, error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await client.query(insertQuery, [
        data.companyId,
        data.userId,
        data.model,
        data.promptTokens,
        data.completionTokens,
        data.totalTokens,
        data.costCents,
        data.requestType,
        data.requestId || null,
        data.responseTimeMs || null,
        data.error || null
      ]);

      // Update monthly usage metrics
      await this.updateMonthlyMetrics(client, data.companyId, data.costCents);

      await client.query('COMMIT');
      logger.info(`Tracked AI usage: ${data.totalTokens} tokens, $${(data.costCents / 100).toFixed(4)}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error tracking AI usage:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate cost based on model and token counts
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.PRICING[model as keyof typeof this.PRICING] || this.PRICING['gpt-3.5-turbo'];
    
    // Calculate cost in cents
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    
    return Math.ceil(promptCost + completionCost);
  }

  /**
   * Get current month usage for a company
   */
  async getMonthlyUsage(companyId: string): Promise<UsageSummary> {
    const query = `
      WITH monthly_usage AS (
        SELECT 
          COALESCE(SUM(cost_cents), 0) as total_cost,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COUNT(*) as request_count
        FROM ai_usage
        WHERE company_id = $1
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ),
      subscription_limits AS (
        SELECT 
          COALESCE((sp.limits->>'ai_credits_cents')::INTEGER, 0) as limit_cents
        FROM companies c
        LEFT JOIN company_subscriptions cs ON c.id = cs.company_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE c.id = $1
        AND cs.status IN ('active', 'trialing')
        ORDER BY cs.created_at DESC
        LIMIT 1
      )
      SELECT 
        mu.total_cost::INTEGER as total_cost_cents,
        mu.total_tokens::INTEGER as token_count,
        mu.request_count::INTEGER as request_count,
        COALESCE(sl.limit_cents, 0) as limit_cents
      FROM monthly_usage mu
      CROSS JOIN subscription_limits sl
    `;

    const result = await this.pool.query(query, [companyId]);
    const row = result.rows[0];

    const totalCostCents = row?.total_cost_cents || 0;
    const limitCents = row?.limit_cents || 1000; // Default $10 limit
    const remainingCreditsCents = Math.max(0, limitCents - totalCostCents);
    const percentUsed = limitCents > 0 ? (totalCostCents / limitCents) * 100 : 0;

    return {
      totalCostCents,
      remainingCreditsCents,
      limitCents,
      percentUsed,
      tokenCount: row?.token_count || 0,
      requestCount: row?.request_count || 0
    };
  }

  /**
   * Check if company has available AI credits
   */
  async hasAvailableCredits(companyId: string): Promise<boolean> {
    const usage = await this.getMonthlyUsage(companyId);
    return usage.remainingCreditsCents > 0;
  }

  /**
   * Get detailed usage history
   */
  async getUsageHistory(companyId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const query = `
      SELECT 
        u.id,
        u.created_at,
        u.model,
        u.prompt_tokens,
        u.completion_tokens,
        u.total_tokens,
        u.cost_cents,
        u.request_type,
        u.response_time_ms,
        u.error,
        users.email as user_email
      FROM ai_usage u
      JOIN users ON u.user_id = users.id
      WHERE u.company_id = $1
      AND u.created_at >= COALESCE($2, u.created_at)
      AND u.created_at <= COALESCE($3, u.created_at)
      ORDER BY u.created_at DESC
      LIMIT 1000
    `;

    const result = await this.pool.query(query, [companyId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get usage by model breakdown
   */
  async getUsageByModel(companyId: string): Promise<Record<string, any>> {
    const query = `
      SELECT 
        model,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(cost_cents) as total_cost_cents,
        AVG(response_time_ms) as avg_response_time
      FROM ai_usage
      WHERE company_id = $1
      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
      GROUP BY model
      ORDER BY total_cost_cents DESC
    `;

    const result = await this.pool.query(query, [companyId]);
    
    const breakdown: Record<string, any> = {};
    result.rows.forEach(row => {
      breakdown[row.model] = {
        requestCount: parseInt(row.request_count),
        totalTokens: parseInt(row.total_tokens),
        totalCostCents: parseInt(row.total_cost_cents),
        avgResponseTime: row.avg_response_time ? Math.round(row.avg_response_time) : null
      };
    });

    return breakdown;
  }

  /**
   * Update monthly usage metrics
   */
  private async updateMonthlyMetrics(client: any, companyId: string, costCents: number): Promise<void> {
    const upsertQuery = `
      INSERT INTO usage_metrics (
        company_id, metric_type, metric_value, period_start, period_end
      ) VALUES (
        $1, 'ai_usage_cents', $2,
        date_trunc('month', CURRENT_TIMESTAMP),
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 second'
      )
      ON CONFLICT (company_id, metric_type, period_start, period_end)
      DO UPDATE SET 
        metric_value = usage_metrics.metric_value + $2,
        created_at = CURRENT_TIMESTAMP
    `;

    await client.query(upsertQuery, [companyId, costCents]);
  }

  /**
   * Send usage alert if approaching limit
   */
  async checkAndSendUsageAlert(companyId: string): Promise<void> {
    const usage = await this.getMonthlyUsage(companyId);
    
    // Send alerts at 80% and 100% usage
    if (usage.percentUsed >= 80 && usage.percentUsed < 100) {
      // TODO: Send email notification
      logger.warn(`Company ${companyId} has used ${usage.percentUsed.toFixed(1)}% of AI credits`);
    } else if (usage.percentUsed >= 100) {
      logger.error(`Company ${companyId} has exceeded AI credit limit`);
    }
  }

  /**
   * Reset monthly usage (for testing)
   */
  async resetMonthlyUsage(companyId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Usage reset only allowed in development');
    }

    const deleteQuery = `
      DELETE FROM ai_usage
      WHERE company_id = $1
      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;

    await this.pool.query(deleteQuery, [companyId]);
    logger.info(`Reset AI usage for company ${companyId}`);
  }
}