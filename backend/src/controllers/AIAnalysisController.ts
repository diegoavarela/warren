import { Request, Response, NextFunction } from 'express'
import { AIAnalysisService } from '../services/AIAnalysisService'
import { FinancialDataAggregator } from '../services/FinancialDataAggregator'
import { FileUploadService } from '../services/FileUploadService'
import { pool } from '../config/database'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
  tenantId?: string
}

export class AIAnalysisController {
  private aiService: AIAnalysisService
  private dataAggregator: FinancialDataAggregator
  private fileUploadService: FileUploadService

  constructor() {
    this.aiService = AIAnalysisService.getInstance()
    this.dataAggregator = FinancialDataAggregator.getInstance()
    this.fileUploadService = new FileUploadService(pool)
  }

  async analyzeQuery(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { query, context, includeCharts } = req.body

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        })
      }

      logger.info(`AI Analysis query from user ${req.user?.email}: ${query}`)

      const result = await this.aiService.processQuery({
        query,
        context,
        includeCharts: includeCharts !== false // Default to true
      }, req.user?.id, req.tenantId)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Error in AI analysis:', error)
      next(error)
    }
  }

  async getDataSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info(`Data summary request from user ${req.user?.email}`)

      // Get actual data availability from the aggregator (same as AI analysis uses)
      const financialData = await this.dataAggregator.aggregateAllData(parseInt(req.user!.id), req.tenantId)
      
      // Get upload information from database for metadata
      const uploadData = await this.fileUploadService.getDataAvailability(parseInt(req.user!.id), req.tenantId)
      
      // Debug logging
      logger.info(`Data summary - PnL hasData: ${financialData.pnl?.metadata?.hasData}, inflows length: ${financialData.cashflow?.metrics?.inflows?.length || 0}`)
      logger.info(`Database uploads - PnL: ${!!uploadData.pnl}, Cashflow: ${!!uploadData.cashflow}`)
      
      // Create a summary based on actual accessible data
      const summary = {
        pnl: {
          hasData: (financialData.pnl?.metadata?.hasData || false) && !!uploadData.pnl,
          monthsAvailable: financialData.pnl?.availableMonths?.length || 0,
          dateRange: financialData.pnl?.metadata?.dataRange || null,
          metrics: {
            revenue: (financialData.pnl?.metrics?.revenue?.length || 0) > 0,
            costs: (financialData.pnl?.metrics?.costs?.length || 0) > 0,
            margins: (financialData.pnl?.metrics?.margins?.length || 0) > 0,
            personnelCosts: (financialData.pnl?.metrics?.personnelCosts?.length || 0) > 0,
            ebitda: (financialData.pnl?.metrics?.ebitda?.length || 0) > 0
          },
          lastUpload: uploadData.pnl?.uploadDate || null
        },
        cashflow: {
          hasData: (financialData.cashflow?.metadata?.hasData || false) && !!uploadData.cashflow,
          monthsAvailable: financialData.cashflow?.availableMonths?.length || 0,
          dateRange: financialData.cashflow?.metadata?.dataRange || null,
          metrics: {
            cashPosition: (financialData.cashflow?.metrics?.cashPosition?.length || 0) > 0,
            bankBalances: (financialData.cashflow?.metrics?.bankBalances?.length || 0) > 0,
            investments: (financialData.cashflow?.metrics?.investments?.length || 0) > 0,
            inflows: (financialData.cashflow?.metrics?.inflows?.length || 0) > 0,
            outflows: (financialData.cashflow?.metrics?.outflows?.length || 0) > 0
          },
          lastUpload: uploadData.cashflow?.uploadDate || null
        }
      }

      res.json({
        success: true,
        data: summary
      })
    } catch (error) {
      logger.error('Error getting data summary:', error)
      next(error)
    }
  }

  async getSuggestedQueries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info(`Suggested queries request from user ${req.user?.email}`)

      const financialData = await this.dataAggregator.aggregateAllData(
        parseInt(req.user!.id), 
        req.tenantId
      )
      const suggestions = this.aiService.getSuggestedQueries(financialData)

      res.json({
        success: true,
        data: {
          suggestions,
          totalSuggestions: suggestions.length
        }
      })
    } catch (error) {
      logger.error('Error getting suggested queries:', error)
      next(error)
    }
  }

  async checkDataAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requiredMetrics } = req.body

      if (!requiredMetrics || !Array.isArray(requiredMetrics)) {
        return res.status(400).json({
          success: false,
          message: 'Required metrics array is required'
        })
      }

      const availability = await this.dataAggregator.checkDataAvailability(
        requiredMetrics, 
        parseInt(req.user!.id), 
        req.tenantId
      )

      res.json({
        success: true,
        data: availability
      })
    } catch (error) {
      logger.error('Error checking data availability:', error)
      next(error)
    }
  }

  async getUploadHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info(`Upload history request from user ${req.user?.email}`)

      const uploads = await this.fileUploadService.getFileUploadsByUser(parseInt(req.user!.id))
      
      res.json({
        success: true,
        data: uploads.map(upload => ({
          id: upload.id,
          fileType: upload.fileType,
          filename: upload.originalFilename,
          uploadDate: upload.uploadDate,
          status: upload.processingStatus,
          isValid: upload.isValid,
          monthsAvailable: upload.monthsAvailable,
          periodStart: upload.periodStart,
          periodEnd: upload.periodEnd
        }))
      })
    } catch (error) {
      logger.error('Error getting upload history:', error)
      next(error)
    }
  }
}