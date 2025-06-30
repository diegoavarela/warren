import { Router } from 'express';
import { auth } from '../middleware/auth';
import { WidgetController } from '../controllers/WidgetController';

const router = Router();
const widgetController = new WidgetController();

// Widget definitions
router.get('/v2/widgets/definitions', auth, widgetController.getWidgetDefinitions);

// Dashboard management
router.get('/v2/dashboards', auth, widgetController.getDashboardLayouts);
router.post('/v2/dashboards', auth, widgetController.createDashboard);
router.get('/v2/dashboards/templates', auth, widgetController.getTemplates);
router.post('/v2/dashboards/from-template', auth, widgetController.createDashboardFromTemplate);
router.get('/v2/dashboards/:layoutId', auth, widgetController.getDashboard);
router.patch('/v2/dashboards/:layoutId', auth, widgetController.updateDashboard);
router.delete('/v2/dashboards/:layoutId', auth, widgetController.deleteDashboard);

// Widget management
router.post('/v2/dashboards/:layoutId/widgets', auth, widgetController.addWidget);
router.patch('/v2/widgets/:widgetId', auth, widgetController.updateWidget);
router.delete('/v2/widgets/:widgetId', auth, widgetController.deleteWidget);
router.get('/v2/widgets/:widgetId/data', auth, widgetController.getWidgetData);
router.post('/v2/widgets/:widgetId/refresh', auth, widgetController.refreshWidget);

// Dashboard sharing
router.post('/v2/dashboards/:layoutId/share', auth, widgetController.shareDashboard);
router.get('/v2/dashboards/:layoutId/shares', auth, widgetController.getDashboardShares);
router.delete('/v2/dashboards/:layoutId/shares/:shareId', auth, widgetController.removeDashboardShare);

// Grid settings and bulk operations
router.patch('/v2/dashboards/:layoutId/grid-settings', auth, widgetController.updateDashboardGridSettings);
router.put('/v2/dashboards/:layoutId/widgets/positions', auth, widgetController.bulkUpdateWidgetPositions);

export default router;