import { Router } from 'express'
import { CurrencyController } from '../controllers/CurrencyController'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const currencyController = new CurrencyController()

// All currency routes require authentication
router.use(authMiddleware)

// Get exchange rate between two currencies
router.get('/exchange-rate', currencyController.getExchangeRate.bind(currencyController))

// Convert amount from one currency to another
router.post('/convert', currencyController.convertAmount.bind(currencyController))

// Get list of supported currencies
router.get('/supported', currencyController.getSupportedCurrencies.bind(currencyController))

export default router