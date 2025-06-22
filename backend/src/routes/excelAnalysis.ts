import { Router } from 'express';
import multer from 'multer';
import { ExcelAnalysisController } from '../controllers/ExcelAnalysisController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const excelAnalysisController = new ExcelAnalysisController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// Analyze Excel structure with AI
router.post(
  '/analyze',
  upload.single('file'),
  excelAnalysisController.analyzeExcel.bind(excelAnalysisController)
);

// Preview data extraction with a mapping
router.post(
  '/preview',
  upload.single('file'),
  excelAnalysisController.previewExtraction.bind(excelAnalysisController)
);

// Save a validated mapping
router.post(
  '/mappings',
  excelAnalysisController.saveMapping.bind(excelAnalysisController)
);

// Get saved mappings
router.get(
  '/mappings',
  excelAnalysisController.getMappings.bind(excelAnalysisController)
);

// Process file with mapping
router.post(
  '/process-with-mapping',
  upload.single('file'),
  excelAnalysisController.processWithMapping.bind(excelAnalysisController)
);

export const excelAnalysisRouter = router;