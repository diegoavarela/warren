import { Router } from 'express';
import { CompanyUserController } from '../controllers/CompanyUserController';
import { authMiddleware } from '../middleware/auth';
import { tenantContext, requirePermission, requireFeature, checkUserLimit } from '../middleware/tenantContext';

const router = Router();
const userController = new CompanyUserController();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantContext);

// Get company users
router.get('/', 
  requirePermission('users.view'),
  (req, res, next) => userController.getUsers(req, res, next)
);

// Get company stats
router.get('/stats',
  requirePermission('users.view'),
  (req, res, next) => userController.getCompanyStats(req, res, next)
);

// Get invitations
router.get('/invitations',
  requirePermission('users.view'),
  (req, res, next) => userController.getInvitations(req, res, next)
);

// Invite new user
router.post('/invite',
  requirePermission('users.create'),
  requireFeature('user_management'),
  checkUserLimit,
  (req, res, next) => userController.inviteUser(req, res, next)
);

// Update user role
router.put('/:userId/role',
  requirePermission('users.edit'),
  (req, res, next) => userController.updateUserRole(req, res, next)
);

// Deactivate user
router.post('/:userId/deactivate',
  requirePermission('users.delete'),
  (req, res, next) => userController.deactivateUser(req, res, next)
);

// Reactivate user
router.post('/:userId/reactivate',
  requirePermission('users.edit'),
  checkUserLimit,
  (req, res, next) => userController.reactivateUser(req, res, next)
);

// Cancel invitation
router.delete('/invitations/:invitationId',
  requirePermission('users.create'),
  (req, res, next) => userController.cancelInvitation(req, res, next)
);

// Resend invitation
router.post('/invitations/:invitationId/resend',
  requirePermission('users.create'),
  (req, res, next) => userController.resendInvitation(req, res, next)
);

// Get user activity report
router.get('/activity',
  requirePermission('users.view'),
  (req, res, next) => userController.getUserActivity(req, res, next)
);

// Current user profile routes
router.get('/me',
  (req, res, next) => userController.getCurrentUser(req, res, next)
);

router.put('/me',
  (req, res, next) => userController.updateCurrentUser(req, res, next)
);

router.put('/me/password',
  (req, res, next) => userController.changePassword(req, res, next)
);

export { router as companyUsersRouter };