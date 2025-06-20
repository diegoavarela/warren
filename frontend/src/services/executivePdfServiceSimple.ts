import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanyConfig } from './configurationService'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

interface ExecutivePDFOptions {
  company: CompanyConfig
  title: string
  data: any
  type: 'pnl' | 'cashflow'
}

interface PDFTheme {
  primary: string
  secondary: string
  accent: string
  success: string
  warning: string
  danger: string
  text: {
    primary: string
    secondary: string
    light: string
  }
  background: {
    primary: string
    secondary: string
    accent: string
  }
}

export class ExecutivePDFService {
  private static readonly FONTS = {
    HELVETICA: 'helvetica',
    TIMES: 'times',
    COURIER: 'courier'
  }

  private static getTheme(company: CompanyConfig): PDFTheme {
    const primaryColor = company.primaryColor || '#7CB342'
    const secondaryColor = company.secondaryColor || '#2E7D32'
    
    return {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      text: {
        primary: '#111827',
        secondary: '#4b5563',
        light: '#9ca3af'
      },
      background: {
        primary: '#ffffff',
        secondary: '#f9fafb',
        accent: '#f3f4f6'
      }
    }
  }

  public static async exportExecutiveReport(options: ExecutivePDFOptions): Promise<void> {
    const { company, title, data, type } = options
    const theme = this.getTheme(company)

    // Create PDF with high quality settings
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
      subject: `Executive ${type.toUpperCase()} Report`,
      author: company.name,
      keywords: 'executive, financial, report, analysis, dashboard',
      creator: 'Warren Executive Dashboard'
    })

    // Generate the complete report
    await this.createCoverPage(pdf, company, title, type, theme, data)
    
    pdf.addPage()
    await this.createExecutiveSummary(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createKPIDashboard(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createFinancialCharts(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createDetailedAnalysis(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createInsightsAndRecommendations(pdf, company, data, type, theme)

    // Add page numbers and footers
    this.addPageNumbersAndFooters(pdf, company, theme)

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${company.name.replace(/\s+/g, '_')}_Executive_${type.toUpperCase()}_Report_${timestamp}.pdf`
    pdf.save(filename)
  }

  private static async createCoverPage(
    pdf: jsPDF,
    company: CompanyConfig,
    title: string,
    type: string,
    theme: PDFTheme,
    data: any
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Add company logo if available
    if (company.logo) {
      try {
        pdf.addImage(company.logo, 'PNG', 20, 20, 40, 40)
      } catch (error) {
        console.warn('Failed to add logo to PDF:', error)
      }
    }

    // Title section
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text(title, pageWidth / 2, 80, { align: 'center' })

    // Subtitle
    pdf.setFontSize(16)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    const subtitle = type === 'pnl' ? 'Profit & Loss Analysis' : 'Cash Flow Analysis'
    pdf.text(subtitle, pageWidth / 2, 95, { align: 'center' })

    // Company name
    pdf.setFontSize(14)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(company.name, pageWidth / 2, 110, { align: 'center' })

    // Report metadata
    const metaY = 140
    const metaItems = [
      { label: 'Report Date', value: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })},
      { label: 'Period', value: this.getReportPeriod(data) },
      { label: 'Currency', value: `${company.defaultCurrency || company.currency || 'ARS'} (${company.defaultUnit || company.scale || 'thousands'})` },
      { label: 'Status', value: 'Final' }
    ]

    const metaWidth = (pageWidth - 80) / 2
    metaItems.forEach((item, index) => {
      const x = 40 + (index % 2) * metaWidth
      const y = metaY + 15 + Math.floor(index / 2) * 25
      
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      pdf.text(item.label.toUpperCase(), x, y)
      
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(...this.hexToRgb(theme.text.primary))
      pdf.text(item.value, x, y + 8)
    })
  }

  private static async createExecutiveSummary(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 30

    // Page title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Executive Summary', 20, yPos)
    yPos += 25

    // Key highlights
    const highlights = this.generateHighlights(data, type)
    
    highlights.forEach((highlight, index) => {
      // Create a card for each highlight
      this.drawCard(pdf, 20, yPos - 8, pageWidth - 40, 25, theme.background.secondary)
      
      // Highlight text
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(...this.hexToRgb(theme.text.primary))
      const lines = pdf.splitTextToSize(highlight, pageWidth - 60)
      pdf.text(lines, 30, yPos + 5)
      
      yPos += 35
    })
  }

  private static async createKPIDashboard(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 30

    // Page title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Key Performance Indicators', 20, yPos)
    yPos += 25

    // Get KPIs based on type
    const kpis = this.generateKPIs(data, type)
    
    // Draw KPIs in a 2x3 grid
    const cardWidth = (pageWidth - 70) / 2
    const cardHeight = 35

    kpis.forEach((kpi, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 20 + col * (cardWidth + 20)
      const y = yPos + row * (cardHeight + 15)

      // Draw KPI card
      this.drawCard(pdf, x, y, cardWidth, cardHeight, theme.background.secondary)
      
      // KPI title
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
      pdf.text(kpi.title, x + 10, y + 12)
      
      // KPI value
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(...this.hexToRgb(kpi.trend === 'up' ? theme.success : kpi.trend === 'down' ? theme.danger : theme.text.primary))
      pdf.text(kpi.value, x + 10, y + 25)
      
      // Trend indicator
      if (kpi.change) {
        pdf.setFont(this.FONTS.HELVETICA, 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(...this.hexToRgb(kpi.trend === 'up' ? theme.success : theme.danger))
        pdf.text(kpi.change, x + cardWidth - 30, y + 25, { align: 'right' })
      }
    })
  }

  private static async createFinancialCharts(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 30

    // Page title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Financial Trends', 20, yPos)
    yPos += 25

    // Draw simple trend charts using basic shapes
    if (data.chartData && data.chartData.length > 0) {
      // Revenue/Income trend
      this.drawSimpleChart(pdf, 20, yPos, pageWidth - 40, 60, data.chartData, type === 'pnl' ? 'revenue' : 'income', 'Revenue Trend', theme)
      yPos += 80

      // Profit/Cash Flow trend
      const profitField = type === 'pnl' ? 'netIncome' : 'income'
      this.drawSimpleChart(pdf, 20, yPos, pageWidth - 40, 60, data.chartData, profitField, type === 'pnl' ? 'Net Income Trend' : 'Cash Flow Trend', theme)
    }
  }

  private static async createDetailedAnalysis(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 30

    // Page title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Detailed Analysis', 20, yPos)
    yPos += 25

    // Create financial table
    if (data.currentMonth) {
      const tableData = this.generateTableData(data, type)
      
      pdf.autoTable({
        startY: yPos,
        head: [['Metric', 'Current Period', 'Previous Period', 'Change']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: this.hexToRgb(theme.primary),
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: this.hexToRgb(theme.text.primary)
        },
        alternateRowStyles: {
          fillColor: this.hexToRgb(theme.background.secondary)
        },
        margin: { left: 20, right: 20 }
      })
    }
  }

  private static async createInsightsAndRecommendations(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 30

    // Page title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Strategic Insights & Recommendations', 20, yPos)
    yPos += 25

    // Generate insights
    const insights = this.generateInsights(data, type)
    
    insights.forEach((insight, index) => {
      // Draw insight card
      this.drawCard(pdf, 20, yPos - 5, pageWidth - 40, 30, theme.background.secondary)
      
      // Priority badge
      const priorityColor = insight.priority === 'High' ? theme.danger : 
                           insight.priority === 'Medium' ? theme.warning : theme.success
      pdf.setFillColor(...this.hexToRgb(priorityColor))
      pdf.rect(25, yPos, 20, 8, 'F')
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(255, 255, 255)
      pdf.text(insight.priority, 35, yPos + 5, { align: 'center' })
      
      // Insight text
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(...this.hexToRgb(theme.text.primary))
      const lines = pdf.splitTextToSize(insight.text, pageWidth - 80)
      pdf.text(lines, 30, yPos + 15)
      
      yPos += 40
    })
  }

  // Helper methods
  private static drawCard(pdf: jsPDF, x: number, y: number, width: number, height: number, color: string): void {
    pdf.setFillColor(...this.hexToRgb(color))
    pdf.rect(x, y, width, height, 'F')
    pdf.setDrawColor(220, 220, 220)
    pdf.rect(x, y, width, height, 'S')
  }

  private static drawSimpleChart(
    pdf: jsPDF, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    data: any[], 
    field: string, 
    title: string, 
    theme: PDFTheme
  ): void {
    // Draw chart background
    this.drawCard(pdf, x, y, width, height, theme.background.secondary)
    
    // Chart title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(title, x + 10, y + 15)
    
    // Draw simple line chart
    if (data.length > 1) {
      const chartArea = {
        x: x + 20,
        y: y + 25,
        width: width - 40,
        height: height - 35
      }
      
      const values = data.map(d => d[field] || 0).filter(v => v > 0)
      if (values.length > 0) {
        const maxValue = Math.max(...values)
        const minValue = Math.min(...values)
        const range = maxValue - minValue || 1
        
        pdf.setLineWidth(2)
        pdf.setDrawColor(...this.hexToRgb(theme.primary))
        
        let prevX = chartArea.x
        let prevY = chartArea.y + chartArea.height - ((values[0] - minValue) / range * chartArea.height)
        
        for (let i = 1; i < values.length; i++) {
          const currentX = chartArea.x + (i / (values.length - 1)) * chartArea.width
          const currentY = chartArea.y + chartArea.height - ((values[i] - minValue) / range * chartArea.height)
          
          pdf.line(prevX, prevY, currentX, currentY)
          
          // Draw data point
          pdf.setFillColor(...this.hexToRgb(theme.primary))
          pdf.rect(currentX - 1, currentY - 1, 2, 2, 'F')
          
          prevX = currentX
          prevY = currentY
        }
      }
    }
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0]
  }

  private static addPageNumbersAndFooters(pdf: jsPDF, company: CompanyConfig, theme: PDFTheme): void {
    const pageCount = pdf.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Footer line
      pdf.setDrawColor(...this.hexToRgb(theme.text.light))
      pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)
      
      // Page number
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' })
      
      // Company name
      pdf.text(company.name, 20, pageHeight - 10)
      
      // Confidential notice
      pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 10, { align: 'center' })
    }
  }

  private static getReportPeriod(data: any): string {
    if (data.currentMonth?.month) {
      return data.currentMonth.month
    }
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  private static generateHighlights(data: any, type: string): string[] {
    const highlights = []
    
    if (type === 'pnl' && data.currentMonth) {
      highlights.push(`Revenue for the period reached ${this.formatCurrency(data.currentMonth.revenue)}, representing the company's core business performance.`)
      highlights.push(`Net income of ${this.formatCurrency(data.currentMonth.netIncome)} demonstrates ${data.currentMonth.netIncome > 0 ? 'profitability' : 'current losses'} in operations.`)
      highlights.push(`Gross margin of ${data.currentMonth.grossMargin?.toFixed(1)}% indicates ${data.currentMonth.grossMargin > 40 ? 'strong' : 'moderate'} pricing power and cost control.`)
    } else if (type === 'cashflow' && data.currentMonth) {
      highlights.push(`Current cash position provides ${data.currentMonth.income > 0 ? 'positive' : 'negative'} cash flow for the period.`)
      highlights.push(`Operating cash flow trends ${data.currentMonth.income > (data.previousMonth?.income || 0) ? 'improved' : 'declined'} compared to previous period.`)
    }
    
    return highlights
  }

  private static generateKPIs(data: any, type: string): any[] {
    const kpis = []
    
    if (type === 'pnl' && data.currentMonth) {
      const current = data.currentMonth
      const previous = data.previousMonth
      
      kpis.push({
        title: 'Revenue',
        value: this.formatCurrency(current.revenue),
        change: previous ? this.calculateChange(current.revenue, previous.revenue) : '',
        trend: previous ? (current.revenue > previous.revenue ? 'up' : 'down') : 'neutral'
      })
      
      kpis.push({
        title: 'Net Income',
        value: this.formatCurrency(current.netIncome),
        change: previous ? this.calculateChange(current.netIncome, previous.netIncome) : '',
        trend: previous ? (current.netIncome > previous.netIncome ? 'up' : 'down') : 'neutral'
      })
      
      kpis.push({
        title: 'Gross Margin',
        value: `${current.grossMargin?.toFixed(1)}%`,
        change: previous ? `${(current.grossMargin - previous.grossMargin).toFixed(1)}%` : '',
        trend: previous ? (current.grossMargin > previous.grossMargin ? 'up' : 'down') : 'neutral'
      })
      
      kpis.push({
        title: 'Operating Income',
        value: this.formatCurrency(current.operatingIncome),
        change: previous ? this.calculateChange(current.operatingIncome, previous.operatingIncome) : '',
        trend: previous ? (current.operatingIncome > previous.operatingIncome ? 'up' : 'down') : 'neutral'
      })
    }
    
    return kpis.slice(0, 6) // Limit to 6 KPIs
  }

  private static generateTableData(data: any, type: string): string[][] {
    const tableData = []
    
    if (type === 'pnl' && data.currentMonth) {
      const current = data.currentMonth
      const previous = data.previousMonth
      
      const metrics = [
        ['Revenue', current.revenue, previous?.revenue],
        ['Gross Profit', current.grossProfit, previous?.grossProfit],
        ['Operating Income', current.operatingIncome, previous?.operatingIncome],
        ['Net Income', current.netIncome, previous?.netIncome]
      ]
      
      metrics.forEach(([label, currentVal, previousVal]) => {
        const change = previousVal ? ((currentVal - previousVal) / previousVal * 100).toFixed(1) + '%' : 'N/A'
        tableData.push([
          label,
          this.formatCurrency(currentVal),
          previousVal ? this.formatCurrency(previousVal) : 'N/A',
          change
        ])
      })
    }
    
    return tableData
  }

  private static generateInsights(data: any, type: string): any[] {
    const insights = []
    
    if (type === 'pnl' && data.currentMonth) {
      const current = data.currentMonth
      
      if (current.grossMargin < 30) {
        insights.push({
          priority: 'High',
          text: 'Gross margin is below industry standards. Consider reviewing pricing strategy and cost structure to improve profitability.'
        })
      }
      
      if (current.netIncome < 0) {
        insights.push({
          priority: 'High',
          text: 'Current period shows negative net income. Focus on reducing operating expenses and increasing revenue streams.'
        })
      } else {
        insights.push({
          priority: 'Low',
          text: 'Positive net income indicates healthy operations. Consider reinvestment opportunities for growth.'
        })
      }
    }
    
    return insights
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  private static calculateChange(current: number, previous: number): string {
    const change = ((current - previous) / previous * 100)
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
  }
}