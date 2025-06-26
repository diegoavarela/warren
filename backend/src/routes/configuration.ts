import { Router } from 'express'
import multer from 'multer'
import { ConfigurationController } from '../controllers/ConfigurationController'
import { authMiddleware } from '../middleware/auth'
import { tenantContext, requirePermission } from '../middleware/tenantContext'

const router = Router()
const configController = new ConfigurationController()

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files are allowed'))
    }
  }
})

// Apply authentication and tenant context middleware to all routes
router.use(authMiddleware)
router.use(tenantContext)

// Company management routes
router.get('/companies', 
  requirePermission('configuration.view'),
  configController.getCompanies.bind(configController)
)
router.get('/companies/active', 
  requirePermission('configuration.view'),
  configController.getActiveCompany.bind(configController)
)
router.get('/companies/:id', 
  requirePermission('configuration.view'),
  configController.getCompany.bind(configController)
)
router.post('/companies', 
  requirePermission('configuration.create'),
  configController.addCompany.bind(configController)
)
router.put('/companies/:id', 
  requirePermission('configuration.edit'),
  configController.updateCompany.bind(configController)
)
router.delete('/companies/:id', 
  requirePermission('configuration.delete'),
  configController.deleteCompany.bind(configController)
)
router.post('/companies/:id/activate', 
  requirePermission('configuration.edit'),
  configController.setActiveCompany.bind(configController)
)

// Excel structure analysis routes
router.post('/analyze-excel', 
  upload.single('file'), 
  requirePermission('configuration.edit'),
  configController.analyzeExcelStructure.bind(configController)
)
router.post('/companies/:companyId/excel-structure', 
  requirePermission('configuration.edit'),
  configController.saveExcelStructure.bind(configController)
)

export default router