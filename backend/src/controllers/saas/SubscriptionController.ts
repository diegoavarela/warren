import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../../services/saas/StripeService';
import { AIUsageService } from '../../services/saas/AIUsageService';
import { logger } from '../../utils/logger';
import { Pool } from 'pg';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    companyId?: string;
    companyName?: string;
  };
}

export class SubscriptionController {
  private stripeService: StripeService | null;
  private aiUsageService: AIUsageService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.stripeService = StripeService.getInstance(pool);
    this.aiUsageService = AIUsageService.getInstance(pool);
  }

  /**
   * Get available subscription plans
   */
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const query = `
        SELECT 
          id,
          name,
          display_name as "displayName",
          price_cents as "priceCents",
          currency,
          features,
          limits
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY price_cents ASC
      `;

      const result = await this.pool.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching plans:', error);
      next(error);
    }
  }

  /**
   * Get current subscription for the company
   */
  async getCurrentSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const query = `
        SELECT 
          cs.id,
          cs.plan_id as "planId",
          cs.status,
          cs.current_period_start as "currentPeriodStart",
          cs.current_period_end as "currentPeriodEnd",
          cs.cancel_at_period_end as "cancelAtPeriodEnd",
          sp.name as "planName",
          sp.display_name as "planDisplayName",
          sp.price_cents as "priceCents",
          sp.currency,
          sp.features,
          sp.limits
        FROM company_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE cs.company_id = $1
        AND cs.status IN ('active', 'trialing')
        ORDER BY cs.created_at DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [req.user.companyId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      const subscription = result.rows[0];
      
      res.json({
        success: true,
        data: {
          id: subscription.id,
          planId: subscription.planId,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          plan: {
            id: subscription.planId,
            name: subscription.planName,
            displayName: subscription.planDisplayName,
            priceCents: subscription.priceCents,
            currency: subscription.currency,
            features: subscription.features,
            limits: subscription.limits
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      next(error);
    }
  }

  /**
   * Create checkout session for upgrading
   */
  async createCheckoutSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!this.stripeService || !this.stripeService.isStripeConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Payment processing is not available at this time'
        });
      }

      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required'
        });
      }

      // Get plan details
      const planQuery = `
        SELECT stripe_price_id, name 
        FROM subscription_plans 
        WHERE id = $1 AND is_active = true
      `;
      const planResult = await this.pool.query(planQuery, [planId]);
      
      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      const plan = planResult.rows[0];
      
      if (!plan.stripe_price_id) {
        return res.status(400).json({
          success: false,
          message: 'This plan is not available for purchase'
        });
      }

      // Get or create Stripe customer
      let stripeCustomerId: string;
      const customerQuery = `
        SELECT stripe_customer_id FROM companies WHERE id = $1
      `;
      const customerResult = await this.pool.query(customerQuery, [req.user.companyId]);
      
      if (customerResult.rows[0].stripe_customer_id) {
        stripeCustomerId = customerResult.rows[0].stripe_customer_id;
      } else {
        // Create new Stripe customer
        const customer = await this.stripeService.createCustomer({
          email: req.user.email,
          companyName: req.user.companyName || '',
          companyId: req.user.companyId
        });
        
        stripeCustomerId = customer.id;
        
        // Update company with Stripe customer ID
        await this.pool.query(
          'UPDATE companies SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, req.user.companyId]
        );
      }

      // Create checkout session
      const session = await this.stripeService.createCheckoutSession({
        customerId: stripeCustomerId,
        priceId: plan.stripe_price_id,
        successUrl: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.FRONTEND_URL}/pricing`,
        metadata: {
          companyId: req.user.companyId,
          planId: planId
        }
      });

      res.json({
        success: true,
        data: {
          checkoutUrl: session.url
        }
      });
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      next(error);
    }
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get Stripe customer ID
      const customerQuery = `
        SELECT stripe_customer_id FROM companies WHERE id = $1
      `;
      const customerResult = await this.pool.query(customerQuery, [req.user.companyId]);
      
      const stripeCustomerId = customerResult.rows[0]?.stripe_customer_id;
      
      if (!stripeCustomerId) {
        return res.status(400).json({
          success: false,
          message: 'No billing information found'
        });
      }

      // Create portal session
      if (!this.stripeService) {
        return res.status(503).json({
          success: false,
          message: 'Billing service is not available'
        });
      }
      
      const session = await this.stripeService.createPortalSession({
        customerId: stripeCustomerId,
        returnUrl: `${process.env.FRONTEND_URL}/subscription`
      });

      res.json({
        success: true,
        data: {
          portalUrl: session.url
        }
      });
    } catch (error) {
      logger.error('Error creating portal session:', error);
      next(error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get current subscription
      const subQuery = `
        SELECT stripe_subscription_id 
        FROM company_subscriptions 
        WHERE company_id = $1 
        AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const subResult = await this.pool.query(subQuery, [req.user.companyId]);
      
      if (subResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      const stripeSubscriptionId = subResult.rows[0].stripe_subscription_id;
      
      if (!stripeSubscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel this subscription type'
        });
      }

      // Cancel in Stripe
      if (this.stripeService) {
        await this.stripeService.cancelSubscription(stripeSubscriptionId);
      }

      res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the billing period'
      });
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      next(error);
    }
  }

  /**
   * Get usage data
   */
  async getUsage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get AI usage
      const aiUsage = await this.aiUsageService.getMonthlyUsage(req.user.companyId);

      // Get storage usage
      const storageQuery = `
        SELECT 
          COALESCE(SUM(file_size), 0) as used_bytes
        FROM file_uploads
        WHERE company_id = $1
        AND deleted_at IS NULL
      `;
      const storageResult = await this.pool.query(storageQuery, [req.user.companyId]);

      // Get user count
      const userQuery = `
        SELECT COUNT(*) as user_count
        FROM users
        WHERE company_id = $1
        AND is_active = true
      `;
      const userResult = await this.pool.query(userQuery, [req.user.companyId]);

      // Get view count for freemium
      const viewQuery = `
        SELECT 
          COUNT(*) as monthly_count,
          (SELECT limits->>'monthly_views' FROM get_company_subscription($1)) as monthly_limit
        FROM view_tracking
        WHERE company_id = $1
        AND viewed_at >= date_trunc('month', CURRENT_TIMESTAMP)
      `;
      const viewResult = await this.pool.query(viewQuery, [req.user.companyId]);

      // Get subscription limits
      const limitsQuery = `
        SELECT limits FROM get_company_subscription($1)
      `;
      const limitsResult = await this.pool.query(limitsQuery, [req.user.companyId]);
      const limits = limitsResult.rows[0]?.limits || {};

      const monthlyViews = parseInt(viewResult.rows[0].monthly_count);
      const viewLimit = parseInt(viewResult.rows[0].monthly_limit) || -1;

      res.json({
        success: true,
        data: {
          ai: {
            totalCostCents: aiUsage.totalCostCents,
            remainingCreditsCents: aiUsage.remainingCreditsCents,
            limitCents: aiUsage.limitCents,
            percentUsed: aiUsage.percentUsed,
            tokenCount: aiUsage.tokenCount,
            requestCount: aiUsage.requestCount
          },
          storage: {
            usedBytes: parseInt(storageResult.rows[0].used_bytes),
            limitBytes: (limits.storage_gb || 1) * 1024 * 1024 * 1024,
            percentUsed: 0 // Calculate based on limit
          },
          users: {
            count: parseInt(userResult.rows[0].user_count),
            limit: limits.users || 1
          },
          views: {
            monthlyCount: monthlyViews,
            monthlyLimit: viewLimit,
            remainingViews: viewLimit === -1 ? -1 : Math.max(0, viewLimit - monthlyViews)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching usage:', error);
      next(error);
    }
  }

  /**
   * Check feature access
   */
  async checkFeature(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { featureName } = req.params;

      const query = `
        SELECT check_feature_access($1, $2) as has_access
      `;
      const result = await this.pool.query(query, [req.user.companyId, featureName]);

      res.json({
        success: true,
        data: {
          hasAccess: result.rows[0].has_access
        }
      });
    } catch (error) {
      logger.error('Error checking feature:', error);
      next(error);
    }
  }

  /**
   * Track view for freemium limitations
   */
  async trackView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.companyId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { viewType, metadata } = req.body;

      const query = `
        INSERT INTO view_tracking (company_id, user_id, view_type, metadata)
        VALUES ($1, $2, $3, $4)
      `;

      await this.pool.query(query, [
        req.user.companyId,
        req.user.id,
        viewType || 'dashboard',
        metadata || {}
      ]);

      res.json({
        success: true,
        message: 'View tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking view:', error);
      next(error);
    }
  }
}