import { jsPDF } from 'jspdf'
import { CompanyConfig } from './configurationService'

interface PDFExportOptions {
  company: CompanyConfig
  title: string
  data: any
  type: 'pnl' | 'cashflow'
}

export class PDFExportService {
  static async exportDashboard(options: PDFExportOptions): Promise<void> {
    const { company, title, data, type } = options

    // Create a new PDF document in portrait mode for professional reports
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Set up colors from company branding
    const primaryColor = company.primaryColor || '#7CB342'
    const secondaryColor = company.secondaryColor || '#2E7D32'

    // Page dimensions (defined but not used in main function)
    // const pageWidth = pdf.internal.pageSize.getWidth()
    // const pageHeight = pdf.internal.pageSize.getHeight()
    // const margin = 20

    // Create comprehensive report structure
    await this.createCoverPage(pdf, company, title, type, primaryColor, secondaryColor)
    
    // Executive Summary Page
    pdf.addPage()
    await this.createExecutiveSummary(pdf, company, data, type, primaryColor, secondaryColor)
    
    // Detailed Metrics Page
    pdf.addPage()
    await this.createDetailedMetrics(pdf, company, data, type, primaryColor, secondaryColor)
    
    // Charts and Visualizations Page
    if (data.chartData && data.chartData.length > 0) {
      pdf.addPage()
      await this.createChartsPage(pdf, company, data, type, primaryColor, secondaryColor)
    }
    
    // Financial Analysis Page
    pdf.addPage()
    await this.createAnalysisPage(pdf, company, data, type, primaryColor, secondaryColor)

    // Add footers to all pages
    const totalPages = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      this.addFooter(pdf, company, i, totalPages)
    }

    // Save the PDF
    const filename = `${company.name.replace(/\s+/g, '_')}_${type}_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  }

  private static async createCoverPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    title: string, 
    type: string,
    primaryColor: string,
    _secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()

    // Modern header section with company branding
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 80, 'F')

    // Company logo (top-left)
    if (company.logo) {
      try {
        const logoData = await this.loadImage(company.logo)
        pdf.addImage(logoData, 'PNG', 20, 15, 50, 50)
      } catch (error) {
        console.warn('Could not load company logo for PDF')
      }
    }

    // Warren ASCII logo (top-right)
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(255, 255, 255)
    const warrenAscii = [
      '╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮',
      '│W││A││R││R││E││N│',
      '╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯'
    ]
    let yPos = 25
    warrenAscii.forEach(line => {
      pdf.text(line, pageWidth - 80, yPos)
      yPos += 5
    })

    // Report title section
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 80, pageWidth, 60, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(51, 51, 51)
    pdf.text(title, 20, 110)
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(16)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text(`${type.toUpperCase()} Financial Analysis Report`, 20, 125)

    // Company information card
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(20, 160, pageWidth - 40, 80, 5, 5, 'F')
    pdf.setDrawColor(200, 200, 200)
    pdf.roundedRect(20, 160, pageWidth - 40, 80, 5, 5, 'S')

    // Company details
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(51, 51, 51)
    pdf.text(company.name, 30, 180)
    
    if (company.industry) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text(company.industry, 30, 190)
    }

    // Contact information in two columns
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    
    let leftY = 205
    let rightY = 205
    
    if (company.email) {
      pdf.text(`Email: ${company.email}`, 30, leftY)
      leftY += 6
    }
    if (company.phone) {
      pdf.text(`Phone: ${company.phone}`, 30, leftY)
      leftY += 6
    }
    if (company.website) {
      pdf.text(`Website: ${company.website}`, 30, leftY)
    }
    
    if (company.address) {
      pdf.text(`Address: ${company.address}`, pageWidth / 2 + 10, rightY)
      rightY += 6
    }
    pdf.text(`Currency: ${company.currency}`, pageWidth / 2 + 10, rightY)
    rightY += 6
    pdf.text(`Scale: ${company.scale}`, pageWidth / 2 + 10, rightY)

    // Report metadata
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Report Information', 20, 260)
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(80, 80, 80)
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 20, 275)
    pdf.text(`Report Type: ${type.toUpperCase()} Financial Analysis`, 20, 285)
    pdf.text(`Period: Year to Date Analysis`, 20, 295)
  }

  private static async createExecutiveSummary(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    primaryColor: string,
    _secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20

    // Page header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 30, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Executive Summary', margin, 20)

    let yPos = 50

    // Key Performance Indicators
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Key Performance Indicators', margin, yPos)
    yPos += 15

    if (type === 'pnl' && data.currentMonth) {
      // Revenue Performance
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 5, 5, 'F')
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(51, 51, 51)
      pdf.text('Revenue Performance', margin + 10, yPos + 15)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(24)
      pdf.setTextColor(data.currentMonth.revenue >= 0 ? 46 : 239, data.currentMonth.revenue >= 0 ? 125 : 68, data.currentMonth.revenue >= 0 ? 50 : 68)
      pdf.text(this.formatCurrency(data.currentMonth.revenue, company.currency), margin + 10, yPos + 35)
      
      // Month indicator
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`${data.currentMonth.month} ${new Date().getFullYear()}`, pageWidth - margin - 60, yPos + 15)
      
      yPos += 50

      // Profitability Metrics
      const metrics = [
        { label: 'Gross Profit', value: data.currentMonth.grossProfit, margin: data.currentMonth.grossMargin },
        { label: 'Operating Income', value: data.currentMonth.operatingIncome, margin: data.currentMonth.operatingMargin },
        { label: 'Net Income', value: data.currentMonth.netIncome, margin: data.currentMonth.netMargin }
      ]

      const cardWidth = (pageWidth - 2 * margin - 20) / 3
      let xPos = margin

      metrics.forEach((metric) => {
        pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2], 0.1)
        pdf.roundedRect(xPos, yPos, cardWidth, 35, 3, 3, 'F')
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(metric.label, xPos + 5, yPos + 10)
        
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.setTextColor(metric.value >= 0 ? 51 : 239, 51, metric.value >= 0 ? 51 : 68)
        pdf.text(this.formatCurrency(metric.value, company.currency), xPos + 5, yPos + 22)
        
        if (metric.margin !== undefined) {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(100, 100, 100)
          pdf.text(`${metric.margin.toFixed(1)}%`, xPos + 5, yPos + 30)
        }
        
        xPos += cardWidth + 10
      })
      
      yPos += 50
    }

    // Financial Health Indicators
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Financial Health Overview', margin, yPos)
    yPos += 15

    // Summary text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    const summaryText = `This executive summary provides a high-level overview of ${company.name}'s financial performance. The analysis covers key metrics including revenue trends, profitability indicators, and operational efficiency measures for informed decision making.`
    
    const lines = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin)
    lines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPos + (index * 6))
    })
  }

  private static async createDetailedMetrics(
    pdf: jsPDF, 
    _company: CompanyConfig, 
    data: any, 
    type: string,
    primaryColor: string,
    secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20

    // Page header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 30, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Detailed Financial Metrics', margin, 20)

    let yPos = 50

    if (type === 'pnl' && data.currentMonth) {
      // Detailed P&L breakdown
      await this.renderDetailedPnL(pdf, data, yPos, primaryColor, secondaryColor, pageWidth, margin)
    } else if (type === 'cashflow' && data) {
      // Detailed cashflow breakdown
      await this.renderDetailedCashflow(pdf, data, yPos, primaryColor, secondaryColor, pageWidth, margin)
    }
  }

  private static async createChartsPage(
    pdf: jsPDF, 
    _company: CompanyConfig, 
    _data: any, 
    _type: string,
    primaryColor: string,
    _secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20

    // Page header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 30, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Visual Analytics', margin, 20)

    let yPos = 50

    // Placeholder for chart implementation
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(100, 100, 100)
    
    // Chart placeholder box using pageWidth for layout
    pdf.setDrawColor(200, 200, 200)
    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 60, 5, 5, 'FD')
    
    pdf.text('Chart visualizations will be rendered here', margin + 10, yPos + 15)
    pdf.text('This page will contain:', margin + 10, yPos + 30)
    pdf.text('• Trend analysis charts', margin + 20, yPos + 45)
    
    yPos += 80
    pdf.text('• Performance comparison graphs', margin + 20, yPos)
    pdf.text('• Key metric visualizations', margin + 20, yPos + 15)
  }

  private static async createAnalysisPage(
    pdf: jsPDF, 
    _company: CompanyConfig, 
    _data: any, 
    _type: string,
    primaryColor: string,
    _secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20

    // Page header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 30, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Financial Analysis & Insights', margin, 20)

    let yPos = 50

    // Key insights section
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Key Financial Insights', margin, yPos)
    yPos += 15

    // Analysis content
    const insights = [
      'Revenue growth analysis and trend identification',
      'Profitability margin evaluation and benchmarking',
      'Cost structure optimization opportunities',
      'Cash flow pattern analysis and forecasting',
      'Risk assessment and mitigation strategies'
    ]

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)

    insights.forEach((insight, index) => {
      pdf.text(`• ${insight}`, margin, yPos + (index * 12))
    })

    yPos += insights.length * 12 + 20

    // Recommendations section
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Strategic Recommendations', margin, yPos)
    yPos += 15

    const recommendations = [
      'Focus on high-margin revenue streams to improve profitability',
      'Monitor expense categories for cost optimization opportunities',
      'Maintain healthy cash reserves for operational stability',
      'Implement regular financial performance monitoring',
      'Consider strategic investments based on cash flow projections'
    ]

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)

    recommendations.forEach((rec, index) => {
      const recLines = pdf.splitTextToSize(`• ${rec}`, pageWidth - 2 * margin)
      recLines.forEach((line: string, lineIndex: number) => {
        pdf.text(line, margin, yPos + (index * 18) + (lineIndex * 6))
      })
    })
  }

  private static async renderPnLMetrics(
    pdf: jsPDF, 
    data: any, 
    startY: number, 
    primaryColor: string,
    _secondaryColor: string,
    pageWidth: number,
    margin: number
  ): Promise<number> {
    const currentMonth = data.currentMonth
    let yPos = startY

    // Section header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text(`${currentMonth.month} P&L Overview`, margin + 5, yPos + 8)
    yPos += 20

    // Create metrics grid
    const metrics = [
      { label: 'Revenue', value: currentMonth.revenue, format: 'currency' },
      { label: 'Gross Profit', value: currentMonth.grossProfit, format: 'currency', percentage: currentMonth.grossMargin },
      { label: 'Operating Income', value: currentMonth.operatingIncome, format: 'currency', percentage: currentMonth.operatingMargin },
      { label: 'EBITDA', value: currentMonth.ebitda, format: 'currency', percentage: currentMonth.ebitdaMargin },
      { label: 'Net Income', value: currentMonth.netIncome, format: 'currency', percentage: currentMonth.netMargin }
    ]

    const cardWidth = (pageWidth - 2 * margin - 20) / 3
    const cardHeight = 25
    let xPos = margin
    let currentRow = 0

    metrics.forEach((metric, index) => {
      if (index > 0 && index % 3 === 0) {
        currentRow++
        xPos = margin
        yPos += cardHeight + 5
      }

      // Draw metric card
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F')
      
      pdf.setDrawColor(200, 200, 200)
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'S')

      // Metric label
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(metric.label, xPos + 3, yPos + 8)

      // Metric value
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(metric.value >= 0 ? 51 : 239, 51, metric.value >= 0 ? 51 : 68)
      const formattedValue = this.formatCurrency(metric.value, currentMonth.currency || 'ARS')
      pdf.text(formattedValue, xPos + 3, yPos + 18)

      // Percentage (if available)
      if (metric.percentage !== undefined) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`${metric.percentage.toFixed(1)}%`, xPos + cardWidth - 25, yPos + 8)
      }

      xPos += cardWidth + 10
    })

    return yPos + cardHeight + 15
  }

  private static async renderCashflowMetrics(
    pdf: jsPDF, 
    _data: any, 
    startY: number, 
    primaryColor: string,
    _secondaryColor: string,
    pageWidth: number,
    margin: number
  ): Promise<number> {
    let yPos = startY

    // Section header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Cash Flow Overview', margin + 5, yPos + 8)
    yPos += 20

    // Add cash flow specific content here
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(51, 51, 51)
    pdf.text('Cash flow metrics will be displayed here', margin, yPos)

    return yPos + 30
  }

  private static async renderSummarySection(
    pdf: jsPDF, 
    summary: any, 
    startY: number, 
    _primaryColor: string,
    secondaryColor: string,
    pageWidth: number,
    margin: number
  ): Promise<number> {
    let yPos = startY

    // Section header
    const secondaryRgb = this.hexToRgb(secondaryColor)
    pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2])
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Year to Date Summary', margin + 5, yPos + 8)
    yPos += 20

    // Summary metrics
    const summaryMetrics = [
      { label: 'Total Revenue', value: summary.totalRevenue },
      { label: 'Total Gross Profit', value: summary.totalGrossProfit },
      { label: 'Total Operating Income', value: summary.totalOperatingIncome },
      { label: 'Total Net Income', value: summary.totalNetIncome }
    ]

    const cardWidth = (pageWidth - 2 * margin - 15) / 2
    const cardHeight = 20
    let xPos = margin

    summaryMetrics.forEach((metric, index) => {
      if (index > 0 && index % 2 === 0) {
        xPos = margin
        yPos += cardHeight + 5
      }

      // Draw summary card
      const secondaryRgb = this.hexToRgb(secondaryColor)
      pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2], 0.1)
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F')
      
      pdf.setDrawColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2])
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'S')

      // Metric info
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text(metric.label, xPos + 3, yPos + 8)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(51, 51, 51)
      pdf.text(this.formatCurrency(metric.value, 'ARS'), xPos + 3, yPos + 16)

      xPos += cardWidth + 5
    })

    return yPos + cardHeight + 15
  }

  private static async renderDetailedPnL(
    pdf: jsPDF, 
    data: any, 
    startY: number, 
    primaryColor: string,
    _secondaryColor: string,
    pageWidth: number,
    margin: number
  ): Promise<number> {
    let yPos = startY
    const currentMonth = data.currentMonth

    // Detailed revenue breakdown
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Revenue Analysis', margin, yPos)
    yPos += 15

    // Revenue details table
    const revenueData = [
      ['Metric', 'Current Month', 'YTD Total', 'Margin %'],
      ['Total Revenue', this.formatCurrency(currentMonth.revenue, currentMonth.currency), 'N/A', '100.0%'],
      ['Gross Profit', this.formatCurrency(currentMonth.grossProfit, currentMonth.currency), 'N/A', `${currentMonth.grossMargin?.toFixed(1) || '0.0'}%`],
      ['Operating Income', this.formatCurrency(currentMonth.operatingIncome, currentMonth.currency), 'N/A', `${currentMonth.operatingMargin?.toFixed(1) || '0.0'}%`],
      ['Net Income', this.formatCurrency(currentMonth.netIncome, currentMonth.currency), 'N/A', `${currentMonth.netMargin?.toFixed(1) || '0.0'}%`]
    ]

    this.drawTable(pdf, revenueData, margin, yPos, pageWidth - 2 * margin, primaryColor)
    yPos += (revenueData.length * 8) + 20

    return yPos
  }

  private static async renderDetailedCashflow(
    pdf: jsPDF, 
    _data: any, 
    startY: number, 
    primaryColor: string,
    _secondaryColor: string,
    pageWidth: number,
    margin: number
  ): Promise<number> {
    let yPos = startY

    // Cashflow breakdown
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.text('Cash Flow Analysis', margin, yPos)
    yPos += 15

    // Add placeholder content using pageWidth for layout
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    const placeholderText = 'Detailed cash flow metrics and trends would be displayed here'
    const textLines = pdf.splitTextToSize(placeholderText, pageWidth - 2 * margin)
    textLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPos + (index * 6))
    })
    yPos += textLines.length * 6 + 20

    return yPos
  }

  private static drawTable(
    pdf: jsPDF,
    data: string[][],
    startX: number,
    startY: number,
    tableWidth: number,
    primaryColor: string
  ): void {
    const rowHeight = 8
    const colWidth = tableWidth / data[0].length
    const primaryRgb = this.hexToRgb(primaryColor)

    data.forEach((row, rowIndex) => {
      const yPos = startY + (rowIndex * rowHeight)
      
      // Header row styling
      if (rowIndex === 0) {
        pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
        pdf.rect(startX, yPos - 2, tableWidth, rowHeight, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
      } else {
        // Alternating row colors
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(startX, yPos - 2, tableWidth, rowHeight, 'F')
        }
        pdf.setTextColor(51, 51, 51)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
      }

      // Draw cell content
      row.forEach((cell, colIndex) => {
        const xPos = startX + (colIndex * colWidth) + 2
        pdf.text(cell, xPos, yPos + 4)
      })

      // Draw row border
      pdf.setDrawColor(200, 200, 200)
      pdf.line(startX, yPos + rowHeight - 2, startX + tableWidth, yPos + rowHeight - 2)
    })

    // Draw table border
    pdf.setDrawColor(200, 200, 200)
    pdf.rect(startX, startY - 2, tableWidth, data.length * rowHeight, 'S')
  }

  private static addFooter(pdf: jsPDF, company: CompanyConfig, pageNum: number, totalPages: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Footer line
    pdf.setDrawColor(200, 200, 200)
    pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)

    // Footer text
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    
    // Left side - Generated by Warren
    pdf.text('Generated by Warren Financial Dashboard', 20, pageHeight - 12)
    
    // Center - Company name
    const companyText = company.name
    const textWidth = pdf.getTextWidth(companyText)
    pdf.text(companyText, (pageWidth - textWidth) / 2, pageHeight - 12)
    
    // Right side - Page number
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 40, pageHeight - 12)
    
    // Date and time
    pdf.text(new Date().toLocaleString(), 20, pageHeight - 6)
  }

  private static formatCurrency(amount: number, currency: string = 'ARS'): string {
    const currencySymbols: { [key: string]: string } = {
      'ARS': '$',
      'USD': '$',
      'EUR': '€',
      'BRL': 'R$'
    }

    const symbol = currencySymbols[currency] || '$'
    return `${symbol}${Math.abs(amount).toLocaleString()}`
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [124, 179, 66] // Default green
  }

  private static async loadImage(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        resolve(canvas.toDataURL())
      }
      img.onerror = reject
      img.src = src
    })
  }
}