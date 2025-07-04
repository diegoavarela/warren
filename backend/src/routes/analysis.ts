import { Router } from 'express'
import { AIAnalysisController } from '../controllers/AIAnalysisController'
import { authMiddleware } from '../middleware/auth'
import { tenantContext } from '../middleware/tenantContext'
import { logger } from '../utils/logger'

const router = Router()

// Initialize AI controller
const aiController = new AIAnalysisController()
logger.info('AI Analysis service initialized successfully')

// All routes require authentication and tenant context
router.use(authMiddleware)
router.use(tenantContext)


// Main analysis endpoint
router.post('/query', aiController.analyzeQuery.bind(aiController))

// Get data summary
router.get('/data-summary', aiController.getDataSummary.bind(aiController))

// Get suggested queries based on available data
router.get('/suggestions', aiController.getSuggestedQueries.bind(aiController))

// Check if specific data is available
router.post('/check-availability', aiController.checkDataAvailability.bind(aiController))

// Get file upload history for the current user
router.get('/uploads', aiController.getUploadHistory.bind(aiController))

export const analysisRoutes = router