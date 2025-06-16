import { Router } from 'express';
import multer from 'multer';
import { CashflowController } from '../controllers/CashflowController';
import { DebugController } from '../controllers/DebugController';
import { ExcelMappingController } from '../controllers/ExcelMappingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const cashflowController = new CashflowController();
const debugController = new DebugController();
const excelMappingController = new ExcelMappingController();

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

// Debug routes (no auth required for debugging)
router.post('/debug/investment-parsing', upload.single('file'), debugController.debugInvestmentParsing.bind(debugController));
router.post('/debug/excel-mapping', upload.single('file'), excelMappingController.showInvestmentDataMapping.bind(excelMappingController));

// All routes require authentication
router.use(authMiddleware);

router.post('/upload', upload.single('file'), cashflowController.uploadFile.bind(cashflowController));
router.get('/dashboard', cashflowController.getDashboard.bind(cashflowController));
router.get('/metrics', cashflowController.getMetrics.bind(cashflowController));
router.get('/analysis/runway', cashflowController.getRunwayAnalysis.bind(cashflowController));
router.get('/analysis/burn-rate', cashflowController.getBurnRateAnalysis.bind(cashflowController));
router.post('/analysis/scenario', cashflowController.getScenarioAnalysis.bind(cashflowController));
router.get('/analysis/waterfall', cashflowController.getWaterfallData.bind(cashflowController));
router.get('/operational', cashflowController.getOperationalData.bind(cashflowController));
router.get('/banking', cashflowController.getBankingData.bind(cashflowController));
router.get('/taxes', cashflowController.getTaxesData.bind(cashflowController));
router.get('/investments', cashflowController.getInvestmentsData.bind(cashflowController));

router.get('/financial-summary', cashflowController.getFinancialSummary.bind(cashflowController));
router.post('/investments/diagnose', upload.single('file'), cashflowController.diagnoseInvestments.bind(cashflowController));

export { router as cashflowRouter };