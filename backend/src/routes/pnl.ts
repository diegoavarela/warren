import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import { tenantContext } from '../middleware/tenantContext'
import { PnLController } from '../controllers/PnLController'

const router = Router()
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

const pnlController = new PnLController()

// All routes require authentication and tenant context
router.use(authMiddleware)
router.use(tenantContext)

// P&L routes
router.post('/upload', upload.single('file'), (req, res, next) => pnlController.uploadPnL(req, res, next))
router.get('/dashboard', (req, res, next) => pnlController.getDashboard(req, res, next))
router.get('/metrics', (req, res, next) => pnlController.getMetrics(req, res, next))
router.get('/line-items', (req, res, next) => pnlController.getLineItems(req, res, next))
router.delete('/clear', (req, res, next) => pnlController.clearData(req, res, next))

export { router as pnlRouter }
export default router