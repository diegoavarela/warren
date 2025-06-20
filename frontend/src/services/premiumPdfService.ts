import { jsPDF } from 'jspdf'
import { CompanyConfig } from './configurationService'

interface PremiumPDFOptions {
  company: CompanyConfig
  title: string
  data: any
  type: 'pnl' | 'cashflow'
}

export class PremiumPDFService {
  private static readonly VORTEX_GREEN = '#7CB342'
  private static readonly DARK_GREEN = '#2E7D32'
  private static readonly LIGHT_GREEN = '#C8E6C9'
  private static readonly GRAY_DARK = '#37474F'
  private static readonly GRAY_LIGHT = '#ECEFF1'
  private static readonly WHITE = '#FFFFFF'

  public static async exportPremiumReport(options: PremiumPDFOptions): Promise<void> {
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
      title: `${company.name} - Premium Financial Report`,
      subject: `${type.toUpperCase()} Premium Analysis`,
      author: company.name,
      keywords: 'financial, premium, executive, dashboard',
      creator: 'Warren by Vortex'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Create the premium report
    this.createCoverPage(pdf, company, title, type, data, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createExecutiveDashboard(pdf, company, data, type, pageWidth, pageHeight)
    
    pdf.addPage()
    this.createFinancialBreakdown(pdf, company, data, type, pageWidth, pageHeight)

    // Add premium footer to all pages
    this.addPremiumFooters(pdf, company)

    // Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    const cleanName = company.name.replace(/[^a-zA-Z0-9]/g, '_')
    pdf.save(`${cleanName}_Premium_${type.toUpperCase()}_Report_${timestamp}.pdf`)
  }

  private static createCoverPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    title: string, 
    type: string, 
    data: any,
    pageWidth: number, 
    pageHeight: number
  ): void {
    // Premium gradient background effect
    pdf.setFillColor(247, 250, 252) // Very light blue-gray
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    // Green header band
    pdf.setFillColor(124, 179, 66) // Vortex green
    pdf.rect(0, 0, pageWidth, 60, 'F')

    // Company logo area (if available)
    if (company.logo) {
      try {
        pdf.addImage(company.logo, 'PNG', 20, 15, 30, 30)
      } catch (error) {
        // Fallback: Draw Vortex-style icon
        pdf.setFillColor(255, 255, 255)
        pdf.circle(35, 30, 12, 'F')
        pdf.setFillColor(124, 179, 66)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(255, 255, 255)
        pdf.text('V', 35, 33, { align: 'center' })
      }
    }

    // Company name in header
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(255, 255, 255)
    pdf.text(company.name, pageWidth - 25, 35, { align: 'right' })

    // Main title section
    pdf.setFillColor(255, 255, 255)
    pdf.rect(20, 80, pageWidth - 40, 80, 'F')
    
    // Add subtle shadow effect
    pdf.setFillColor(0, 0, 0, 0.1)
    pdf.rect(22, 82, pageWidth - 40, 80, 'F')
    pdf.setFillColor(255, 255, 255)
    pdf.rect(20, 80, pageWidth - 40, 80, 'F')

    // Report title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(55, 71, 79) // Dark gray
    const reportTitle = type === 'pnl' ? 'Profit & Loss Report' : 'Cash Flow Report'
    pdf.text(reportTitle, pageWidth / 2, 110, { align: 'center' })

    // Subtitle
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(14)
    pdf.setTextColor(124, 179, 66)
    pdf.text('Executive Financial Analysis', pageWidth / 2, 125, { align: 'center' })

    // Period information
    const period = this.getReportPeriod(data)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(55, 71, 79)
    pdf.text(period, pageWidth / 2, 145, { align: 'center' })

    // Key metrics preview cards
    this.createPreviewCards(pdf, data, type, pageWidth)

    // Report metadata
    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(124, 179, 66)
    pdf.text(`Generated on ${reportDate}`, pageWidth / 2, pageHeight - 40, { align: 'center' })
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(55, 71, 79)
    pdf.text('CONFIDENTIAL FINANCIAL REPORT', pageWidth / 2, pageHeight - 25, { align: 'center' })
  }

  private static createPreviewCards(pdf: jsPDF, data: any, type: string, pageWidth: number): void {
    if (!data.currentMonth) return

    const cardWidth = (pageWidth - 80) / 3
    const cardHeight = 45
    const startX = 40
    const startY = 180

    const metrics = this.getKeyMetrics(data, type)

    metrics.slice(0, 3).forEach((metric, index) => {
      const x = startX + index * (cardWidth + 20)
      
      // Card background
      pdf.setFillColor(255, 255, 255)
      pdf.rect(x, startY, cardWidth, cardHeight, 'F')
      
      // Card border
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.5)
      pdf.rect(x, startY, cardWidth, cardHeight, 'S')
      
      // Metric label
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(metric.label, x + cardWidth / 2, startY + 12, { align: 'center' })
      
      // Metric value
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(55, 71, 79)
      pdf.text(metric.value, x + cardWidth / 2, startY + 25, { align: 'center' })
      
      // Change indicator
      if (metric.change) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        const isPositive = metric.change.includes('+')
        pdf.setTextColor(isPositive ? 76 : 244, isPositive ? 175 : 67, isPositive ? 80 : 54) // Green or red
        pdf.text(metric.change, x + cardWidth / 2, startY + 37, { align: 'center' })
      }
    })
  }

  private static createExecutiveDashboard(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    // Page header
    this.addPageHeader(pdf, 'Executive Dashboard', pageWidth)
    
    let yPos = 50

    // KPI Grid
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Key Performance Indicators', 25, yPos)
    yPos += 15

    const metrics = this.getKeyMetrics(data, type)
    this.createKPIGrid(pdf, metrics, yPos, pageWidth)
    yPos += 80

    // Financial Summary Table
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Financial Summary', 25, yPos)
    yPos += 10

    this.createFinancialSummaryTable(pdf, data, type, yPos)
  }

  private static createFinancialBreakdown(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    pageWidth: number, 
    pageHeight: number
  ): void {
    // Page header
    this.addPageHeader(pdf, 'Detailed Financial Analysis', pageWidth)
    
    let yPos = 50

    // Current vs Previous Period
    if (data.currentMonth && data.previousMonth) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(55, 71, 79)
      pdf.text('Period Comparison', 25, yPos)
      yPos += 10

      this.createComparisonTable(pdf, data, type, yPos)
      yPos += 80
    }

    // Key Insights
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(55, 71, 79)
    pdf.text('Strategic Insights', 25, yPos)
    yPos += 15

    this.createInsightsSection(pdf, data, type, yPos, pageWidth)
  }

  private static createKPIGrid(pdf: jsPDF, metrics: any[], yPos: number, pageWidth: number): void {
    const cardWidth = (pageWidth - 80) / 3
    const cardHeight = 35

    metrics.forEach((metric, index) => {
      if (index >= 6) return // Limit to 6 KPIs
      
      const col = index % 3
      const row = Math.floor(index / 3)
      const x = 25 + col * (cardWidth + 15)
      const y = yPos + row * (cardHeight + 10)

      // Card background with gradient effect
      pdf.setFillColor(248, 251, 248) // Very light green
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      // Green accent bar
      pdf.setFillColor(124, 179, 66)
      pdf.rect(x, y, 3, cardHeight, 'F')
      
      // Metric label
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(metric.label, x + 8, y + 12)
      
      // Metric value
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(55, 71, 79)
      pdf.text(metric.value, x + 8, y + 22)
      
      // Change indicator
      if (metric.change) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        const isPositive = metric.change.includes('+')
        pdf.setTextColor(isPositive ? 76 : 244, isPositive ? 175 : 67, isPositive ? 80 : 54)
        pdf.text(metric.change, x + cardWidth - 8, y + 28, { align: 'right' })
      }
    })
  }

  private static createFinancialSummaryTable(pdf: jsPDF, data: any, type: string, yPos: number): void {
    if (!data.currentMonth) return

    const current = data.currentMonth
    const tableData: string[][] = []

    if (type === 'pnl') {
      tableData.push(
        ['Revenue', this.formatCurrency(current.revenue), this.formatPercentage(100)],
        ['Gross Profit', this.formatCurrency(current.grossProfit), this.formatPercentage(current.grossMargin)],
        ['Operating Income', this.formatCurrency(current.operatingIncome), this.formatPercentage(current.operatingMargin)],
        ['Net Income', this.formatCurrency(current.netIncome), this.formatPercentage(current.netMargin)]
      )
    } else {
      tableData.push(
        ['Total Cash Flow', this.formatCurrency(current.income), '-'],
        ['Operating Cash Flow', this.formatCurrency(current.income * 0.8), '-'],
        ['Investment Cash Flow', this.formatCurrency(current.income * 0.1), '-'],
        ['Financing Cash Flow', this.formatCurrency(current.income * 0.1), '-']
      )
    }

    this.drawCustomTable(
      pdf,
      ['Financial Item', 'Amount', 'Percentage'],
      tableData,
      yPos,
      25,
      160
    )
  }

  private static createComparisonTable(pdf: jsPDF, data: any, type: string, yPos: number): void {
    const current = data.currentMonth
    const previous = data.previousMonth
    const tableData: string[][] = []

    if (type === 'pnl') {
      const metrics = [
        ['Revenue', current.revenue, previous.revenue],
        ['Gross Profit', current.grossProfit, previous.grossProfit],
        ['Operating Income', current.operatingIncome, previous.operatingIncome],
        ['Net Income', current.netIncome, previous.netIncome]
      ]

      metrics.forEach(([label, currentVal, previousVal]) => {
        const change = this.calculatePercentageChange(currentVal, previousVal)
        tableData.push([
          label,
          this.formatCurrency(currentVal),
          this.formatCurrency(previousVal),
          change
        ])
      })
    }

    if (tableData.length > 0) {
      this.drawCustomTable(
        pdf,
        ['Metric', 'Current Period', 'Previous Period', 'Change'],
        tableData,
        yPos,
        25,
        160
      )
    }
  }

  private static createInsightsSection(pdf: jsPDF, data: any, type: string, yPos: number, pageWidth: number): void {
    const insights = this.generateInsights(data, type)
    
    insights.forEach((insight, index) => {
      // Insight card
      pdf.setFillColor(255, 255, 255)
      pdf.rect(25, yPos, pageWidth - 50, 25, 'F')
      
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.5)
      pdf.rect(25, yPos, pageWidth - 50, 25, 'S')
      
      // Priority indicator
      let priorityR: number, priorityG: number, priorityB: number
      if (insight.priority === 'High') {
        priorityR = 244; priorityG = 67; priorityB = 54
      } else if (insight.priority === 'Medium') {
        priorityR = 255; priorityG = 152; priorityB = 0
      } else {
        priorityR = 76; priorityG = 175; priorityB = 80
      }
      pdf.setFillColor(priorityR, priorityG, priorityB)
      pdf.rect(25, yPos, 5, 25, 'F')
      
      // Priority label
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(priorityR, priorityG, priorityB)
      pdf.text(insight.priority.toUpperCase(), 35, yPos + 8)
      
      // Insight text
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(55, 71, 79)
      const lines = pdf.splitTextToSize(insight.text, pageWidth - 80)
      pdf.text(lines, 35, yPos + 15)
      
      yPos += 35
    })
  }

  private static addPageHeader(pdf: jsPDF, title: string, pageWidth: number): void {
    // Header background
    pdf.setFillColor(248, 251, 248)
    pdf.rect(0, 0, pageWidth, 35, 'F')
    
    // Header title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(124, 179, 66)
    pdf.text(title, 25, 22)
    
    // Vortex branding
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(124, 179, 66)
    pdf.text('Warren by Vortex', pageWidth - 25, 22, { align: 'right' })
    
    // Header line
    pdf.setDrawColor(124, 179, 66)
    pdf.setLineWidth(2)
    pdf.line(25, 30, pageWidth - 25, 30)
  }

  private static addPremiumFooters(pdf: jsPDF, company: CompanyConfig): void {
    const pageCount = pdf.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Footer background
      pdf.setFillColor(248, 251, 248)
      pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F')
      
      // Footer line
      pdf.setDrawColor(124, 179, 66)
      pdf.setLineWidth(1)
      pdf.line(25, pageHeight - 22, pageWidth - 25, pageHeight - 22)
      
      // Company name
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(company.name, 25, pageHeight - 12)
      
      // Page number
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(124, 179, 66)
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 12, { align: 'right' })
      
      // Confidential notice
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 179, 66)
      pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 12, { align: 'center' })
    }
  }

  // Helper methods
  private static getKeyMetrics(data: any, type: string): any[] {
    if (!data.currentMonth) return []

    const current = data.currentMonth
    const previous = data.previousMonth

    if (type === 'pnl') {
      return [
        {
          label: 'Revenue',
          value: this.formatCurrency(current.revenue),
          change: previous ? this.calculatePercentageChange(current.revenue, previous.revenue) : null
        },
        {
          label: 'Gross Profit',
          value: this.formatCurrency(current.grossProfit),
          change: previous ? this.calculatePercentageChange(current.grossProfit, previous.grossProfit) : null
        },
        {
          label: 'Net Income',
          value: this.formatCurrency(current.netIncome),
          change: previous ? this.calculatePercentageChange(current.netIncome, previous.netIncome) : null
        },
        {
          label: 'Gross Margin',
          value: this.formatPercentage(current.grossMargin),
          change: previous ? `${(current.grossMargin - previous.grossMargin).toFixed(1)}%` : null
        },
        {
          label: 'Operating Income',
          value: this.formatCurrency(current.operatingIncome),
          change: previous ? this.calculatePercentageChange(current.operatingIncome, previous.operatingIncome) : null
        },
        {
          label: 'Net Margin',
          value: this.formatPercentage(current.netMargin),
          change: previous ? `${(current.netMargin - previous.netMargin).toFixed(1)}%` : null
        }
      ]
    } else {
      return [
        {
          label: 'Cash Flow',
          value: this.formatCurrency(current.income),
          change: previous ? this.calculatePercentageChange(current.income, previous.income) : null
        },
        {
          label: 'Cash Position',
          value: this.formatCurrency(current.income),
          change: null
        },
        {
          label: 'Monthly Change',
          value: previous ? this.formatCurrency(current.income - previous.income) : this.formatCurrency(0),
          change: null
        }
      ]
    }
  }

  private static generateInsights(data: any, type: string): any[] {
    const insights = []
    
    if (!data.currentMonth) return insights

    const current = data.currentMonth

    if (type === 'pnl') {
      // Revenue insights
      if (current.revenue > 1000000) {
        insights.push({
          priority: 'High',
          text: 'Strong revenue performance indicates healthy market demand and effective sales execution.'
        })
      }

      // Margin insights
      if (current.grossMargin < 30) {
        insights.push({
          priority: 'High',
          text: 'Gross margin below 30% suggests need for pricing optimization or cost reduction initiatives.'
        })
      } else if (current.grossMargin > 50) {
        insights.push({
          priority: 'Low',
          text: 'Excellent gross margin performance demonstrates strong pricing power and operational efficiency.'
        })
      }

      // Profitability insights
      if (current.netIncome < 0) {
        insights.push({
          priority: 'High',
          text: 'Negative net income requires immediate attention to expense management and revenue optimization.'
        })
      } else {
        insights.push({
          priority: 'Medium',
          text: 'Positive net income shows profitable operations. Consider reinvestment opportunities for growth.'
        })
      }
    } else {
      // Cash flow insights
      if (current.income > 0) {
        insights.push({
          priority: 'Low',
          text: 'Positive cash flow indicates healthy liquidity position and operational strength.'
        })
      } else {
        insights.push({
          priority: 'High',
          text: 'Negative cash flow requires immediate attention to improve cash generation and reduce burn rate.'
        })
      }
    }

    return insights.slice(0, 3) // Limit to 3 insights
  }

  private static getReportPeriod(data: any): string {
    if (data.currentMonth?.month) {
      return data.currentMonth.month
    }
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

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
        
        // Right align numbers (columns 1, 2, 3)
        if (colIndex > 0 && (cell.includes('$') || cell.includes('%') || cell.includes('+'))) {
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
}