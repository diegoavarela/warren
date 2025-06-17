import { Router } from 'express'
import { AIAnalysisController } from '../controllers/AIAnalysisController'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const aiController = new AIAnalysisController()

// All routes require authentication
router.use(authMiddleware)

// Main analysis endpoint
router.post('/query', aiController.analyzeQuery.bind(aiController))

// Get data summary
router.get('/data-summary', aiController.getDataSummary.bind(aiController))

// Get suggested queries based on available data
router.get('/suggestions', aiController.getSuggestedQueries.bind(aiController))

// Check if specific data is available
router.post('/check-availability', aiController.checkDataAvailability.bind(aiController))

export const analysisRoutes = router