import express, { Request, Response, NextFunction } from 'express';
import { StripeWebhookController } from '../controllers/saas/StripeWebhookController';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

export function createStripeRoutes(pool: Pool) {
  const router = express.Router();
  const stripeWebhookController = new StripeWebhookController(pool);

  // Webhook endpoint needs raw body - must be configured before JSON parsing
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    // Store raw body for Stripe signature verification
    (req: Request, res: Response, next: NextFunction) => {
      (req as any).rawBody = req.body;
      next();
    },
    stripeWebhookController.handleWebhook.bind(stripeWebhookController)
  );

  return router;
}