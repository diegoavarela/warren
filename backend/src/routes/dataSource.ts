import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const dataSourceController = new DataSourceController();

// All routes require authentication
router.use(authMiddleware);

// Data source management routes
router.get('/', dataSourceController.listDataSources);
router.post('/', dataSourceController.createDataSource);
router.get('/:id', dataSourceController.getDataSource);
router.patch('/:id', dataSourceController.updateDataSource);
router.delete('/:id', dataSourceController.deleteDataSource);
router.post('/:id/sync', dataSourceController.syncDataSource);

export { router as dataSourceRouter };