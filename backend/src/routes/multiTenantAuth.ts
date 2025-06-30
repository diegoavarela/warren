import { Router } from 'express';
import { MultiTenantAuthController } from '../controllers/MultiTenantAuthController';
import { authMiddleware } from '../middleware/auth';
import { tenantContext } from '../middleware/tenantContext';

const router = Router();
const authController = new MultiTenantAuthController();

// Public routes (no authentication required)
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/accept-invitation', (req, res, next) => authController.acceptInvitation(req, res, next));

// Protected routes (require authentication)
router.use(authMiddleware);
router.use(tenantContext);

router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/profile', (req, res, next) => authController.getProfile(req, res, next));

// 2FA routes
router.post('/2fa/setup', (req, res, next) => authController.setup2FA(req, res, next));
router.post('/2fa/enable', (req, res, next) => authController.enable2FA(req, res, next));
router.post('/2fa/disable', (req, res, next) => authController.disable2FA(req, res, next));
router.post('/2fa/backup-codes', (req, res, next) => authController.regenerateBackupCodes(req, res, next));

export { router as multiTenantAuthRouter };
export default router;