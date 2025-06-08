import { Router } from 'express';
import multer from 'multer';
import { CashflowController } from '../controllers/CashflowController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const cashflowController = new CashflowController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('File upload - filename:', file.originalname, 'mimetype:', file.mimetype);
    
    // Check file extension and mimetype
    const isXlsx = file.originalname.toLowerCase().endsWith('.xlsx') ||
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.mimetype === 'application/octet-stream'; // Sometimes Excel files have this mimetype
    
    if (isXlsx) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

router.post('/upload', upload.single('file'), (req, res, next) => cashflowController.uploadFile(req, res, next));
router.get('/dashboard', (req, res, next) => cashflowController.getDashboard(req, res, next));
router.get('/metrics', (req, res, next) => cashflowController.getMetrics(req, res, next));

export { router as cashflowRouter };