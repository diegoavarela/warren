import { Request, Response, NextFunction } from 'express'
import { PnLService } from '../services/PnLService'
import { FileUploadService } from '../services/FileUploadService'
import { pool } from '../config/database'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
  tenantId?: string
}

export class PnLController {
  private pnlService: PnLService
  private fileUploadService: FileUploadService

  constructor() {
    this.pnlService = PnLService.getInstance()
    this.fileUploadService = new FileUploadService(pool)
  }

  /**
   * Extract year from various month formats
   */
  private extractYearFromMonth(monthString: string): number | null {
    if (!monthString) return null
    
    // Match 4-digit year
    const fourDigitMatch = monthString.match(/20\d{2}/)
    if (fourDigitMatch) {
      return parseInt(fourDigitMatch[0])
    }
    
    // Match 2-digit year and convert to 4-digit
    const twoDigitMatch = monthString.match(/[-\s](\d{2})$/)
    if (twoDigitMatch) {
      const twoDigit = parseInt(twoDigitMatch[1])
      return twoDigit < 50 ? 2000 + twoDigit : 1900 + twoDigit
    }
    
    return null
  }

  /**
   * Find latest complete month (one with substantial revenue data)
   */
  private findLatestCompleteMonth(metrics: any[]): number {
    logger.info(`Finding latest complete month from ${metrics.length} metrics`)
    
    // Find the last month with meaningful revenue (> 1000)
    for (let i = metrics.length - 1; i >= 0; i--) {
      logger.info(`Checking month ${i}: ${metrics[i].month} with revenue: ${metrics[i].revenue}`)
      if (Math.abs(metrics[i].revenue) > 1000) {
        logger.info(`Found latest complete month at index ${i}: ${metrics[i].month}`)
        return i
      }
    }
    
    logger.info(`No month with revenue > 1000 found, using last month: ${metrics[metrics.length - 1]?.month}`)
    return metrics.length - 1
  }

  /**
   * Detect file language based on month names
   */
  private detectFileLanguage(metrics: any[]): 'english' | 'spanish' {
    const spanishMonths = ['ene', 'enero', 'feb', 'febrero', 'mar', 'marzo', 'abr', 'abril', 'may', 'mayo', 'jun', 'junio', 'jul', 'julio', 'ago', 'agosto', 'sep', 'septiembre', 'oct', 'octubre', 'nov', 'noviembre', 'dic', 'diciembre']
    
    // Check first few month names for Spanish indicators
    for (let i = 0; i < Math.min(3, metrics.length); i++) {
      const monthStr = metrics[i].month.toLowerCase()
      const hasSpanishMonth = spanishMonths.some(spanishMonth => {
        const regex = new RegExp(`\\b${spanishMonth}\\b`, 'i')
        return regex.test(monthStr)
      })
      if (hasSpanishMonth) {
        return 'spanish'
      }
    }
    
    return 'english' // Default to English
  }

  /**
   * Find target month using intelligent matching
   */
  private findTargetMonth(metrics: any[], targetDate: Date): number {
    const targetMonthNum = targetDate.getMonth() + 1 // 1-12
    const targetYear = targetDate.getFullYear()
    
    // Detect file language
    const fileLanguage = this.detectFileLanguage(metrics)
    
    // Month name mapping based on detected language
    const englishMonths: { [key: number]: string[] } = {
      1: ['january', 'jan'],
      2: ['february', 'feb'],
      3: ['march', 'mar'],
      4: ['april', 'apr'],
      5: ['may'],
      6: ['june', 'jun'],
      7: ['july', 'jul'],
      8: ['august', 'aug'],
      9: ['september', 'sep', 'sept'],
      10: ['october', 'oct'],
      11: ['november', 'nov'],
      12: ['december', 'dec']
    }
    
    const spanishMonths: { [key: number]: string[] } = {
      1: ['enero', 'ene'],
      2: ['febrero', 'feb'],
      3: ['marzo', 'mar'],
      4: ['abril', 'abr'],
      5: ['mayo', 'may'],
      6: ['junio', 'jun'],
      7: ['julio', 'jul'],
      8: ['agosto', 'ago'],
      9: ['septiembre', 'sep'],
      10: ['octubre', 'oct'],
      11: ['noviembre', 'nov'],
      12: ['diciembre', 'dic']
    }
    
    const monthMappings = fileLanguage === 'spanish' ? spanishMonths : englishMonths
    const targetNames = monthMappings[targetMonthNum] || []
    
    logger.info(`Searching for target month ${targetMonthNum} in ${fileLanguage} format: [${targetNames.join(', ')}]`)
    
    // Try to find exact match by month name and year
    for (let i = 0; i < metrics.length; i++) {
      const monthStr = metrics[i].month.toLowerCase()
      
      // Check if this month string contains target month name
      const hasTargetMonth = targetNames.some(name => {
        // Use word boundaries to avoid false positives
        const regex = new RegExp(`\\b${name}\\b`, 'i')
        const matches = regex.test(monthStr)
        if (matches) {
          logger.info(`Found target month "${name}" in "${monthStr}" at index ${i}`)
        }
        return matches
      })
      
      if (hasTargetMonth) {
        // Also check year if available
        const yearInMonth = this.extractYearFromMonth(monthStr)
        if (!yearInMonth || yearInMonth === targetYear) {
          logger.info(`Found target month at index ${i}: ${metrics[i].month}`)
          return i
        }
      }
    }
    
    // No fallback - if month name matching fails, return -1
    logger.info(`Target month ${targetMonthNum} not found in any month strings`)
    return -1 // Not found
  }

  async uploadPnL(req: AuthRequest, res: Response, next: NextFunction) {
    let fileUploadId: number | null = null;
    
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        })
      }

      logger.info(`P&L file upload initiated by user ${req.user?.email}`)

      // Create file upload record
      const fileUploadRecord = await this.fileUploadService.createFileUpload({
        userId: parseInt(req.user!.id),
        companyId: req.tenantId!,
        fileType: 'pnl',
        filename: `pnl_${Date.now()}_${req.file.originalname}`,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
      
      fileUploadId = fileUploadRecord.id;

      // Mark processing as started
      await this.fileUploadService.markProcessingStarted(fileUploadId);

      const result = await this.pnlService.processExcelFile(req.file.buffer)

      if (!result.success) {
        await this.fileUploadService.markProcessingFailed(fileUploadId, result.error || 'Failed to process P&L file');
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to process P&L file'
        })
      }

      // Get metrics for data summary
      const metrics = this.pnlService.getStoredMetrics();
      const summary = this.pnlService.getSummary();
      
      // Check if any data was detected - trigger AI wizard if not
      if (metrics.length === 0) {
        throw new Error("Unable to detect data structure in the Excel file. Please use the AI wizard to map your custom format.");
      }
      
      // Calculate date range with proper validation
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      
      if (metrics.length > 0) {
        const startDate = new Date(metrics[0].month);
        const endDate = new Date(metrics[metrics.length - 1].month);
        
        // Only set if dates are valid
        periodStart = !isNaN(startDate.getTime()) ? startDate : null;
        periodEnd = !isNaN(endDate.getTime()) ? endDate : null;
      }

      // Create data summary
      const dataSummary = {
        monthsProcessed: result.data?.monthsProcessed || 0,
        summary: {
          totalRevenue: summary.totalRevenue,
          totalCOGS: summary.totalCOGS,
          totalGrossProfit: summary.totalGrossProfit,
          avgGrossMargin: summary.avgGrossMargin,
          totalOperatingExpenses: summary.totalOperatingExpenses,
          totalOperatingIncome: summary.totalOperatingIncome,
          avgOperatingMargin: summary.avgOperatingMargin,
          totalEBITDA: summary.totalEBITDA,
          avgEBITDAMargin: summary.avgEBITDAMargin
        },
        categoriesProcessed: result.data?.categoriesProcessed || []
      };

      // Mark processing as completed
      await this.fileUploadService.markProcessingCompleted(fileUploadId, {
        isValid: true,
        dataSummary,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        monthsAvailable: metrics.length,
        recordsCount: metrics.length
      });

      // Store the uploaded filename
      this.pnlService.setUploadedFileName(req.file.originalname);

      res.json({
        success: true,
        message: 'P&L file processed successfully',
        data: {
          ...result.data,
          uploadId: fileUploadId
        }
      })
    } catch (error: any) {
      logger.error('Error in P&L upload:', error)
      
      // Mark processing as failed if we have a file upload ID
      if (fileUploadId) {
        await this.fileUploadService.markProcessingFailed(fileUploadId, error.message || 'Unknown error');
      }
      
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

      // Debug: Log all available months
      logger.info(`Available months in metrics: ${metrics.map((m, i) => `${i}: ${m.month} (revenue: ${m.revenue})`).join(', ')}`)

      // Get current month data with smart selection based on format
      const format = this.pnlService.getProcessedFormat()
      let currentMonthIndex = metrics.length - 1  // Default to latest month

      // For non-Vortex formats, try to find "current month - 1" with intelligent detection
      if (format !== 'vortex') {
        const now = new Date()
        
        // If metrics data is from a different year, use the latest complete month from that year
        const firstMetricYear = this.extractYearFromMonth(metrics[0]?.month)
        const lastMetricYear = this.extractYearFromMonth(metrics[metrics.length - 1]?.month)
        const currentYear = now.getFullYear()
        
        logger.info(`Year analysis: first=${firstMetricYear}, last=${lastMetricYear}, current=${currentYear}`)
        
        if (firstMetricYear && lastMetricYear && (firstMetricYear < currentYear || lastMetricYear < currentYear)) {
          // Historical data - find the most recent complete month
          logger.info(`Historical data detected (${firstMetricYear}-${lastMetricYear}), using latest complete month`)
          currentMonthIndex = this.findLatestCompleteMonth(metrics)
        } else {
          // Current year data or future data - find "current month - 1"
          const targetMonth = new Date(now.getFullYear(), now.getMonth() - 1)
          logger.info(`Looking for current month - 1: ${targetMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`)
          
          const targetIndex = this.findTargetMonth(metrics, targetMonth)
          
          if (targetIndex >= 0) {
            currentMonthIndex = targetIndex
            logger.info(`Selected month for ${format} format: ${metrics[targetIndex].month}`)
          } else {
            // Fallback: find the latest month with significant revenue
            currentMonthIndex = this.findLatestCompleteMonth(metrics)
            logger.info(`Target month not found for ${format} format, using latest complete month: ${metrics[currentMonthIndex].month}`)
          }
        }
      } else {
        logger.info(`Using latest month for Vortex format: ${metrics[currentMonthIndex].month}`)
      }

      logger.info(`Final selected month index: ${currentMonthIndex}, month: ${metrics[currentMonthIndex]?.month}, revenue: ${metrics[currentMonthIndex]?.revenue}`)

      const currentMonth = metrics[currentMonthIndex]
      
      // Log what we're actually returning
      logger.info(`=== P&L MONTH SELECTION SUMMARY ===`)
      logger.info(`Today's date: ${new Date().toISOString()}`)
      logger.info(`Total months available: ${metrics.length}`)
      logger.info(`Selected index: ${currentMonthIndex}`)
      logger.info(`Selected month: ${currentMonth.month}`)
      logger.info(`Revenue: ${currentMonth.revenue}`)
      logger.info(`Gross Profit: ${currentMonth.grossProfit}`)
      logger.info(`Net Income: ${currentMonth.netIncome}`)
      logger.info(`All months: ${metrics.map(m => m.month).join(', ')}`)
      logger.info(`=================================`)
      
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
      
      // For Vortex format, use the special YTD EBITDA calculation
      if (format === 'vortex') {
        const vortexYTDEbitda = this.pnlService.getVortexYTDEbitda()
        if (vortexYTDEbitda !== null) {
          yearToDate.ebitda = vortexYTDEbitda
          logger.info(`Using Vortex YTD EBITDA: ${vortexYTDEbitda}`)
        }
      }

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
          uploadedFileName: this.pnlService.getUploadedFileName(),
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

export const pnlController = new PnLController()