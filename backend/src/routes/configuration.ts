import { Router } from 'express'
import multer from 'multer'
import { ConfigurationController } from '../controllers/ConfigurationController'
import { authMiddleware } from '../middleware/auth'

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

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Company management routes
router.get('/companies', configController.getCompanies.bind(configController))
router.get('/companies/active', configController.getActiveCompany.bind(configController))
router.get('/companies/:id', configController.getCompany.bind(configController))
router.post('/companies', configController.addCompany.bind(configController))
router.put('/companies/:id', configController.updateCompany.bind(configController))
router.delete('/companies/:id', configController.deleteCompany.bind(configController))
router.post('/companies/:id/activate', configController.setActiveCompany.bind(configController))

// Excel structure analysis routes
router.post('/analyze-excel', upload.single('file'), configController.analyzeExcelStructure.bind(configController))
router.post('/companies/:companyId/excel-structure', configController.saveExcelStructure.bind(configController))

export default router