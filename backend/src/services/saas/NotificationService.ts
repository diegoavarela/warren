import { Pool } from 'pg';
import { EmailService } from '../EmailService';
import { logger } from '../../utils/logger';

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface UsageAlert {
  type: 'ai_usage' | 'storage' | 'users' | 'views';
  threshold: number;
  currentUsage: number;
  limit: number;
  percentUsed: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private pool: Pool;
  private emailService: EmailService;

  // Notification templates
  private templates: Record<string, NotificationTemplate> = {
    AI_USAGE_WARNING: {
      id: 'ai_usage_warning',
      name: 'AI Usage Warning',
      subject: 'Warren: AI Usage Alert - {{percent}}% Used',
      body: `
        <h2>AI Usage Alert</h2>
        <p>Hello {{userName}},</p>
        <p>Your company <strong>{{companyName}}</strong> has used <strong>{{percent}}%</strong> of your monthly AI credits.</p>
        <ul>
          <li>Used: ${{used}}</li>
          <li>Limit: ${{limit}}</li>
          <li>Remaining: ${{remaining}}</li>
        </ul>
        <p>To avoid service interruption, please consider <a href="{{upgradeUrl}}">upgrading your plan</a>.</p>
      `,
      variables: ['userName', 'companyName', 'percent', 'used', 'limit', 'remaining', 'upgradeUrl']
    },
    AI_USAGE_EXCEEDED: {
      id: 'ai_usage_exceeded',
      name: 'AI Usage Exceeded',
      subject: 'Warren: AI Credits Exhausted',
      body: `
        <h2>AI Credits Exhausted</h2>
        <p>Hello {{userName}},</p>
        <p>Your company <strong>{{companyName}}</strong> has exhausted its monthly AI credits.</p>
        <p>AI-powered features are now disabled until the next billing cycle or until you upgrade your plan.</p>
        <p><a href="{{upgradeUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>
      `,
      variables: ['userName', 'companyName', 'upgradeUrl']
    },
    VIEW_LIMIT_WARNING: {
      id: 'view_limit_warning',
      name: 'View Limit Warning',
      subject: 'Warren: Dashboard View Limit Alert',
      body: `
        <h2>Dashboard View Limit Alert</h2>
        <p>Hello {{userName}},</p>
        <p>You have <strong>{{remaining}} views</strong> remaining this month.</p>
        <p>Once you reach your limit, you'll need to upgrade to continue accessing your dashboard.</p>
        <p><a href="{{pricingUrl}}">View Upgrade Options</a></p>
      `,
      variables: ['userName', 'remaining', 'pricingUrl']
    },
    SUBSCRIPTION_TRIAL_ENDING: {
      id: 'subscription_trial_ending',
      name: 'Trial Ending Soon',
      subject: 'Warren: Your Trial Ends in {{days}} Days',
      body: `
        <h2>Your Trial is Ending Soon</h2>
        <p>Hello {{userName}},</p>
        <p>Your free trial of Warren {{planName}} ends in <strong>{{days}} days</strong>.</p>
        <p>Don't lose access to your financial insights! Add your payment method now to continue without interruption.</p>
        <p><a href="{{billingUrl}}" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Add Payment Method</a></p>
      `,
      variables: ['userName', 'planName', 'days', 'billingUrl']
    },
    PAYMENT_FAILED: {
      id: 'payment_failed',
      name: 'Payment Failed',
      subject: 'Warren: Payment Failed - Action Required',
      body: `
        <h2>Payment Failed</h2>
        <p>Hello {{userName}},</p>
        <p>We were unable to process your payment for Warren {{planName}}.</p>
        <p>Please update your payment method within <strong>3 days</strong> to avoid service interruption.</p>
        <p><a href="{{billingUrl}}" style="background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Payment Method</a></p>
      `,
      variables: ['userName', 'planName', 'billingUrl']
    }
  };

  private constructor(pool: Pool) {
    this.pool = pool;
    this.emailService = EmailService.getInstance();
  }

  static getInstance(pool: Pool): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(pool);
    }
    return NotificationService.instance;
  }

  /**
   * Check and send usage alerts
   */
  async checkAndSendUsageAlerts(companyId: string): Promise<void> {
    try {
      // Get company and subscription info
      const companyQuery = `
        SELECT 
          c.id,
          c.name as company_name,
          cs.plan_id,
          sp.limits,
          sp.name as plan_name
        FROM companies c
        LEFT JOIN company_subscriptions cs ON c.id = cs.company_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE c.id = $1
        AND cs.status IN ('active', 'trialing')
      `;
      
      const companyResult = await this.pool.query(companyQuery, [companyId]);
      if (companyResult.rows.length === 0) return;

      const company = companyResult.rows[0];
      const limits = company.limits || {};

      // Check AI usage
      if (limits.ai_credits_cents && limits.ai_credits_cents > 0) {
        await this.checkAIUsageAlert(companyId, limits.ai_credits_cents);
      }

      // Check view limit for freemium
      if (company.plan_name === 'freemium' && limits.monthly_views) {
        await this.checkViewLimitAlert(companyId, limits.monthly_views);
      }

      // Check trial ending
      await this.checkTrialEndingAlert(companyId);

    } catch (error) {
      logger.error('Error checking usage alerts:', error);
    }
  }

  /**
   * Check AI usage and send alerts
   */
  private async checkAIUsageAlert(companyId: string, limitCents: number): Promise<void> {
    // Get current usage
    const usageQuery = `
      SELECT COALESCE(SUM(cost_cents), 0) as total_cost
      FROM ai_usage
      WHERE company_id = $1
      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;

    const usageResult = await this.pool.query(usageQuery, [companyId]);
    const totalCost = parseInt(usageResult.rows[0].total_cost);
    const percentUsed = (totalCost / limitCents) * 100;

    // Check if we need to send alerts
    const alertQuery = `
      SELECT last_alert_sent, alert_80_sent, alert_100_sent
      FROM notification_state
      WHERE company_id = $1 AND notification_type = 'ai_usage'
    `;
    
    const alertResult = await this.pool.query(alertQuery, [companyId]);
    const alertState = alertResult.rows[0] || {};

    // Send 80% warning
    if (percentUsed >= 80 && percentUsed < 100 && !alertState.alert_80_sent) {
      await this.sendAIUsageWarning(companyId, percentUsed, totalCost, limitCents);
      await this.updateAlertState(companyId, 'ai_usage', { alert_80_sent: true });
    }

    // Send 100% alert
    if (percentUsed >= 100 && !alertState.alert_100_sent) {
      await this.sendAIUsageExceeded(companyId);
      await this.updateAlertState(companyId, 'ai_usage', { alert_100_sent: true });
    }
  }

  /**
   * Check view limit for freemium
   */
  private async checkViewLimitAlert(companyId: string, monthlyLimit: number): Promise<void> {
    const viewQuery = `
      SELECT COUNT(*) as view_count
      FROM view_tracking
      WHERE company_id = $1
      AND viewed_at >= date_trunc('month', CURRENT_TIMESTAMP)
    `;

    const viewResult = await this.pool.query(viewQuery, [companyId]);
    const viewCount = parseInt(viewResult.rows[0].view_count);
    const remaining = monthlyLimit - viewCount;

    // Send alert when 2 views remaining
    if (remaining === 2) {
      const alertQuery = `
        SELECT alert_sent
        FROM notification_state
        WHERE company_id = $1 
        AND notification_type = 'view_limit'
        AND date_trunc('month', created_at) = date_trunc('month', CURRENT_TIMESTAMP)
      `;
      
      const alertResult = await this.pool.query(alertQuery, [companyId]);
      
      if (alertResult.rows.length === 0 || !alertResult.rows[0].alert_sent) {
        await this.sendViewLimitWarning(companyId, remaining);
        await this.updateAlertState(companyId, 'view_limit', { alert_sent: true });
      }
    }
  }

  /**
   * Check trial ending
   */
  private async checkTrialEndingAlert(companyId: string): Promise<void> {
    const trialQuery = `
      SELECT 
        cs.trial_end,
        sp.name as plan_name,
        EXTRACT(DAY FROM cs.trial_end - CURRENT_TIMESTAMP) as days_remaining
      FROM company_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.company_id = $1
      AND cs.status = 'trialing'
      AND cs.trial_end > CURRENT_TIMESTAMP
    `;

    const trialResult = await this.pool.query(trialQuery, [companyId]);
    if (trialResult.rows.length === 0) return;

    const trial = trialResult.rows[0];
    const daysRemaining = Math.floor(trial.days_remaining);

    // Send alerts at 3 days and 1 day
    if ([3, 1].includes(daysRemaining)) {
      const alertKey = `trial_${daysRemaining}_day`;
      const alertQuery = `
        SELECT metadata->>'${alertKey}' as alert_sent
        FROM notification_state
        WHERE company_id = $1 AND notification_type = 'trial_ending'
      `;
      
      const alertResult = await this.pool.query(alertQuery, [companyId]);
      
      if (!alertResult.rows[0]?.alert_sent) {
        await this.sendTrialEndingAlert(companyId, trial.plan_name, daysRemaining);
        await this.updateAlertState(companyId, 'trial_ending', { [alertKey]: true });
      }
    }
  }

  /**
   * Send AI usage warning email
   */
  private async sendAIUsageWarning(
    companyId: string, 
    percentUsed: number, 
    usedCents: number, 
    limitCents: number
  ): Promise<void> {
    const users = await this.getCompanyAdmins(companyId);
    const company = await this.getCompanyInfo(companyId);

    for (const user of users) {
      await this.sendNotification('AI_USAGE_WARNING', user.email, {
        userName: user.name || user.email,
        companyName: company.name,
        percent: Math.round(percentUsed),
        used: (usedCents / 100).toFixed(2),
        limit: (limitCents / 100).toFixed(2),
        remaining: ((limitCents - usedCents) / 100).toFixed(2),
        upgradeUrl: `${process.env.FRONTEND_URL}/pricing`
      });
    }
  }

  /**
   * Send AI usage exceeded email
   */
  private async sendAIUsageExceeded(companyId: string): Promise<void> {
    const users = await this.getCompanyAdmins(companyId);
    const company = await this.getCompanyInfo(companyId);

    for (const user of users) {
      await this.sendNotification('AI_USAGE_EXCEEDED', user.email, {
        userName: user.name || user.email,
        companyName: company.name,
        upgradeUrl: `${process.env.FRONTEND_URL}/pricing`
      });
    }
  }

  /**
   * Send view limit warning
   */
  private async sendViewLimitWarning(companyId: string, remaining: number): Promise<void> {
    const users = await this.getCompanyUsers(companyId);

    for (const user of users) {
      await this.sendNotification('VIEW_LIMIT_WARNING', user.email, {
        userName: user.name || user.email,
        remaining: remaining.toString(),
        pricingUrl: `${process.env.FRONTEND_URL}/pricing`
      });
    }
  }

  /**
   * Send trial ending alert
   */
  private async sendTrialEndingAlert(companyId: string, planName: string, days: number): Promise<void> {
    const users = await this.getCompanyAdmins(companyId);

    for (const user of users) {
      await this.sendNotification('SUBSCRIPTION_TRIAL_ENDING', user.email, {
        userName: user.name || user.email,
        planName,
        days: days.toString(),
        billingUrl: `${process.env.FRONTEND_URL}/subscription`
      });
    }
  }

  /**
   * Send notification using template
   */
  private async sendNotification(
    templateId: string, 
    to: string, 
    variables: Record<string, string>
  ): Promise<void> {
    const template = this.templates[templateId];
    if (!template) {
      logger.error(`Notification template not found: ${templateId}`);
      return;
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    try {
      await this.emailService.sendEmail({
        to,
        subject,
        html: body
      });
      
      logger.info(`Sent notification ${templateId} to ${to}`);
    } catch (error) {
      logger.error(`Failed to send notification ${templateId} to ${to}:`, error);
    }
  }

  /**
   * Get company admins
   */
  private async getCompanyAdmins(companyId: string): Promise<any[]> {
    const query = `
      SELECT id, email, name
      FROM users
      WHERE company_id = $1
      AND role IN ('company_admin', 'platform_admin')
      AND is_active = true
    `;
    
    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get all company users
   */
  private async getCompanyUsers(companyId: string): Promise<any[]> {
    const query = `
      SELECT id, email, name
      FROM users
      WHERE company_id = $1
      AND is_active = true
    `;
    
    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Get company info
   */
  private async getCompanyInfo(companyId: string): Promise<any> {
    const query = `SELECT id, name FROM companies WHERE id = $1`;
    const result = await this.pool.query(query, [companyId]);
    return result.rows[0] || { name: 'Unknown Company' };
  }

  /**
   * Update alert state
   */
  private async updateAlertState(
    companyId: string, 
    notificationType: string, 
    metadata: any
  ): Promise<void> {
    const query = `
      INSERT INTO notification_state (company_id, notification_type, metadata)
      VALUES ($1, $2, $3)
      ON CONFLICT (company_id, notification_type)
      DO UPDATE SET 
        metadata = notification_state.metadata || $3,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [companyId, notificationType, JSON.stringify(metadata)]);
  }
}