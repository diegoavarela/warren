import { Request, Response, NextFunction } from 'express'
import { ExchangeRateService } from '../services/ExchangeRateService'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
}

export class CurrencyController {
  private exchangeRateService: ExchangeRateService

  constructor() {
    this.exchangeRateService = ExchangeRateService.getInstance()
  }

  async getExchangeRate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: 'Both from and to currency codes are required'
        })
      }

      const rate = await this.exchangeRateService.getExchangeRate(
        from.toString().toUpperCase(),
        to.toString().toUpperCase()
      )

      res.json({
        success: true,
        data: {
          from: from.toString().toUpperCase(),
          to: to.toString().toUpperCase(),
          rate,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Error getting exchange rate:', error)
      next(error)
    }
  }

  async convertAmount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { amount, from, to } = req.body

      if (!amount || !from || !to) {
        return res.status(400).json({
          success: false,
          message: 'Amount, from currency, and to currency are required'
        })
      }

      const convertedAmount = await this.exchangeRateService.convertAmount(
        parseFloat(amount),
        from.toUpperCase(),
        to.toUpperCase()
      )

      res.json({
        success: true,
        data: {
          originalAmount: parseFloat(amount),
          fromCurrency: from.toUpperCase(),
          toCurrency: to.toUpperCase(),
          convertedAmount,
          exchangeRate: convertedAmount / parseFloat(amount),
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Error converting amount:', error)
      next(error)
    }
  }

  async getSupportedCurrencies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const supportedCurrencies = [
        { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
      ]

      res.json({
        success: true,
        data: supportedCurrencies
      })
    } catch (error) {
      logger.error('Error getting supported currencies:', error)
      next(error)
    }
  }
}