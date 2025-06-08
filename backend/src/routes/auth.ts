import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateAuth } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

router.post('/login', validateAuth, (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', (req, res, next) => authController.getProfile(req, res, next));

export { router as authRouter };