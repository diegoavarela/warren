import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MultiSourceController } from '../controllers/MultiSourceController';
import multer from 'multer';

const router = Router();
const multiSourceController = new MultiSourceController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Data source management
router.get('/sources', multiSourceController.getDataSources.bind(multiSourceController));
router.patch('/sources/:id', multiSourceController.updateDataSource.bind(multiSourceController));

// Data view management
router.get('/views', multiSourceController.getDataViews.bind(multiSourceController));
router.post('/views', multiSourceController.createDataView.bind(multiSourceController));
router.get('/views/:id', multiSourceController.getDataView.bind(multiSourceController));

// Data operations
router.post('/consolidate', multiSourceController.consolidateData.bind(multiSourceController));

// Bulk upload
router.post('/bulk-upload', upload.array('files', 10), multiSourceController.bulkUpload.bind(multiSourceController));

export default router;