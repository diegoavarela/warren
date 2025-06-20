import { jsPDF } from 'jspdf'
import { CompanyConfig } from './configurationService'

interface CompactPDFOptions {
  company: CompanyConfig
  title: string
  data: any
  type: 'pnl' | 'cashflow'
}

export class CompactPDFService {
  private static readonly VORTEX_GREEN = '#7CB342'
  private static readonly DARK_GREEN = '#2E7D32'
  private static readonly GRAY_DARK = '#37474F'
  private static readonly GRAY_LIGHT = '#ECEFF1'

  public static async exportCompactReport(options: CompactPDFOptions): Promise<void> {
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
      title: `${company.name} - ${title}`,
      subject: `${type.toUpperCase()} Compact Executive Report`,
      author: company.name,
      keywords: 'financial, executive, analysis, dashboard',
      creator: 'Warren by Vortex'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Page 1: Executive Summary + Key Metrics
    this.createCompactExecutivePage(pdf, company, title, type, data, pageWidth, pageHeight)
    
    // Page 2: Detailed Analysis + Trends
    pdf.addPage()
    this.createCompactAnalysisPage(pdf, company, data, type, pageWidth, pageHeight)
    
    // Page 3: Forecasts + Recommendations (if needed)
    if (this.shouldIncludeThirdPage(data, type)) {
      pdf.addPage()
      this.createCompactForecastPage(pdf, company, data, type, pageWidth, pageHeight)
    }

    // Add compact footers to all pages
    this.addCompactFooters(pdf, company)

    // Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
    const cleanName = company.name.replace(/[^a-zA-Z0-9]/g, '_')
    pdf.save(`${cleanName}_Compact_${type.toUpperCase()}_Report_${timestamp}.pdf`)
  }

  private static createCompactExecutivePage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    title: string, 
    type: string, 
    data: any,
    pageWidth: number, 
    pageHeight: number
  ): void {
    // Compact header with branding
    pdf.setFillColor(124, 179, 66)
    pdf.rect(0, 0, pageWidth, 40, 'F')

    // Company logo area
    if (company.logo) {
      try {
        pdf.addImage(company.logo, 'PNG', 15, 10, 20, 20)
      } catch (error) {
        this.drawCompactLogo(pdf, 15, 10)
      }
    } else {
      this.drawCompactLogo(pdf, 15, 10)
    }

    // Header text
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(255, 255, 255)
    pdf.text(company.name, pageWidth / 2, 18, { align: 'center' })
    
    pdf.setFontSize(14)
    pdf.text(title, pageWidth / 2, 28, { align: 'center' })

    // Date
    pdf.setFontSize(10)
    pdf.text(new Date().toLocaleDateString(), pageWidth - 15, 25, { align: 'right' })

    // Financial Health Score (compact)
    let yPos = 50
    this.createCompactHealthScore(pdf, data, type, yPos, pageWidth)
    yPos += 25

    // Key Metrics Grid (4-6 metrics in compact layout)
    this.createCompactMetricsGrid(pdf, data, type, yPos, pageWidth)
    yPos += 60

    // Executive Summary Cards (2x2 grid)
    this.createCompactSummaryCards(pdf, data, type, yPos, pageWidth)
    yPos += 60

    // Performance Highlights (compact bullet points)
    this.createCompactHighlights(pdf, data, type, yPos, pageWidth)
  }

  private static createCompactAnalysisPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addCompactPageHeader(pdf, 'Financial Analysis & Trends', pageWidth)
    
    let yPos = 35

    // Trends visualization (compact chart area)
    this.createCompactTrendsSection(pdf, data, type, yPos, pageWidth)
    yPos += 50

    // Financial ratios table (condensed)
    this.createCompactRatiosTable(pdf, data, type, yPos, pageWidth)
    yPos += 45

    // Risk & Opportunity Matrix (side by side)
    this.createCompactRiskOpportunitySection(pdf, data, type, yPos, pageWidth)
    yPos += 60

    // Key Insights (bullet points)
    this.createCompactInsights(pdf, data, type, yPos, pageWidth)
  }

  private static createCompactForecastPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    this.addCompactPageHeader(pdf, 'Forecasts & Strategic Recommendations', pageWidth)
    
    let yPos = 35

    // 6-month forecast table
    this.createCompactForecastTable(pdf, data, type, yPos, pageWidth)
    yPos += 50

    // Strategic recommendations (numbered list)
    this.createCompactRecommendations(pdf, data, type, yPos, pageWidth)
    yPos += 60

    // Action plan timeline (visual)
    this.createCompactTimeline(pdf, data, type, yPos, pageWidth)
  }

  // Compact helper methods
  private static drawCompactLogo(pdf: jsPDF, x: number, y: number): void {
    pdf.setFillColor(255, 255, 255)
    pdf.circle(x + 10, y + 10, 8, 'F')
    
    pdf.setFillColor(124, 179, 66)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('V', x + 10, y + 13, { align: 'center' })
  }

  private static createCompactHealthScore(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const score = this.calculateHealthScore(data, type)
    const scoreColor: [number, number, number] = score >= 80 ? [76, 175, 80] : score >= 60 ? [255, 152, 0] : [244, 67, 54]

    // Compact health score bar
    pdf.setFillColor(248, 251, 248)
    pdf.rect(15, yPos, pageWidth - 30, 20, 'F')
    
    // Score bar
    const barWidth = ((pageWidth - 60) * score) / 100
    pdf.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2])
    pdf.rect(30, yPos + 5, barWidth, 10, 'F')
    
    // Score text
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Financial Health', 15, yPos - 3)
    
    pdf.setFontSize(16)
    pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
    pdf.text(`${score}/100`, pageWidth - 15, yPos - 3, { align: 'right' })
  }

  private static createCompactMetricsGrid(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    if (!data.currentMonth) return

    const metrics = this.getCompactMetrics(data, type)
    const cardWidth = (pageWidth - 40) / 3
    const cardHeight = 25

    metrics.slice(0, 6).forEach((metric, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      const x = 15 + col * (cardWidth + 5)
      const y = yPos + row * (cardHeight + 5)

      // Metric card
      pdf.setFillColor(255, 255, 255)
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(0.5)
      pdf.rect(x, y, cardWidth, cardHeight, 'S')
      
      // Metric content
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 179, 66)
      pdf.text(metric.label, x + 3, y + 8)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(55, 71, 79)
      pdf.text(metric.value, x + 3, y + 16)
      
      // Change indicator
      if (metric.change) {
        const changeColor: [number, number, number] = metric.trend === 'positive' ? [76, 175, 80] : [244, 67, 54]
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2])
        pdf.text(metric.change, x + cardWidth - 3, y + 20, { align: 'right' })
      }
    })
  }

  private static createCompactSummaryCards(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const cards = this.getSummaryCards(data, type)
    const cardWidth = (pageWidth - 35) / 2
    const cardHeight = 25

    cards.slice(0, 4).forEach((card, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 15 + col * (cardWidth + 5)
      const y = yPos + row * (cardHeight + 5)

      // Card background
      pdf.setFillColor(248, 251, 248)
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      // Card content
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(124, 179, 66)
      pdf.text(card.title, x + 5, y + 10)
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(55, 71, 79)
      pdf.text(card.value, x + 5, y + 20)
    })
  }

  private static createCompactHighlights(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const highlights = this.getHighlights(data, type)
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Key Performance Highlights', 15, yPos)
    
    yPos += 8
    highlights.slice(0, 3).forEach((highlight, index) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 71, 79)
      
      // Bullet point
      pdf.setFillColor(124, 179, 66)
      pdf.circle(20, yPos + (index * 10) - 2, 1.5, 'F')
      
      pdf.text(highlight, 25, yPos + (index * 10))
    })
  }

  private static createCompactTrendsSection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    // Trend visualization area
    pdf.setFillColor(248, 251, 248)
    pdf.rect(15, yPos, pageWidth - 30, 40, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Performance Trend Analysis', 20, yPos + 10)
    
    // Simple trend indicators
    const trends = this.getTrendIndicators(data, type)
    const trendWidth = (pageWidth - 40) / trends.length
    
    trends.forEach((trend, index) => {
      const x = 20 + (index * trendWidth)
      const y = yPos + 25
      
      // Trend arrow
      const color: [number, number, number] = trend.direction === 'up' ? [76, 175, 80] : 
                   trend.direction === 'down' ? [244, 67, 54] : [255, 152, 0]
      pdf.setFillColor(color[0], color[1], color[2])
      
      if (trend.direction === 'up') {
        // Up arrow
        pdf.triangle(x + 10, y - 5, x + 5, y + 5, x + 15, y + 5, 'F')
      } else if (trend.direction === 'down') {
        // Down arrow
        pdf.triangle(x + 10, y + 5, x + 5, y - 5, x + 15, y - 5, 'F')
      } else {
        // Neutral line
        pdf.rect(x + 5, y, 10, 2, 'F')
      }
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(55, 71, 79)
      pdf.text(trend.label, x, y + 10)
    })
  }

  private static createCompactRatiosTable(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const ratios = this.getKeyRatios(data, type)
    
    // Compact table
    this.drawCompactTable(
      pdf,
      ['Financial Ratio', 'Current', 'Target', 'Status'],
      ratios.map(r => [r.name, r.current, r.target, r.status]),
      yPos,
      15,
      pageWidth - 30,
      8 // row height
    )
  }

  private static createCompactRiskOpportunitySection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const halfWidth = (pageWidth - 35) / 2
    
    // Risks side
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(244, 67, 54)
    pdf.text('Key Risks', 15, yPos)
    
    const risks = this.getTopRisks(data, type)
    risks.slice(0, 3).forEach((risk, index) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(55, 71, 79)
      pdf.text(`• ${risk}`, 15, yPos + 10 + (index * 8))
    })
    
    // Opportunities side
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(76, 175, 80)
    pdf.text('Opportunities', 15 + halfWidth, yPos)
    
    const opportunities = this.getTopOpportunities(data, type)
    opportunities.slice(0, 3).forEach((opp, index) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(55, 71, 79)
      pdf.text(`• ${opp}`, 15 + halfWidth, yPos + 10 + (index * 8))
    })
  }

  private static createCompactInsights(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    pdf.setFillColor(248, 251, 248)
    pdf.rect(15, yPos, pageWidth - 30, 30, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Executive Insights', 20, yPos + 10)
    
    const insights = this.getExecutiveInsights(data, type)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    
    // Wrap text for insights
    const maxWidth = pageWidth - 40
    const lines = pdf.splitTextToSize(insights, maxWidth)
    lines.slice(0, 3).forEach((line: string, index: number) => {
      pdf.text(line, 20, yPos + 18 + (index * 6))
    })
  }

  private static createCompactForecastTable(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const forecasts = this.getCompactForecasts(data, type)
    
    this.drawCompactTable(
      pdf,
      ['Month', 'Projected', 'Confidence'],
      forecasts,
      yPos,
      15,
      pageWidth - 30,
      10
    )
  }

  private static createCompactRecommendations(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Strategic Recommendations', 15, yPos)
    
    const recommendations = this.getRecommendations(data, type)
    yPos += 10
    
    recommendations.slice(0, 4).forEach((rec, index) => {
      // Number circle
      pdf.setFillColor(124, 179, 66)
      pdf.circle(20, yPos + (index * 12) - 2, 4, 'F')
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(255, 255, 255)
      pdf.text(`${index + 1}`, 20, yPos + (index * 12), { align: 'center' })
      
      // Recommendation text
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(55, 71, 79)
      pdf.text(rec, 28, yPos + (index * 12))
    })
  }

  private static createCompactTimeline(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    // Timeline visualization
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(2)
    pdf.line(30, yPos + 10, pageWidth - 30, yPos + 10)
    
    const milestones = [
      { month: 'Month 1-2', action: 'Quick Wins' },
      { month: 'Month 3-4', action: 'Core Changes' },
      { month: 'Month 5-6', action: 'Scale & Optimize' }
    ]
    
    const spacing = (pageWidth - 60) / (milestones.length - 1)
    
    milestones.forEach((milestone, index) => {
      const x = 30 + (index * spacing)
      
      // Milestone dot
      pdf.setFillColor(124, 179, 66)
      pdf.circle(x, yPos + 10, 3, 'F')
      
      // Milestone text
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(55, 71, 79)
      pdf.text(milestone.month, x, yPos + 5, { align: 'center' })
      
      pdf.setFont('helvetica', 'normal')
      pdf.text(milestone.action, x, yPos + 20, { align: 'center' })
    })
  }

  private static addCompactPageHeader(pdf: jsPDF, title: string, pageWidth: number): void {
    pdf.setFillColor(248, 251, 248)
    pdf.rect(0, 0, pageWidth, 25, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(124, 179, 66)
    pdf.text(title, pageWidth / 2, 15, { align: 'center' })
    
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(1)
    pdf.line(15, 22, pageWidth - 15, 22)
  }

  private static addCompactFooters(pdf: jsPDF, company: CompanyConfig): void {
    const pageCount = pdf.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Footer line
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(0.5)
      pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
      
      // Footer content
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 179, 66)
      pdf.text(company.name, 15, pageHeight - 8)
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
      pdf.text('Confidential', pageWidth - 15, pageHeight - 8, { align: 'right' })
    }
  }

  private static drawCompactTable(
    pdf: jsPDF,
    headers: string[],
    rows: string[][],
    startY: number,
    startX: number,
    totalWidth: number,
    rowHeight: number = 10
  ): void {
    const headerHeight = 12
    const columnWidth = totalWidth / headers.length
    let currentY = startY

    // Header
    pdf.setFillColor(124, 179, 66)
    pdf.rect(startX, currentY, totalWidth, headerHeight, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(255, 255, 255)
    
    headers.forEach((header, index) => {
      const x = startX + (index * columnWidth) + 3
      pdf.text(header, x, currentY + 8)
    })

    currentY += headerHeight

    // Rows
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(55, 71, 79)

    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(248, 251, 248)
        pdf.rect(startX, currentY, totalWidth, rowHeight, 'F')
      }

      row.forEach((cell, colIndex) => {
        const x = startX + (colIndex * columnWidth) + 3
        
        if (colIndex > 0 && (cell.includes('$') || cell.includes('%'))) {
          pdf.text(cell, startX + ((colIndex + 1) * columnWidth) - 3, currentY + 7, { align: 'right' })
        } else {
          pdf.text(cell, x, currentY + 7)
        }
      })

      currentY += rowHeight
    })

    // Table border
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineWidth(0.3)
    pdf.rect(startX, startY, totalWidth, headerHeight + (rows.length * rowHeight), 'S')
  }

  // Helper methods for data extraction
  private static calculateHealthScore(data: any, type: string): number {
    if (!data.currentMonth) return 50

    const current = data.currentMonth
    let score = 0

    if (type === 'pnl') {
      score += current.revenue > 0 ? 25 : 0
      score += current.netIncome > 0 ? 25 : 0
      score += current.grossMargin > 30 ? 25 : 10
      score += current.netMargin > 10 ? 25 : 10
    } else {
      score += current.income > 0 ? 50 : 20
      score += 30 // Base operational score
    }

    return Math.min(100, Math.max(0, score))
  }

  private static getCompactMetrics(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const current = data.currentMonth
    const previous = data.previousMonth
    const metrics = []

    if (type === 'pnl') {
      metrics.push(
        {
          label: 'Revenue',
          value: this.formatCurrency(current.revenue),
          change: previous ? this.calculateChange(current.revenue, previous.revenue) : null,
          trend: this.getTrend(current.revenue, previous?.revenue)
        },
        {
          label: 'Gross Profit',
          value: this.formatCurrency(current.grossProfit),
          change: previous ? this.calculateChange(current.grossProfit, previous.grossProfit) : null,
          trend: this.getTrend(current.grossProfit, previous?.grossProfit)
        },
        {
          label: 'Net Income',
          value: this.formatCurrency(current.netIncome),
          change: previous ? this.calculateChange(current.netIncome, previous.netIncome) : null,
          trend: this.getTrend(current.netIncome, previous?.netIncome)
        },
        {
          label: 'Gross Margin',
          value: `${current.grossMargin?.toFixed(1)}%`,
          change: previous ? `${(current.grossMargin - previous.grossMargin).toFixed(1)}%` : null,
          trend: this.getTrend(current.grossMargin, previous?.grossMargin)
        },
        {
          label: 'Operating Margin',
          value: `${current.operatingMargin?.toFixed(1)}%`,
          change: previous ? `${(current.operatingMargin - previous.operatingMargin).toFixed(1)}%` : null,
          trend: this.getTrend(current.operatingMargin, previous?.operatingMargin)
        },
        {
          label: 'Net Margin',
          value: `${current.netMargin?.toFixed(1)}%`,
          change: previous ? `${(current.netMargin - previous.netMargin).toFixed(1)}%` : null,
          trend: this.getTrend(current.netMargin, previous?.netMargin)
        }
      )
    } else {
      metrics.push(
        {
          label: 'Cash Flow',
          value: this.formatCurrency(current.income),
          change: previous ? this.calculateChange(current.income, previous.income) : null,
          trend: this.getTrend(current.income, previous?.income)
        },
        {
          label: 'Total Income',
          value: this.formatCurrency(current.totalIncome),
          change: null,
          trend: 'neutral'
        },
        {
          label: 'Total Expenses',
          value: this.formatCurrency(current.totalExpense),
          change: null,
          trend: 'neutral'
        },
        {
          label: 'Final Balance',
          value: this.formatCurrency(current.finalBalance),
          change: null,
          trend: current.finalBalance > 0 ? 'positive' : 'negative'
        }
      )
    }

    return metrics
  }

  private static getSummaryCards(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    if (type === 'pnl') {
      return [
        { title: 'YTD Revenue', value: this.formatCurrency(data.yearToDate?.revenue || 0) },
        { title: 'YTD Profit', value: this.formatCurrency(data.yearToDate?.netIncome || 0) },
        { title: 'Avg Margin', value: `${data.yearToDate?.avgGrossMargin?.toFixed(1) || 0}%` },
        { title: 'Growth Rate', value: this.calculateGrowthRate(data) }
      ]
    } else {
      return [
        { title: 'YTD Income', value: this.formatCurrency(data.yearToDate?.totalIncome || 0) },
        { title: 'YTD Expenses', value: this.formatCurrency(data.yearToDate?.totalExpense || 0) },
        { title: 'Cash Position', value: data.currentMonth.income > 0 ? 'Positive' : 'Negative' },
        { title: 'Burn Rate', value: this.calculateBurnRate(data) }
      ]
    }
  }

  private static getHighlights(data: any, type: string): string[] {
    const highlights = []

    if (type === 'pnl') {
      if (data.currentMonth?.netIncome > 0) {
        highlights.push('Profitable operations with positive net income')
      }
      if (data.currentMonth?.grossMargin > 40) {
        highlights.push('Strong gross margins above industry average')
      }
      if (data.previousMonth && data.currentMonth?.revenue > data.previousMonth.revenue) {
        highlights.push('Revenue growth momentum continues')
      }
    } else {
      if (data.currentMonth?.income > 0) {
        highlights.push('Positive cash flow generation')
      }
      highlights.push(`Current month cash flow: ${this.formatCurrency(data.currentMonth?.income || 0)}`)
      if (data.yearToDate?.totalBalance > 0) {
        highlights.push('Healthy year-to-date cash position')
      }
    }

    return highlights
  }

  private static getTrendIndicators(data: any, type: string): any[] {
    if (type === 'pnl') {
      return [
        { label: 'Revenue', direction: this.getTrendDirection(data, 'revenue') },
        { label: 'Profit', direction: this.getTrendDirection(data, 'netIncome') },
        { label: 'Margins', direction: this.getTrendDirection(data, 'grossMargin') }
      ]
    } else {
      return [
        { label: 'Cash Flow', direction: this.getTrendDirection(data, 'income') },
        { label: 'Expenses', direction: 'neutral' },
        { label: 'Balance', direction: data.currentMonth?.finalBalance > 0 ? 'up' : 'down' }
      ]
    }
  }

  private static getKeyRatios(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    if (type === 'pnl') {
      return [
        {
          name: 'Gross Margin',
          current: `${data.currentMonth.grossMargin?.toFixed(1)}%`,
          target: '40%',
          status: data.currentMonth.grossMargin > 40 ? '✓' : '↑'
        },
        {
          name: 'Net Margin',
          current: `${data.currentMonth.netMargin?.toFixed(1)}%`,
          target: '10%',
          status: data.currentMonth.netMargin > 10 ? '✓' : '↑'
        },
        {
          name: 'Op. Margin',
          current: `${data.currentMonth.operatingMargin?.toFixed(1)}%`,
          target: '15%',
          status: data.currentMonth.operatingMargin > 15 ? '✓' : '↑'
        }
      ]
    } else {
      return [
        {
          name: 'Cash Flow',
          current: data.currentMonth.income > 0 ? 'Positive' : 'Negative',
          target: 'Positive',
          status: data.currentMonth.income > 0 ? '✓' : '!'
        }
      ]
    }
  }

  private static getTopRisks(data: any, type: string): string[] {
    const risks = []

    if (type === 'pnl') {
      if (data.currentMonth?.netMargin < 5) risks.push('Low profitability margins')
      if (data.currentMonth?.revenue < data.previousMonth?.revenue) risks.push('Declining revenue trend')
      risks.push('Market volatility impact')
    } else {
      if (data.currentMonth?.income < 0) risks.push('Negative cash flow')
      risks.push('Working capital constraints')
      risks.push('Collection delays')
    }

    return risks
  }

  private static getTopOpportunities(data: any, type: string): string[] {
    const opportunities = []

    if (type === 'pnl') {
      if (data.currentMonth?.grossMargin > 40) opportunities.push('Scale operations efficiently')
      opportunities.push('Expand to new markets')
      opportunities.push('Optimize pricing strategy')
    } else {
      opportunities.push('Improve collection cycles')
      opportunities.push('Negotiate better terms')
      opportunities.push('Invest excess cash')
    }

    return opportunities
  }

  private static getExecutiveInsights(data: any, type: string): string {
    if (type === 'pnl') {
      const margin = data.currentMonth?.netMargin || 0
      const revenue = data.currentMonth?.revenue || 0
      return `Financial performance shows ${margin > 10 ? 'strong' : 'moderate'} profitability with ${this.formatCurrency(revenue)} in revenue. Focus on ${margin < 10 ? 'margin improvement' : 'growth acceleration'} for optimal results.`
    } else {
      const cashflow = data.currentMonth?.income || 0
      return `Cash flow ${cashflow > 0 ? 'remains positive' : 'requires attention'} at ${this.formatCurrency(cashflow)}. ${cashflow > 0 ? 'Maintain current operational efficiency' : 'Implement cash preservation strategies'} to optimize financial position.`
    }
  }

  private static getCompactForecasts(data: any, type: string): string[][] {
    const baseValue = type === 'pnl' ? data.currentMonth?.revenue : data.currentMonth?.income
    const forecasts = []

    for (let i = 1; i <= 3; i++) {
      const projected = baseValue * Math.pow(1.05, i) // 5% growth
      forecasts.push([
        `Month ${i}`,
        this.formatCurrency(projected),
        i === 1 ? 'High' : 'Medium'
      ])
    }

    return forecasts
  }

  private static getRecommendations(data: any, type: string): string[] {
    const recommendations = []

    if (type === 'pnl') {
      if (data.currentMonth?.grossMargin < 40) {
        recommendations.push('Optimize cost structure to improve margins')
      }
      recommendations.push('Accelerate revenue growth through market expansion')
      recommendations.push('Implement pricing optimization strategies')
      recommendations.push('Enhance operational efficiency programs')
    } else {
      recommendations.push('Optimize working capital management')
      recommendations.push('Accelerate receivables collection')
      recommendations.push('Implement cash flow forecasting')
      recommendations.push('Establish contingency funding sources')
    }

    return recommendations
  }

  private static shouldIncludeThirdPage(data: any, type: string): boolean {
    // Only include third page if there's significant data or YTD info
    return !!(data.yearToDate && (data.yearToDate.revenue > 0 || data.yearToDate.totalIncome > 0))
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

  private static calculateChange(current: number, previous: number): string {
    if (!previous || previous === 0) return ''
    const change = ((current - previous) / Math.abs(previous)) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  private static getTrend(current: number, previous?: number): string {
    if (!previous) return 'neutral'
    return current > previous ? 'positive' : current < previous ? 'negative' : 'neutral'
  }

  private static getTrendDirection(data: any, field: string): string {
    if (!data.currentMonth || !data.previousMonth) return 'neutral'
    const current = data.currentMonth[field]
    const previous = data.previousMonth[field]
    return current > previous ? 'up' : current < previous ? 'down' : 'neutral'
  }

  private static calculateGrowthRate(data: any): string {
    if (!data.previousMonth || !data.currentMonth) return 'N/A'
    const growth = ((data.currentMonth.revenue - data.previousMonth.revenue) / data.previousMonth.revenue) * 100
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
  }

  private static calculateBurnRate(data: any): string {
    if (!data.currentMonth || data.currentMonth.income >= 0) return 'Positive'
    return this.formatCurrency(Math.abs(data.currentMonth.income))
  }
}