import Stripe from 'stripe';
import { logger } from '../../utils/logger';
import { Pool } from 'pg';

export interface CreateCustomerData {
  email: string;
  companyName: string;
  companyId: string;
}

export interface CreateSubscriptionData {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export class StripeService {
  private stripe: Stripe | null;
  private static instance: StripeService | null;
  private pool: Pool;
  private isConfigured: boolean;

  private constructor(pool: Pool) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16' as any,
        typescript: true,
      });
      this.isConfigured = true;
      logger.info('Stripe service initialized');
    } else {
      this.stripe = null;
      this.isConfigured = false;
      logger.warn('Stripe service not configured - STRIPE_SECRET_KEY is missing. Stripe features will be disabled.');
    }
    
    this.pool = pool;
  }

  static getInstance(pool: Pool): StripeService | null {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService(pool);
    }
    return StripeService.instance;
  }

  /**
   * Check if Stripe is configured
   */
  isStripeConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a Stripe customer for a company
   */
  async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    
    try {
      const customer = await this.stripe!.customers.create({
        email: data.email,
        name: data.companyName,
        metadata: {
          company_id: data.companyId,
          company_name: data.companyName,
        },
      });

      logger.info(`Created Stripe customer: ${customer.id} for company: ${data.companyId}`);
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(data: CreateSubscriptionData): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: data.metadata || {},
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      };

      if (data.trialDays) {
        subscriptionData.trial_period_days = data.trialDays;
      }

      const subscription = await this.stripe!.subscriptions.create(subscriptionData);

      logger.info(`Created subscription: ${subscription.id} for customer: ${data.customerId}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe!.subscriptions.update(subscriptionId, params);
      logger.info(`Updated subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      logger.info(`Scheduled cancellation for subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  /**
   * List subscriptions for a customer
   */
  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe!.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });
      return subscriptions.data;
    } catch (error) {
      logger.error('Error listing subscriptions:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for upgrading
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe!.checkout.sessions.create({
        customer: params.customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {},
      });

      logger.info(`Created checkout session: ${session.id}`);
      return session;
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a customer portal session
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe!.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      logger.info(`Created portal session for customer: ${params.customerId}`);
      return session;
    } catch (error) {
      logger.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Webhook signature verification failed');
    }

    logger.info(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update subscription in database
      const updateQuery = `
        UPDATE company_subscriptions
        SET 
          status = $1,
          current_period_start = $2,
          current_period_end = $3,
          cancel_at_period_end = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $5
      `;

      await client.query(updateQuery, [
        subscription.status,
        new Date((subscription as any).current_period_start * 1000),
        new Date((subscription as any).current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.id,
      ]);

      await client.query('COMMIT');
      logger.info(`Updated subscription ${subscription.id} in database`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating subscription in database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update subscription status to canceled
      const updateQuery = `
        UPDATE company_subscriptions
        SET 
          status = 'canceled',
          canceled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $1
      `;

      await client.query(updateQuery, [subscription.id]);

      // Downgrade company to free tier
      const downgradeQuery = `
        UPDATE companies c
        SET subscription_tier = 'freemium'
        FROM company_subscriptions cs
        WHERE cs.company_id = c.id
        AND cs.stripe_subscription_id = $1
      `;

      await client.query(downgradeQuery, [subscription.id]);

      await client.query('COMMIT');
      logger.info(`Handled subscription deletion for ${subscription.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error handling subscription deletion:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Record billing event
      const insertQuery = `
        INSERT INTO billing_events (
          company_id,
          stripe_event_id,
          event_type,
          amount_cents,
          currency,
          description,
          metadata
        )
        SELECT 
          cs.company_id,
          $1,
          'invoice.payment_succeeded',
          $2,
          $3,
          $4,
          $5
        FROM company_subscriptions cs
        WHERE cs.stripe_subscription_id = $6
      `;

      await client.query(insertQuery, [
        invoice.id,
        invoice.amount_paid,
        invoice.currency,
        `Payment for invoice ${invoice.number}`,
        JSON.stringify({ invoice_id: invoice.id, subscription_id: (invoice as any).subscription }),
        (invoice as any).subscription,
      ]);

      await client.query('COMMIT');
      logger.info(`Recorded successful payment for invoice ${invoice.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error recording invoice payment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn(`Payment failed for invoice ${invoice.id}`);
    // TODO: Send notification email
    // TODO: Update subscription status if needed
  }

  /**
   * Get price IDs from database
   */
  async getPriceIds(): Promise<Record<string, string>> {
    const query = `
      SELECT name, stripe_price_id
      FROM subscription_plans
      WHERE is_active = true
    `;

    const result = await this.pool.query(query);
    
    const priceIds: Record<string, string> = {};
    result.rows.forEach(row => {
      if (row.stripe_price_id) {
        priceIds[row.name] = row.stripe_price_id;
      }
    });

    return priceIds;
  }
}