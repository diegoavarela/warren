import { Router } from 'express';
import { MondayController } from '../controllers/MondayController';

const router = Router();
const mondayController = new MondayController();

// Create a new lead
router.post('/create-lead', mondayController.createLead);

// Get board columns (for debugging)
router.get('/board-columns', mondayController.getBoardColumns);

export default router;