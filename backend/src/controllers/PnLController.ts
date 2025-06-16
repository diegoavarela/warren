import { Request, Response, NextFunction } from 'express'
import { PnLService } from '../services/PnLService'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
}

export class PnLController {
  private pnlService: PnLService

  constructor() {
    this.pnlService = PnLService.getInstance()
  }

  async uploadPnL(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        })
      }

      logger.info(`P&L file upload initiated by user ${req.user?.email}`)

      const result = await this.pnlService.processExcelFile(req.file.buffer)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to process P&L file'
        })
      }

      res.json({
        success: true,
        message: 'P&L file processed successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in P&L upload:', error)
      next(error)
    }
  }

  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = this.pnlService.getStoredMetrics()
      const summary = this.pnlService.getSummary()
      const lastUpload = this.pnlService.getLastUploadDate()
      
      if (metrics.length === 0) {
        return res.json({
          success: true,
          data: {
            hasData: false,
            message: 'No P&L data available. Please upload a P&L file.'
          }
        })
      }

      // Get current month data
      const currentMonthIndex = metrics.length - 1
      const currentMonth = metrics[currentMonthIndex]
      
      // Get previous month data for comparison
      const previousMonth = currentMonthIndex > 0 ? metrics[currentMonthIndex - 1] : null
      
      // Calculate YTD metrics
      const yearToDate = metrics.reduce((acc, metric) => ({
        revenue: acc.revenue + metric.revenue,
        cogs: acc.cogs + metric.cogs,
        grossProfit: acc.grossProfit + metric.grossProfit,
        operatingExpenses: acc.operatingExpenses + metric.operatingExpenses,
        ebitda: acc.ebitda + metric.ebitda,
        netIncome: acc.netIncome + metric.netIncome
      }), {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        ebitda: 0,
        netIncome: 0
      })

      // Prepare chart data
      const chartData = metrics.map(metric => ({
        month: metric.month,
        revenue: metric.revenue,
        grossProfit: metric.grossProfit,
        operatingIncome: metric.operatingIncome,
        ebitda: metric.ebitda,
        netIncome: metric.netIncome,
        grossMargin: metric.grossMargin,
        ebitdaMargin: metric.ebitdaMargin,
        netMargin: metric.netMargin
      }))

      res.json({
        success: true,
        data: {
          hasData: true,
          currentMonth,
          previousMonth,
          yearToDate,
          summary,
          chartData,
          lastUploadDate: lastUpload,
          totalMonths: metrics.length
        }
      })
    } catch (error) {
      logger.error('Error getting P&L dashboard:', error)
      next(error)
    }
  }

  async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = this.pnlService.getStoredMetrics()
      
      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Error getting P&L metrics:', error)
      next(error)
    }
  }

  async getLineItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const lineItems = this.pnlService.getStoredData()
      
      res.json({
        success: true,
        data: lineItems
      })
    } catch (error) {
      logger.error('Error getting P&L line items:', error)
      next(error)
    }
  }

  async clearData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      this.pnlService.clearStoredData()
      
      res.json({
        success: true,
        message: 'P&L data cleared successfully'
      })
    } catch (error) {
      logger.error('Error clearing P&L data:', error)
      next(error)
    }
  }
}