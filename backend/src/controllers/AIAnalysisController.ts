import { Request, Response, NextFunction } from 'express'
import { AIAnalysisService } from '../services/AIAnalysisService'
import { FinancialDataAggregator } from '../services/FinancialDataAggregator'
import { FileUploadService } from '../services/FileUploadService'
import { pool } from '../config/database'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
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
      })

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

      // Get upload information from database
      const uploadData = await this.fileUploadService.getDataAvailability(parseInt(req.user!.id))
      
      // Get all active file uploads for multi-source support
      const allUploads = await this.fileUploadService.getActiveFileUploads(parseInt(req.user!.id))
      
      const financialData = await this.dataAggregator.aggregateAllData()
      
      // Group uploads by type
      const pnlSources = allUploads.filter(u => u.fileType === 'pnl' && u.isValid)
      const cashflowSources = allUploads.filter(u => u.fileType === 'cashflow' && u.isValid)
      
      // Create enhanced summary with multi-source data
      const summary = {
        pnl: {
          hasData: financialData.pnl.metadata.hasData,
          monthsAvailable: financialData.pnl.availableMonths.length,
          dateRange: financialData.pnl.metadata.dataRange,
          metrics: {
            revenue: financialData.pnl.metrics.revenue.length > 0,
            costs: financialData.pnl.metrics.costs.length > 0,
            margins: financialData.pnl.metrics.margins.length > 0,
            personnelCosts: financialData.pnl.metrics.personnelCosts.some(p => p.total > 0),
            ebitda: financialData.pnl.metrics.ebitda.length > 0
          },
          lastUpload: uploadData.pnl?.uploadDate || financialData.pnl.metadata.lastUpload,
          dataSources: {
            count: pnlSources.length,
            files: pnlSources.map(source => ({
              id: source.id,
              filename: source.originalFilename,
              yearRange: this.getYearRangeString(source),
              monthsCount: source.monthsAvailable || 0,
              uploadDate: source.uploadDate,
              tags: source.tags || []
            })),
            totalMonths: pnlSources.reduce((sum, s) => sum + (s.monthsAvailable || 0), 0),
            consolidatedRange: this.getConsolidatedRange(pnlSources)
          }
        },
        cashflow: {
          hasData: financialData.cashflow.metadata.hasData,
          monthsAvailable: financialData.cashflow.availableMonths.length,
          dateRange: financialData.cashflow.metadata.dataRange,
          metrics: {
            cashPosition: financialData.cashflow.metrics.cashPosition.length > 0,
            bankBalances: financialData.cashflow.metrics.bankBalances.length > 0,
            investments: financialData.cashflow.metrics.investments.length > 0,
            inflows: financialData.cashflow.metrics.inflows.length > 0,
            outflows: financialData.cashflow.metrics.outflows.length > 0
          },
          lastUpload: uploadData.cashflow?.uploadDate || financialData.cashflow.metadata.lastUpload,
          dataSources: {
            count: cashflowSources.length,
            files: cashflowSources.map(source => ({
              id: source.id,
              filename: source.originalFilename,
              yearRange: this.getYearRangeString(source),
              monthsCount: source.monthsAvailable || 0,
              uploadDate: source.uploadDate,
              tags: source.tags || []
            })),
            totalMonths: cashflowSources.reduce((sum, s) => sum + (s.monthsAvailable || 0), 0),
            consolidatedRange: this.getConsolidatedRange(cashflowSources)
          }
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
  
  private getYearRangeString(source: any): string {
    if (source.yearStart && source.yearEnd) {
      return source.yearStart === source.yearEnd 
        ? `${source.yearStart}` 
        : `${source.yearStart}-${source.yearEnd}`
    }
    if (source.periodStart) {
      const year = new Date(source.periodStart).getFullYear()
      return `${year}`
    }
    return 'Unknown'
  }
  
  private getConsolidatedRange(sources: any[]): { start: string; end: string } | null {
    if (sources.length === 0) return null
    
    let earliestDate: Date | null = null
    let latestDate: Date | null = null
    
    sources.forEach(source => {
      if (source.periodStart) {
        const startDate = new Date(source.periodStart)
        if (!earliestDate || startDate < earliestDate) {
          earliestDate = startDate
        }
      }
      if (source.periodEnd) {
        const endDate = new Date(source.periodEnd)
        if (!latestDate || endDate > latestDate) {
          latestDate = endDate
        }
      }
    })
    
    // Explicit null checks and type assertion
    if (earliestDate && latestDate) {
      const startDate = earliestDate as Date
      const endDate = latestDate as Date
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }
    
    return null
  }

  async getSuggestedQueries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      logger.info(`Suggested queries request from user ${req.user?.email}`)

      const financialData = await this.dataAggregator.aggregateAllData()
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

      const availability = this.dataAggregator.checkDataAvailability(requiredMetrics)

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