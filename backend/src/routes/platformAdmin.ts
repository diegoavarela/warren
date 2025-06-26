import { Router } from 'express';
import { PlatformAdminController } from '../controllers/PlatformAdminController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const platformAdminController = new PlatformAdminController();

// All routes require authentication
router.use(authMiddleware);

// Platform statistics
router.get('/stats', 
  (req, res, next) => platformAdminController.getPlatformStats(req, res, next)
);

// Company management
router.get('/companies', 
  (req, res, next) => platformAdminController.getCompanies(req, res, next)
);

router.post('/companies', 
  (req, res, next) => platformAdminController.createCompany(req, res, next)
);

router.put('/companies/:companyId', 
  (req, res, next) => platformAdminController.updateCompany(req, res, next)
);

router.delete('/companies/:companyId', 
  (req, res, next) => platformAdminController.deleteCompany(req, res, next)
);

router.get('/companies/:companyId/stats', 
  (req, res, next) => platformAdminController.getCompanyStats(req, res, next)
);

export { router as platformAdminRouter };