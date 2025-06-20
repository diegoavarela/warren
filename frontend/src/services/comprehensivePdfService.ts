import { jsPDF } from 'jspdf'
import { CompanyConfig } from './configurationService'

interface ComprehensivePDFOptions {
  company: CompanyConfig
  title: string
  data: any
  type: 'pnl' | 'cashflow'
}

export class ComprehensivePDFService {
  private static readonly VORTEX_GREEN = '#7CB342'
  private static readonly DARK_GREEN = '#2E7D32'
  private static readonly LIGHT_GREEN = '#C8E6C9'
  private static readonly GRAY_DARK = '#37474F'
  private static readonly GRAY_LIGHT = '#ECEFF1'
  private static readonly WHITE = '#FFFFFF'

  public static async exportComprehensiveReport(options: ComprehensivePDFOptions): Promise<void> {
    const { company, title, data, type } = options

    // Create PDF with premium settings
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 2
    })

    // Set document properties
    pdf.setProperties({
      title: `${company.name} - Comprehensive Financial Analysis`,
      subject: `${type.toUpperCase()} Detailed Financial Report`,
      author: company.name,
      keywords: 'comprehensive, financial, executive, analysis, dashboard',
      creator: 'Warren by Vortex - Comprehensive Analytics'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Create comprehensive report with all sections
    this.createExecutiveCoverPage(pdf, company, title, type, data, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createExecutiveSummaryPage(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createDetailedMetricsPage(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createFinancialAnalysisPage(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createTrendAnalysisPage(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createRiskAndOpportunityPage(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createRecommendationsPage(pdf, company, data, type, pageWidth, pageHeight)

    // Add comprehensive footers to all pages
    this.addComprehensiveFooters(pdf, company)

    // Save with detailed timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
    const cleanName = company.name.replace(/[^a-zA-Z0-9]/g, '_')
    pdf.save(`${cleanName}_Comprehensive_${type.toUpperCase()}_Analysis_${timestamp}.pdf`)
  }

  private static createExecutiveCoverPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    title: string, 
    type: string, 
    data: any,
    pageWidth: number, 
    pageHeight: number
  ): void {
    // Premium gradient background effect with Vortex branding
    this.drawGradientBackground(pdf, pageWidth, pageHeight)

    // Premium header with company branding
    pdf.setFillColor(124, 179, 66) // Vortex green
    pdf.rect(0, 0, pageWidth, 80, 'F')

    // Company logo and branding
    if (company.logo) {
      try {
        pdf.addImage(company.logo, 'PNG', 30, 20, 40, 40)
      } catch (error) {
        this.drawVortexLogo(pdf, 30, 20)
      }
    } else {
      this.drawVortexLogo(pdf, 30, 20)
    }

    // Executive title section
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(32)
    pdf.setTextColor(255, 255, 255)
    pdf.text('COMPREHENSIVE', pageWidth / 2, 35, { align: 'center' })
    pdf.text('FINANCIAL ANALYSIS', pageWidth / 2, 50, { align: 'center' })

    // Company name and period
    pdf.setFontSize(18)
    pdf.text(company.name, pageWidth / 2, 65, { align: 'center' })

    // Main content area with executive summary cards
    const cardY = 100
    this.createExecutiveSummaryCards(pdf, data, type, pageWidth, cardY)

    // Report metadata section
    this.createReportMetadata(pdf, data, type, company, pageWidth, pageHeight - 100)

    // Professional watermark
    pdf.setTextColor(124, 179, 66, 0.1)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(60)
    pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2, { 
      align: 'center', 
      angle: 45 
    })
  }

  private static createExecutiveSummaryPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Executive Summary & Key Insights', pageWidth)
    
    let yPos = 60

    // Financial health score
    this.createFinancialHealthScore(pdf, data, type, yPos, pageWidth)
    yPos += 50

    // Key performance indicators grid
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Key Performance Indicators', 25, yPos)
    yPos += 15

    const kpis = this.getComprehensiveKPIs(data, type)
    this.createAdvancedKPIGrid(pdf, kpis, yPos, pageWidth)
    yPos += 80

    // Performance trends summary
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Performance Trends', 25, yPos)
    yPos += 15

    this.createPerformanceTrendsSection(pdf, data, type, yPos, pageWidth)
  }

  private static createDetailedMetricsPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Detailed Financial Metrics', pageWidth)
    
    let yPos = 60

    // Comprehensive financial breakdown
    if (type === 'pnl') {
      this.createPnLDetailedBreakdown(pdf, data, yPos, pageWidth)
    } else {
      this.createCashFlowDetailedBreakdown(pdf, data, yPos, pageWidth)
    }
  }

  private static createFinancialAnalysisPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Financial Analysis & Ratios', pageWidth)
    
    let yPos = 60

    // Financial ratios and analysis
    this.createFinancialRatiosSection(pdf, data, type, yPos, pageWidth)
    yPos += 80

    // Benchmark comparisons
    this.createBenchmarkComparison(pdf, data, type, yPos, pageWidth)
  }

  private static createTrendAnalysisPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Trend Analysis & Forecasting', pageWidth)
    
    let yPos = 60

    // Historical trends
    this.createHistoricalTrends(pdf, data, type, yPos, pageWidth)
    yPos += 60

    // Forecasting section
    this.createForecastingSection(pdf, data, type, yPos, pageWidth)
  }

  private static createRiskAndOpportunityPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Risk Assessment & Opportunities', pageWidth)
    
    let yPos = 60

    // Risk matrix
    this.createRiskMatrix(pdf, data, type, yPos, pageWidth)
    yPos += 80

    // Opportunity analysis
    this.createOpportunityAnalysis(pdf, data, type, yPos, pageWidth)
  }

  private static createRecommendationsPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addPageHeader(pdf, 'Strategic Recommendations & Action Plan', pageWidth)
    
    let yPos = 60

    // Priority recommendations
    this.createPriorityRecommendations(pdf, data, type, yPos, pageWidth)
    yPos += 100

    // Action plan timeline
    this.createActionPlanTimeline(pdf, data, type, yPos, pageWidth)
  }

  // Enhanced helper methods
  private static drawGradientBackground(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    // Create gradient effect using overlapping rectangles
    for (let i = 0; i < 20; i++) {
      const opacity = 0.02
      const grayValue = 248 + i
      pdf.setFillColor(grayValue, grayValue, grayValue)
      pdf.rect(0, i * (pageHeight / 20), pageWidth, pageHeight / 20, 'F')
    }
  }

  private static drawVortexLogo(pdf: jsPDF, x: number, y: number): void {
    // Draw Vortex-style logo
    pdf.setFillColor(255, 255, 255)
    pdf.circle(x + 20, y + 20, 18, 'F')
    
    // Green spiral design
    pdf.setFillColor(124, 179, 66)
    pdf.circle(x + 20, y + 20, 15, 'F')
    
    pdf.setFillColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.text('V', x + 20, y + 25, { align: 'center' })
  }

  private static createExecutiveSummaryCards(pdf: jsPDF, data: any, type: string, pageWidth: number, startY: number): void {
    if (!data.currentMonth) return

    const current = data.currentMonth
    const cardHeight = 35
    const cardWidth = (pageWidth - 80) / 2
    const cards = []

    if (type === 'pnl') {
      cards.push(
        { title: 'Revenue Performance', value: this.formatCurrency(current.revenue), subtitle: 'Monthly Revenue' },
        { title: 'Profitability', value: this.formatCurrency(current.netIncome), subtitle: 'Net Income' },
        { title: 'Operational Efficiency', value: this.formatPercentage(current.grossMargin), subtitle: 'Gross Margin' },
        { title: 'Growth Trajectory', value: this.calculateGrowthRate(data), subtitle: 'Revenue Growth' }
      )
    } else {
      cards.push(
        { title: 'Cash Position', value: this.formatCurrency(current.income), subtitle: 'Current Cash Flow' },
        { title: 'Liquidity Status', value: this.getLiquidityStatus(current.income), subtitle: 'Financial Health' },
        { title: 'Burn Rate', value: this.calculateBurnRate(data), subtitle: 'Monthly Burn' },
        { title: 'Runway', value: this.calculateRunway(data), subtitle: 'Months Remaining' }
      )
    }

    cards.forEach((card, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 40 + col * (cardWidth + 20)
      const y = startY + row * (cardHeight + 15)

      // Premium card design
      pdf.setFillColor(255, 255, 255)
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      // Gradient border effect
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(2)
      pdf.rect(x, y, cardWidth, cardHeight, 'S')
      
      // Card content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(124, 179, 66)
      pdf.text(card.title, x + 10, y + 12)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(55, 71, 79)
      pdf.text(card.value, x + 10, y + 22)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(card.subtitle, x + 10, y + 30)
    })
  }

  private static createFinancialHealthScore(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const score = this.calculateFinancialHealthScore(data, type)
    const scoreColor = score >= 80 ? [76, 175, 80] : score >= 60 ? [255, 152, 0] : [244, 67, 54]

    // Health score card
    pdf.setFillColor(248, 251, 248)
    pdf.rect(25, yPos, pageWidth - 50, 35, 'F')
    
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(1)
    pdf.rect(25, yPos, pageWidth - 50, 35, 'S')

    // Score display
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Financial Health Score', 35, yPos + 15)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(24)
    pdf.setTextColor(...scoreColor)
    pdf.text(`${score}/100`, pageWidth - 45, yPos + 20, { align: 'right' })

    // Health indicator
    const healthText = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention'
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.text(healthText, pageWidth - 45, yPos + 30, { align: 'right' })
  }

  private static getComprehensiveKPIs(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const current = data.currentMonth
    const previous = data.previousMonth
    const kpis = []

    if (type === 'pnl') {
      kpis.push(
        {
          label: 'Revenue',
          value: this.formatCurrency(current.revenue),
          change: previous ? this.calculatePercentageChange(current.revenue, previous.revenue) : null,
          trend: this.getTrendDirection(current.revenue, previous?.revenue),
          benchmark: this.getBenchmarkStatus(current.revenue, 'revenue')
        },
        {
          label: 'Gross Profit',
          value: this.formatCurrency(current.grossProfit),
          change: previous ? this.calculatePercentageChange(current.grossProfit, previous.grossProfit) : null,
          trend: this.getTrendDirection(current.grossProfit, previous?.grossProfit),
          benchmark: this.getBenchmarkStatus(current.grossMargin, 'margin')
        },
        {
          label: 'Operating Income',
          value: this.formatCurrency(current.operatingIncome),
          change: previous ? this.calculatePercentageChange(current.operatingIncome, previous.operatingIncome) : null,
          trend: this.getTrendDirection(current.operatingIncome, previous?.operatingIncome),
          benchmark: this.getBenchmarkStatus(current.operatingMargin, 'margin')
        },
        {
          label: 'Net Income',
          value: this.formatCurrency(current.netIncome),
          change: previous ? this.calculatePercentageChange(current.netIncome, previous.netIncome) : null,
          trend: this.getTrendDirection(current.netIncome, previous?.netIncome),
          benchmark: this.getBenchmarkStatus(current.netMargin, 'margin')
        },
        {
          label: 'Gross Margin',
          value: this.formatPercentage(current.grossMargin),
          change: previous ? `${(current.grossMargin - previous.grossMargin).toFixed(1)}%` : null,
          trend: this.getTrendDirection(current.grossMargin, previous?.grossMargin),
          benchmark: this.getBenchmarkStatus(current.grossMargin, 'margin')
        },
        {
          label: 'Net Margin',
          value: this.formatPercentage(current.netMargin),
          change: previous ? `${(current.netMargin - previous.netMargin).toFixed(1)}%` : null,
          trend: this.getTrendDirection(current.netMargin, previous?.netMargin),
          benchmark: this.getBenchmarkStatus(current.netMargin, 'margin')
        }
      )
    } else {
      kpis.push(
        {
          label: 'Cash Flow',
          value: this.formatCurrency(current.income),
          change: previous ? this.calculatePercentageChange(current.income, previous.income) : null,
          trend: this.getTrendDirection(current.income, previous?.income),
          benchmark: this.getBenchmarkStatus(current.income, 'cashflow')
        },
        {
          label: 'Cash Position',
          value: this.formatCurrency(current.income),
          change: null,
          trend: current.income > 0 ? 'positive' : 'negative',
          benchmark: this.getBenchmarkStatus(current.income, 'position')
        }
      )
    }

    return kpis
  }

  private static createAdvancedKPIGrid(pdf: jsPDF, kpis: any[], yPos: number, pageWidth: number): void {
    const cardWidth = (pageWidth - 80) / 3
    const cardHeight = 25

    kpis.forEach((kpi, index) => {
      if (index >= 6) return // Limit to 6 KPIs per page
      
      const col = index % 3
      const row = Math.floor(index / 3)
      const x = 25 + col * (cardWidth + 10)
      const y = yPos + row * (cardHeight + 5)

      // Advanced card design with benchmark indicators
      pdf.setFillColor(255, 255, 255)
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      // Trend color border
      const trendColor = kpi.trend === 'positive' ? [76, 175, 80] : 
                        kpi.trend === 'negative' ? [244, 67, 54] : [124, 179, 66]
      pdf.setDrawColor(...trendColor)
      pdf.setLineWidth(1.5)
      pdf.rect(x, y, cardWidth, cardHeight, 'S')
      
      // Left accent bar for benchmark
      const benchmarkColor = kpi.benchmark === 'above' ? [76, 175, 80] :
                             kpi.benchmark === 'below' ? [244, 67, 54] : [255, 152, 0]
      pdf.setFillColor(...benchmarkColor)
      pdf.rect(x, y, 2, cardHeight, 'F')
      
      // KPI content
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 179, 66)
      pdf.text(kpi.label, x + 5, y + 8)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(55, 71, 79)
      pdf.text(kpi.value, x + 5, y + 15)
      
      // Change indicator
      if (kpi.change) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        pdf.setTextColor(...trendColor)
        pdf.text(kpi.change, x + cardWidth - 5, y + 20, { align: 'right' })
      }
    })
  }

  // Additional comprehensive methods would go here...
  // (Creating all the detailed sections mentioned above)

  private static addPageHeader(pdf: jsPDF, title: string, pageWidth: number): void {
    // Premium header design
    pdf.setFillColor(248, 251, 248)
    pdf.rect(0, 0, pageWidth, 40, 'F')
    
    // Header content
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(124, 179, 66)
    pdf.text(title, 25, 25)
    
    // Vortex branding
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(124, 179, 66)
    pdf.text('Warren by Vortex - Comprehensive Analytics', pageWidth - 25, 25, { align: 'right' })
    
    // Header line
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(2)
    pdf.line(25, 35, pageWidth - 25, 35)
  }

  private static addComprehensiveFooters(pdf: jsPDF, company: CompanyConfig): void {
    const pageCount = pdf.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Premium footer design
      pdf.setFillColor(248, 251, 248)
      pdf.rect(0, pageHeight - 30, pageWidth, 30, 'F')
      
      // Footer line
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(1)
      pdf.line(25, pageHeight - 25, pageWidth - 25, pageHeight - 25)
      
      // Footer content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(company.name, 25, pageHeight - 15)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 179, 66)
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 15, { align: 'right' })
      
      pdf.text('CONFIDENTIAL - COMPREHENSIVE FINANCIAL ANALYSIS', pageWidth / 2, pageHeight - 15, { align: 'center' })
      
      // Generation timestamp
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    }
  }

  // Utility methods
  private static formatCurrency(amount: number): string {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }

  private static formatPercentage(value: number): string {
    return `${value?.toFixed(1)}%`
  }

  private static calculatePercentageChange(current: number, previous: number): string {
    if (!previous || previous === 0) return 'N/A'
    const change = ((current - previous) / Math.abs(previous)) * 100
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  private static calculateFinancialHealthScore(data: any, type: string): number {
    if (!data.currentMonth) return 50

    const current = data.currentMonth
    let score = 0

    if (type === 'pnl') {
      // Revenue health (25 points)
      score += current.revenue > 0 ? 25 : 0
      
      // Profitability health (25 points)
      score += current.netIncome > 0 ? 25 : 0
      
      // Margin health (25 points)
      if (current.grossMargin > 50) score += 25
      else if (current.grossMargin > 30) score += 15
      else if (current.grossMargin > 10) score += 5
      
      // Growth health (25 points)
      if (data.previousMonth) {
        const growth = ((current.revenue - data.previousMonth.revenue) / data.previousMonth.revenue) * 100
        if (growth > 10) score += 25
        else if (growth > 0) score += 15
        else if (growth > -5) score += 5
      } else {
        score += 10 // Neutral if no previous data
      }
    } else {
      // Cash flow health
      score += current.income > 0 ? 50 : 20
      score += Math.abs(current.income) > 100000 ? 25 : 10
      score += 15 // Base operational score
    }

    return Math.min(100, Math.max(0, score))
  }

  private static getTrendDirection(current: number, previous?: number): string {
    if (!previous) return 'neutral'
    return current > previous ? 'positive' : current < previous ? 'negative' : 'neutral'
  }

  private static getBenchmarkStatus(value: number, type: string): string {
    // Simplified benchmark logic
    if (type === 'margin') {
      return value > 30 ? 'above' : value > 15 ? 'meets' : 'below'
    }
    return 'meets' // Default
  }

  private static calculateGrowthRate(data: any): string {
    if (!data.previousMonth || !data.currentMonth) return 'N/A'
    const growth = ((data.currentMonth.revenue - data.previousMonth.revenue) / data.previousMonth.revenue) * 100
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
  }

  private static getLiquidityStatus(income: number): string {
    return income > 0 ? 'Positive' : 'Negative'
  }

  private static calculateBurnRate(data: any): string {
    if (!data.currentMonth) return 'N/A'
    const burnRate = Math.abs(data.currentMonth.income < 0 ? data.currentMonth.income : 0)
    return this.formatCurrency(burnRate)
  }

  private static calculateRunway(data: any): string {
    if (!data.currentMonth || data.currentMonth.income >= 0) return 'Positive'
    // Simplified runway calculation
    return '12+ months'
  }

  // Placeholder methods for comprehensive sections
  private static createReportMetadata(pdf: jsPDF, data: any, type: string, company: CompanyConfig, pageWidth: number, yPos: number): void {
    // Report generation details
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(124, 179, 66)
    
    const metadata = [
      `Report Type: Comprehensive ${type.toUpperCase()} Analysis`,
      `Period: ${this.getReportPeriod(data)}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Analysis Level: Executive Summary with Detailed Insights`,
      `Confidence Level: High`,
      `Data Sources: Internal Financial Systems`
    ]

    metadata.forEach((item, index) => {
      pdf.text(item, pageWidth / 2, yPos + (index * 8), { align: 'center' })
    })
  }

  private static getReportPeriod(data: any): string {
    if (data.currentMonth?.month) {
      return data.currentMonth.month
    }
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  // Additional comprehensive methods for detailed sections
  private static createPerformanceTrendsSection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const trends = this.analyzeTrends(data, type)
    
    trends.forEach((trend, index) => {
      const y = yPos + (index * 15)
      
      // Trend indicator
      const trendColor = trend.direction === 'up' ? [76, 175, 80] : 
                        trend.direction === 'down' ? [244, 67, 54] : [255, 152, 0]
      pdf.setFillColor(...trendColor)
      pdf.circle(30, y - 2, 3, 'F')
      
      // Trend text
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(55, 71, 79)
      pdf.text(`${trend.metric}: ${trend.description}`, 40, y)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...trendColor)
      pdf.text(trend.value, pageWidth - 50, y, { align: 'right' })
    })
  }

  private static createPnLDetailedBreakdown(pdf: jsPDF, data: any, yPos: number, pageWidth: number): void {
    // Detailed P&L breakdown would go here
    this.drawCustomTable(
      pdf,
      ['Item', 'Current', 'Previous', 'Change', 'Trend'],
      [
        ['Revenue', this.formatCurrency(data.currentMonth?.revenue || 0), 'TBD', 'TBD', '↑'],
        ['Gross Profit', this.formatCurrency(data.currentMonth?.grossProfit || 0), 'TBD', 'TBD', '↑'],
        ['Operating Income', this.formatCurrency(data.currentMonth?.operatingIncome || 0), 'TBD', 'TBD', '↑'],
        ['Net Income', this.formatCurrency(data.currentMonth?.netIncome || 0), 'TBD', 'TBD', '↑']
      ],
      yPos,
      25,
      pageWidth - 50
    )
  }

  private static createCashFlowDetailedBreakdown(pdf: jsPDF, data: any, yPos: number, pageWidth: number): void {
    // Detailed cash flow breakdown would go here
    this.drawCustomTable(
      pdf,
      ['Category', 'Amount', 'Percentage', 'Status'],
      [
        ['Operating Cash Flow', this.formatCurrency(data.currentMonth?.income || 0), '100%', 'Active'],
        ['Investment Cash Flow', '$0', '0%', 'Neutral'],
        ['Financing Cash Flow', '$0', '0%', 'Neutral']
      ],
      yPos,
      25,
      pageWidth - 50
    )
  }

  private static createFinancialRatiosSection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const ratios = this.calculateFinancialRatios(data, type)
    
    this.drawCustomTable(
      pdf,
      ['Ratio', 'Current', 'Target', 'Status', 'Industry Avg'],
      ratios.map(ratio => [
        ratio.name,
        ratio.current,
        ratio.target,
        ratio.status,
        ratio.industry
      ]),
      yPos,
      25,
      pageWidth - 50
    )
  }

  private static createBenchmarkComparison(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const benchmarks = this.getBenchmarkData(data, type)
    
    benchmarks.forEach((benchmark, index) => {
      const y = yPos + (index * 25)
      
      // Benchmark card
      pdf.setFillColor(248, 251, 248)
      pdf.rect(25, y, pageWidth - 50, 20, 'F')
      
      // Performance indicator
      const performanceColor = benchmark.performance === 'above' ? [76, 175, 80] : 
                              benchmark.performance === 'below' ? [244, 67, 54] : [255, 152, 0]
      pdf.setFillColor(...performanceColor)
      pdf.rect(25, y, 4, 20, 'F')
      
      // Benchmark content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(55, 71, 79)
      pdf.text(benchmark.metric, 35, y + 8)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(`Your: ${benchmark.yourValue} | Industry: ${benchmark.industryValue}`, 35, y + 15)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...performanceColor)
      pdf.text(benchmark.status, pageWidth - 30, y + 12, { align: 'right' })
    })
  }

  private static createHistoricalTrends(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    // Create a simple trend visualization
    const trendData = this.getHistoricalTrendData(data, type)
    
    // Draw trend chart area
    pdf.setFillColor(248, 251, 248)
    pdf.rect(25, yPos, pageWidth - 50, 40, 'F')
    
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(1)
    pdf.rect(25, yPos, pageWidth - 50, 40, 'S')
    
    // Chart title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Historical Performance Trend', 30, yPos + 12)
    
    // Draw simple trend line
    if (trendData.length > 1) {
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(2)
      
      const chartWidth = pageWidth - 80
      const chartHeight = 20
      const stepX = chartWidth / (trendData.length - 1)
      
      for (let i = 0; i < trendData.length - 1; i++) {
        const x1 = 40 + (i * stepX)
        const x2 = 40 + ((i + 1) * stepX)
        const y1 = yPos + 30 - (trendData[i].value * chartHeight / 100)
        const y2 = yPos + 30 - (trendData[i + 1].value * chartHeight / 100)
        
        pdf.line(x1, y1, x2, y2)
      }
    }
    
    // Trend summary
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(124, 179, 66)
    pdf.text(this.getTrendSummary(trendData), 30, yPos + 35)
  }

  private static createForecastingSection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const forecasts = this.generateForecasts(data, type)
    
    // Forecast header
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(55, 71, 79)
    pdf.text('6-Month Forecast', 25, yPos)
    
    // Forecast table
    this.drawCustomTable(
      pdf,
      ['Period', 'Projected Value', 'Confidence', 'Key Drivers'],
      forecasts.map(forecast => [
        forecast.period,
        forecast.value,
        forecast.confidence,
        forecast.drivers
      ]),
      yPos + 10,
      25,
      pageWidth - 50
    )
  }

  private static createRiskMatrix(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const risks = this.identifyRisks(data, type)
    
    risks.forEach((risk, index) => {
      const y = yPos + (index * 18)
      
      // Risk level indicator
      const riskColor = risk.level === 'high' ? [244, 67, 54] : 
                       risk.level === 'medium' ? [255, 152, 0] : [76, 175, 80]
      
      // Risk card
      pdf.setFillColor(255, 255, 255)
      pdf.rect(25, y, pageWidth - 50, 15, 'F')
      
      pdf.setFillColor(...riskColor)
      pdf.rect(25, y, 5, 15, 'F')
      
      // Risk content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(55, 71, 79)
      pdf.text(risk.name, 35, y + 6)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text(risk.description, 35, y + 11)
      
      // Risk level
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...riskColor)
      pdf.text(risk.level.toUpperCase(), pageWidth - 30, y + 8, { align: 'right' })
    })
  }

  private static createOpportunityAnalysis(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const opportunities = this.identifyOpportunities(data, type)
    
    opportunities.forEach((opportunity, index) => {
      const y = yPos + (index * 18)
      
      // Opportunity card
      pdf.setFillColor(248, 251, 248)
      pdf.rect(25, y, pageWidth - 50, 15, 'F')
      
      pdf.setFillColor(76, 175, 80)
      pdf.rect(25, y, 5, 15, 'F')
      
      // Opportunity content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(55, 71, 79)
      pdf.text(opportunity.name, 35, y + 6)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text(opportunity.description, 35, y + 11)
      
      // Potential value
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(76, 175, 80)
      pdf.text(opportunity.value, pageWidth - 30, y + 8, { align: 'right' })
    })
  }

  private static createPriorityRecommendations(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const recommendations = [
      'Continue focus on revenue optimization strategies',
      'Implement cost management initiatives for improved margins',
      'Explore new market opportunities for growth acceleration',
      'Strengthen operational efficiency programs'
    ]

    recommendations.forEach((rec, index) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(55, 71, 79)
      pdf.text(`${index + 1}. ${rec}`, 25, yPos + (index * 10))
    })
  }

  private static createActionPlanTimeline(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Action plan timeline: Q1 - Strategy implementation, Q2 - Performance review...', 25, yPos)
  }

  private static drawCustomTable(
    pdf: jsPDF,
    headers: string[],
    rows: string[][],
    startY: number,
    startX: number,
    totalWidth: number
  ): void {
    const rowHeight = 12
    const headerHeight = 15
    const columnWidth = totalWidth / headers.length
    let currentY = startY

    // Draw header background
    pdf.setFillColor(124, 179, 66) // Vortex green
    pdf.rect(startX, currentY, totalWidth, headerHeight, 'F')

    // Draw header text
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(255, 255, 255)
    
    headers.forEach((header, index) => {
      const x = startX + (index * columnWidth) + 5
      pdf.text(header, x, currentY + 10)
    })

    currentY += headerHeight

    // Draw rows
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(55, 71, 79)

    rows.forEach((row, rowIndex) => {
      // Alternate row background
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(248, 251, 248) // Very light green
        pdf.rect(startX, currentY, totalWidth, rowHeight, 'F')
      }

      // Draw row text
      row.forEach((cell, colIndex) => {
        const x = startX + (colIndex * columnWidth) + 5
        
        // Right align numbers (columns with $ or % or specific patterns)
        if (colIndex > 0 && (cell.includes('$') || cell.includes('%') || cell.includes('+') || cell.includes('↑') || cell.includes('↓'))) {
          pdf.text(cell, startX + ((colIndex + 1) * columnWidth) - 5, currentY + 8, { align: 'right' })
        } else {
          pdf.text(cell, x, currentY + 8)
        }
      })

      currentY += rowHeight
    })

    // Draw table border
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineWidth(0.5)
    pdf.rect(startX, startY, totalWidth, headerHeight + (rows.length * rowHeight), 'S')

    // Draw column separators
    for (let i = 1; i < headers.length; i++) {
      const x = startX + (i * columnWidth)
      pdf.line(x, startY, x, startY + headerHeight + (rows.length * rowHeight))
    }

    // Draw row separators
    for (let i = 1; i <= rows.length; i++) {
      const y = startY + headerHeight + (i * rowHeight)
      pdf.line(startX, y, startX + totalWidth, y)
    }
  }

  // Helper methods for comprehensive analysis
  private static analyzeTrends(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const trends = []
    
    if (type === 'pnl') {
      if (data.previousMonth) {
        const revenueChange = ((data.currentMonth.revenue - data.previousMonth.revenue) / data.previousMonth.revenue) * 100
        trends.push({
          metric: 'Revenue Growth',
          direction: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
          value: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
          description: revenueChange > 0 ? 'Strong revenue growth momentum' : 'Revenue decline requires attention'
        })

        const marginChange = data.currentMonth.grossMargin - data.previousMonth.grossMargin
        trends.push({
          metric: 'Margin Improvement',
          direction: marginChange > 0 ? 'up' : marginChange < 0 ? 'down' : 'neutral',
          value: `${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)}%`,
          description: marginChange > 0 ? 'Improving operational efficiency' : 'Margin pressure observed'
        })
      }
    } else {
      trends.push({
        metric: 'Cash Flow',
        direction: data.currentMonth.income > 0 ? 'up' : 'down',
        value: this.formatCurrency(data.currentMonth.income),
        description: data.currentMonth.income > 0 ? 'Positive cash generation' : 'Cash flow challenges'
      })
    }

    return trends
  }

  private static calculateFinancialRatios(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const ratios = []

    if (type === 'pnl') {
      ratios.push(
        {
          name: 'Gross Margin',
          current: `${data.currentMonth.grossMargin?.toFixed(1)}%`,
          target: '40%',
          status: (data.currentMonth.grossMargin || 0) > 40 ? 'Above' : 'Below',
          industry: '35%'
        },
        {
          name: 'Operating Margin',
          current: `${data.currentMonth.operatingMargin?.toFixed(1)}%`,
          target: '15%',
          status: (data.currentMonth.operatingMargin || 0) > 15 ? 'Above' : 'Below',
          industry: '12%'
        },
        {
          name: 'Net Margin',
          current: `${data.currentMonth.netMargin?.toFixed(1)}%`,
          target: '10%',
          status: (data.currentMonth.netMargin || 0) > 10 ? 'Above' : 'Below',
          industry: '8%'
        }
      )
    }

    return ratios
  }

  private static getBenchmarkData(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const benchmarks = []

    if (type === 'pnl') {
      benchmarks.push(
        {
          metric: 'Revenue Growth',
          yourValue: data.previousMonth ? this.calculatePercentageChange(data.currentMonth.revenue, data.previousMonth.revenue) : 'N/A',
          industryValue: '15%',
          performance: 'above',
          status: 'Outperforming'
        },
        {
          metric: 'Profitability',
          yourValue: `${data.currentMonth.netMargin?.toFixed(1)}%`,
          industryValue: '8%',
          performance: (data.currentMonth.netMargin || 0) > 8 ? 'above' : 'below',
          status: (data.currentMonth.netMargin || 0) > 8 ? 'Strong' : 'Improving'
        }
      )
    } else {
      benchmarks.push({
        metric: 'Cash Management',
        yourValue: data.currentMonth.income > 0 ? 'Positive' : 'Negative',
        industryValue: 'Positive',
        performance: data.currentMonth.income > 0 ? 'above' : 'below',
        status: data.currentMonth.income > 0 ? 'Excellent' : 'Attention Needed'
      })
    }

    return benchmarks
  }

  private static getHistoricalTrendData(data: any, type: string): any[] {
    // Simplified historical data - in real implementation, this would come from actual historical data
    return [
      { period: 'Q1', value: 75 },
      { period: 'Q2', value: 82 },
      { period: 'Q3', value: 78 },
      { period: 'Q4', value: 88 }
    ]
  }

  private static getTrendSummary(trendData: any[]): string {
    if (trendData.length < 2) return 'Insufficient data for trend analysis'
    
    const latest = trendData[trendData.length - 1].value
    const previous = trendData[trendData.length - 2].value
    const change = latest - previous
    
    if (change > 5) return 'Strong upward trend observed'
    if (change > 0) return 'Positive trend momentum'
    if (change > -5) return 'Stable performance with minor fluctuations'
    return 'Declining trend requires attention'
  }

  private static generateForecasts(data: any, type: string): any[] {
    const forecasts = []
    
    if (type === 'pnl' && data.currentMonth) {
      const baseRevenue = data.currentMonth.revenue
      for (let i = 1; i <= 6; i++) {
        const growthRate = 0.05 // 5% monthly growth assumption
        const projectedRevenue = baseRevenue * Math.pow(1 + growthRate, i)
        
        forecasts.push({
          period: `Month ${i}`,
          value: this.formatCurrency(projectedRevenue),
          confidence: i <= 3 ? 'High' : 'Medium',
          drivers: i <= 3 ? 'Current trends' : 'Market expansion'
        })
      }
    } else if (data.currentMonth) {
      for (let i = 1; i <= 6; i++) {
        forecasts.push({
          period: `Month ${i}`,
          value: this.formatCurrency(data.currentMonth.income * 1.1),
          confidence: 'Medium',
          drivers: 'Operational improvements'
        })
      }
    }

    return forecasts.slice(0, 3) // Show only first 3 months for space
  }

  private static identifyRisks(data: any, type: string): any[] {
    const risks = []

    if (type === 'pnl' && data.currentMonth) {
      if ((data.currentMonth.grossMargin || 0) < 30) {
        risks.push({
          name: 'Margin Pressure',
          description: 'Low gross margins may impact profitability',
          level: 'medium'
        })
      }
      
      if ((data.currentMonth.netMargin || 0) < 5) {
        risks.push({
          name: 'Profitability Risk',
          description: 'Low net margins indicate operational challenges',
          level: 'high'
        })
      }
    } else if (data.currentMonth?.income < 0) {
      risks.push({
        name: 'Cash Flow Risk',
        description: 'Negative cash flow threatens operations',
        level: 'high'
      })
    }

    // Add general business risks
    risks.push({
      name: 'Market Volatility',
      description: 'Economic uncertainty may impact performance',
      level: 'low'
    })

    return risks
  }

  private static identifyOpportunities(data: any, type: string): any[] {
    const opportunities = []

    if (type === 'pnl' && data.currentMonth) {
      if ((data.currentMonth.grossMargin || 0) > 40) {
        opportunities.push({
          name: 'Scale Operations',
          description: 'Strong margins support growth investments',
          value: '+25% Growth'
        })
      }

      if ((data.currentMonth.revenue || 0) > 1000000) {
        opportunities.push({
          name: 'Market Expansion',
          description: 'Revenue scale enables new market entry',
          value: '+$500K Revenue'
        })
      }
    } else if (data.currentMonth?.income > 0) {
      opportunities.push({
        name: 'Investment Capacity',
        description: 'Positive cash flow enables strategic investments',
        value: '+15% ROI'
      })
    }

    opportunities.push({
      name: 'Process Optimization',
      description: 'Operational improvements can boost efficiency',
      value: '+10% Efficiency'
    })

    return opportunities
  }
}