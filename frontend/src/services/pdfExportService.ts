import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
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

    // Create a new PDF document in landscape mode for better dashboard display
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Set up colors from company branding
    const primaryColor = company.primaryColor || '#7CB342'
    const secondaryColor = company.secondaryColor || '#2E7D32'

    // Page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20

    await this.createCoverPage(pdf, company, title, type, primaryColor, secondaryColor)
    
    // Add new page for dashboard content
    pdf.addPage()
    await this.createDashboardPage(pdf, company, data, type, primaryColor, secondaryColor)

    // Add footer to all pages
    const totalPages = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      this.addFooter(pdf, company, i, totalPages)
    }

    // Save the PDF
    const filename = `${company.name.replace(/\s+/g, '_')}_${type}_report_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  }

  private static async createCoverPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    title: string, 
    type: string,
    primaryColor: string,
    secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Background gradient effect
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, pageHeight * 0.3, 'F')
    
    const secondaryRgb = this.hexToRgb(secondaryColor)
    pdf.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2])
    pdf.rect(0, pageHeight * 0.3, pageWidth, pageHeight * 0.1, 'F')

    // Company logo (if available)
    if (company.logo) {
      try {
        const logoData = await this.loadImage(company.logo)
        pdf.addImage(logoData, 'PNG', 30, 20, 40, 40)
      } catch (error) {
        console.warn('Could not load company logo for PDF')
      }
    }

    // ASCII Art Warren Logo
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(255, 255, 255)
    
    const warrenAscii = [
      '╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮',
      '│W││A││R││R││E││N│',
      '╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯'
    ]
    
    let yPos = 25
    warrenAscii.forEach(line => {
      pdf.text(line, pageWidth - 120, yPos)
      yPos += 8
    })

    // Title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(36)
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, 30, 80)

    // Company name
    pdf.setFontSize(24)
    pdf.setTextColor(255, 255, 255)
    pdf.text(company.name, 30, 100)

    // Report type and date
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(16)
    pdf.setTextColor(240, 240, 240)
    pdf.text(`${type.toUpperCase()} Financial Report`, 30, 115)
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 30, 125)

    // Company details section
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(30, 140, pageWidth - 60, 60, 5, 5, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(51, 51, 51)
    pdf.text('Company Information', 40, 155)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    let detailY = 165

    if (company.industry) {
      pdf.text(`Industry: ${company.industry}`, 40, detailY)
      detailY += 6
    }
    if (company.website) {
      pdf.text(`Website: ${company.website}`, 40, detailY)
      detailY += 6
    }
    if (company.email) {
      pdf.text(`Email: ${company.email}`, 40, detailY)
      detailY += 6
    }
    
    // Financial settings
    pdf.text(`Currency: ${company.currency} (in ${company.scale})`, 200, 165)
    if (company.address) {
      pdf.text(`Address: ${company.address}`, 200, 171)
    }
  }

  private static async createDashboardPage(
    pdf: jsPDF, 
    company: CompanyConfig, 
    data: any, 
    type: string,
    primaryColor: string,
    secondaryColor: string
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20

    // Page header
    const primaryRgb = this.hexToRgb(primaryColor)
    pdf.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2])
    pdf.rect(0, 0, pageWidth, 25, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(255, 255, 255)
    pdf.text(`${type.toUpperCase()} Dashboard - ${company.name}`, margin, 15)

    // Current date
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(new Date().toLocaleString(), pageWidth - 80, 15)

    let yPos = 40

    if (type === 'pnl' && data.currentMonth) {
      yPos = await this.renderPnLMetrics(pdf, data, yPos, primaryColor, secondaryColor, pageWidth, margin)
    } else if (type === 'cashflow' && data) {
      yPos = await this.renderCashflowMetrics(pdf, data, yPos, primaryColor, secondaryColor, pageWidth, margin)
    }

    // Summary section
    if (data.summary) {
      yPos = await this.renderSummarySection(pdf, data.summary, yPos, primaryColor, secondaryColor, pageWidth, margin)
    }
  }

  private static async renderPnLMetrics(
    pdf: jsPDF, 
    data: any, 
    startY: number, 
    primaryColor: string,
    secondaryColor: string,
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
    data: any, 
    startY: number, 
    primaryColor: string,
    secondaryColor: string,
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
    primaryColor: string,
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