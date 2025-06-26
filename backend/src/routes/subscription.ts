import { Router } from 'express';
import { SubscriptionController } from '../controllers/saas/SubscriptionController';
import { authMiddleware } from '../middleware/auth';
import { tenantContext } from '../middleware/tenantContext';
import { pool } from '../config/database';

const router = Router();
const subscriptionController = new SubscriptionController(pool);

// Public routes
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// Protected routes
router.use(authMiddleware);
router.use(tenantContext);

// Subscription management
router.get('/current', subscriptionController.getCurrentSubscription.bind(subscriptionController));
router.post('/checkout', subscriptionController.createCheckoutSession.bind(subscriptionController));
router.post('/portal', subscriptionController.createPortalSession.bind(subscriptionController));
router.post('/cancel', subscriptionController.cancelSubscription.bind(subscriptionController));

// Usage tracking
router.get('/usage', subscriptionController.getUsage.bind(subscriptionController));
router.get('/features/:featureName', subscriptionController.checkFeature.bind(subscriptionController));
router.post('/track-view', subscriptionController.trackView.bind(subscriptionController));

export const subscriptionRouter = router;