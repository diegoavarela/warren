import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../../services/saas/StripeService';
import { logger } from '../../utils/logger';
import { Pool } from 'pg';

export class StripeWebhookController {
  private stripeService: StripeService | null;

  constructor(pool: Pool) {
    this.stripeService = StripeService.getInstance(pool);
  }

  /**
   * Handle incoming Stripe webhooks
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing stripe-signature header'
        });
      }

      // Stripe requires the raw body for webhook verification
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).json({
          success: false,
          message: 'Missing raw body for webhook verification'
        });
      }

      if (this.stripeService) {
        await this.stripeService.handleWebhook(rawBody, signature);
      } else {
        logger.warn('Stripe service not configured, webhook ignored');
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      
      // Return 400 for webhook errors to trigger Stripe retry
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed'
      });
    }
  }
}