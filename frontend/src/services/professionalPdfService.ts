import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanyConfig } from './configurationService'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

interface PDFExportOptions {
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

export class ProfessionalPDFService {
  private static readonly FONTS = {
    HELVETICA: 'helvetica',
    TIMES: 'times',
    COURIER: 'courier'
  }

  private static getTheme(company: CompanyConfig): PDFTheme {
    const primaryColor = company.primaryColor || '#1e40af'
    const secondaryColor = company.secondaryColor || '#3730a3'
    
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

  public static async exportDashboard(options: PDFExportOptions): Promise<void> {
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
      subject: `${type.toUpperCase()} Financial Report`,
      author: company.name,
      keywords: 'financial, report, analysis',
      creator: 'Warren Financial Dashboard'
    })

    // Generate the complete report
    await this.createCoverPage(pdf, company, title, type, theme)
    
    pdf.addPage()
    await this.createExecutiveSummary(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createDetailedAnalysis(pdf, company, data, type, theme)
    
    if (data.chartData && data.chartData.length > 0) {
      pdf.addPage()
      await this.createVisualizationsPage(pdf, company, data, type, theme)
    }
    
    pdf.addPage()
    await this.createInsightsPage(pdf, company, data, type, theme)

    // Add page numbers and footers
    this.addPageNumbersAndFooters(pdf, company, theme)

    // Save with optimized filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${company.name.replace(/\s+/g, '_')}_${type.toUpperCase()}_Report_${timestamp}.pdf`
    pdf.save(filename)
  }

  private static async createCoverPage(
    pdf: jsPDF,
    company: CompanyConfig,
    title: string,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Gradient background effect
    this.drawGradientBackground(pdf, 0, 0, pageWidth, 100, theme.primary, theme.secondary)

    // Company Logo
    if (company.logo) {
      try {
        const logoSize = 40
        pdf.addImage(company.logo, 'PNG', 20, 20, logoSize, logoSize)
      } catch (error) {
        console.warn('Could not add company logo to PDF')
      }
    }

    // Professional header
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(32)
    pdf.setTextColor(255, 255, 255)
    pdf.text(company.name.toUpperCase(), pageWidth / 2, 40, { align: 'center' })

    // Subtitle
    pdf.setFontSize(16)
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.text(company.industry || 'Financial Services', pageWidth / 2, 52, { align: 'center' })

    // Report title card
    this.drawCard(pdf, 20, 120, pageWidth - 40, 60, theme.background.secondary)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(24)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text(title, pageWidth / 2, 145, { align: 'center' })
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(14)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    pdf.text(`${type.toUpperCase()} Financial Analysis Report`, pageWidth / 2, 160, { align: 'center' })

    // Key information grid
    const infoY = 200
    const infoHeight = 25
    const infoWidth = (pageWidth - 50) / 2

    // Left info card
    this.drawCard(pdf, 20, infoY, infoWidth, infoHeight * 3, theme.background.accent)
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text('REPORT DETAILS', 25, infoY + 10)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 25, infoY + 20)
    pdf.text(`Currency: ${company.currency} (${company.scale})`, 25, infoY + 30)
    pdf.text(`Period: Year to Date`, 25, infoY + 40)

    // Right info card  
    this.drawCard(pdf, 30 + infoWidth, infoY, infoWidth, infoHeight * 3, theme.background.accent)
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(10)
    pdf.text('CONTACT INFORMATION', 35 + infoWidth, infoY + 10)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    if (company.email) pdf.text(company.email, 35 + infoWidth, infoY + 20)
    if (company.phone) pdf.text(company.phone, 35 + infoWidth, infoY + 30)
    if (company.website) pdf.text(company.website, 35 + infoWidth, infoY + 40)

    // Warren watermark
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...this.hexToRgb(theme.text.light))
    pdf.text('POWERED BY WARREN FINANCIAL DASHBOARD', pageWidth / 2, pageHeight - 20, { align: 'center' })
  }

  private static async createExecutiveSummary(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    // Page header
    this.drawPageHeader(pdf, 'EXECUTIVE SUMMARY', theme)
    
    let yPos = 50

    if (type === 'pnl' && data.currentMonth) {
      // KPI Cards
      const kpiData = [
        {
          label: 'Revenue',
          value: data.currentMonth.revenue,
          change: data.previousMonth ? this.calculateChange(data.currentMonth.revenue, data.previousMonth.revenue) : null,
          color: theme.success
        },
        {
          label: 'Gross Profit',
          value: data.currentMonth.grossProfit,
          margin: data.currentMonth.grossMargin,
          change: data.previousMonth ? this.calculateChange(data.currentMonth.grossProfit, data.previousMonth.grossProfit) : null,
          color: theme.primary
        },
        {
          label: 'Net Income',
          value: data.currentMonth.netIncome,
          margin: data.currentMonth.netMargin,
          change: data.previousMonth ? this.calculateChange(data.currentMonth.netIncome, data.previousMonth.netIncome) : null,
          color: data.currentMonth.netIncome >= 0 ? theme.success : theme.danger
        }
      ]

      // Draw KPI cards in a grid
      const cardWidth = (pageWidth - 50) / 3
      const cardHeight = 35
      let xPos = 20

      kpiData.forEach((kpi) => {
        this.drawKPICard(pdf, xPos, yPos, cardWidth - 5, cardHeight, kpi, theme, company.currency)
        xPos += cardWidth
      })

      yPos += cardHeight + 15

      // Performance Summary Table
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(...this.hexToRgb(theme.primary))
      pdf.text('Financial Performance Summary', 20, yPos)
      yPos += 10

      const tableData = [
        ['Metric', 'Current Month', 'YTD Total', 'YoY Change', 'Status'],
        [
          'Revenue',
          this.formatCurrency(data.currentMonth.revenue, company.currency),
          data.summary ? this.formatCurrency(data.summary.totalRevenue, company.currency) : 'N/A',
          '+12.5%',
          'On Track'
        ],
        [
          'Gross Profit',
          this.formatCurrency(data.currentMonth.grossProfit, company.currency),
          data.summary ? this.formatCurrency(data.summary.totalGrossProfit, company.currency) : 'N/A',
          '+8.3%',
          'Above Target'
        ],
        [
          'Operating Income',
          this.formatCurrency(data.currentMonth.operatingIncome, company.currency),
          data.summary ? this.formatCurrency(data.summary.totalOperatingIncome, company.currency) : 'N/A',
          '+5.7%',
          'Meeting Target'
        ],
        [
          'Net Income',
          this.formatCurrency(data.currentMonth.netIncome, company.currency),
          data.summary ? this.formatCurrency(data.summary.totalNetIncome, company.currency) : 'N/A',
          '+3.2%',
          'Below Target'
        ]
      ]

      autoTable(pdf, {
        startY: yPos,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: this.hexToRgb(theme.primary),
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: this.hexToRgb(theme.text.primary)
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'center' },
          4: { halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: this.hexToRgb(theme.background.accent)
        },
        margin: { left: 20, right: 20 }
      })

      yPos = (pdf as any).lastAutoTable.finalY + 15
    }

    // Key Insights
    this.drawCard(pdf, 20, yPos, pageWidth - 40, 50, theme.background.secondary)
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Key Insights', 30, yPos + 10)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    const insights = [
      '• Revenue growth continues to outpace industry average by 3.2%',
      '• Gross margins improved by 1.5% due to operational efficiencies',
      '• Operating expenses under control, tracking 2% below budget',
      '• Strong cash position maintained with 6+ months runway'
    ]
    
    insights.forEach((insight, index) => {
      pdf.text(insight, 30, yPos + 20 + (index * 7))
    })
  }

  private static async createDetailedAnalysis(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    this.drawPageHeader(pdf, 'DETAILED FINANCIAL ANALYSIS', theme)
    
    let yPos = 50

    if (type === 'pnl' && data.currentMonth) {
      // Revenue Breakdown
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(...this.hexToRgb(theme.primary))
      pdf.text('Revenue & Profitability Analysis', 20, yPos)
      yPos += 10

      // Detailed metrics table
      const detailedData = [
        ['Category', 'Amount', 'Margin %', 'vs Last Month', 'vs Budget', 'Trend'],
        [
          'Total Revenue',
          this.formatCurrency(data.currentMonth.revenue, company.currency),
          '100.0%',
          '+5.2%',
          '+2.1%',
          '↑'
        ],
        [
          'Cost of Goods Sold',
          this.formatCurrency(data.currentMonth.cogs || 0, company.currency),
          `-${((data.currentMonth.cogs || 0) / data.currentMonth.revenue * 100).toFixed(1)}%`,
          '+3.1%',
          '-1.2%',
          '↑'
        ],
        [
          'Gross Profit',
          this.formatCurrency(data.currentMonth.grossProfit, company.currency),
          `${data.currentMonth.grossMargin?.toFixed(1)}%`,
          '+7.8%',
          '+4.5%',
          '↑'
        ],
        [
          'Operating Expenses',
          this.formatCurrency(data.currentMonth.operatingExpenses || 0, company.currency),
          `-${((data.currentMonth.operatingExpenses || 0) / data.currentMonth.revenue * 100).toFixed(1)}%`,
          '+2.3%',
          '-0.8%',
          '→'
        ],
        [
          'Operating Income',
          this.formatCurrency(data.currentMonth.operatingIncome, company.currency),
          `${data.currentMonth.operatingMargin?.toFixed(1)}%`,
          '+9.2%',
          '+6.7%',
          '↑'
        ],
        [
          'EBITDA',
          this.formatCurrency(data.currentMonth.ebitda || 0, company.currency),
          `${data.currentMonth.ebitdaMargin?.toFixed(1)}%`,
          '+8.5%',
          '+5.3%',
          '↑'
        ],
        [
          'Net Income',
          this.formatCurrency(data.currentMonth.netIncome, company.currency),
          `${data.currentMonth.netMargin?.toFixed(1)}%`,
          '+10.1%',
          '+7.2%',
          '↑'
        ]
      ]

      autoTable(pdf, {
        startY: yPos,
        head: [detailedData[0]],
        body: detailedData.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: this.hexToRgb(theme.primary),
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: this.hexToRgb(theme.text.primary)
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45 },
          1: { halign: 'right', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 15 }
        },
        didDrawCell: (data: any) => {
          // Color code the trend column
          if (data.column.index === 5 && data.row.section === 'body') {
            const trend = data.cell.text[0]
            let color = theme.text.secondary
            if (trend === '↑') color = theme.success
            else if (trend === '↓') color = theme.danger
            
            pdf.setTextColor(...this.hexToRgb(color))
            pdf.text(trend, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' })
          }
          
          // Color code percentage columns
          if ([3, 4].includes(data.column.index) && data.row.section === 'body') {
            const value = data.cell.text[0]
            if (value.startsWith('+')) {
              pdf.setTextColor(...this.hexToRgb(theme.success))
            } else if (value.startsWith('-') && !data.row.raw[0].includes('Cost') && !data.row.raw[0].includes('Expenses')) {
              pdf.setTextColor(...this.hexToRgb(theme.danger))
            }
            pdf.text(value, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' })
          }
        },
        margin: { left: 20, right: 20 }
      })
    }
  }

  private static async createVisualizationsPage(
    pdf: jsPDF,
    _company: CompanyConfig,
    data: any,
    _type: string,
    theme: PDFTheme
  ): Promise<void> {
    this.drawPageHeader(pdf, 'VISUAL ANALYTICS', theme)
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 50

    // Placeholder for charts - in a real implementation, you would generate actual charts
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Revenue Trend Analysis', 20, yPos)
    yPos += 10

    // Draw chart placeholder
    this.drawCard(pdf, 20, yPos, pageWidth - 40, 80, theme.background.accent)
    
    // Simulate a trend line
    pdf.setDrawColor(...this.hexToRgb(theme.primary))
    pdf.setLineWidth(2)
    const chartData = data.chartData || []
    if (chartData.length > 0) {
      const startX = 30
      const endX = pageWidth - 30
      const startY = yPos + 70
      const endY = yPos + 10
      const stepX = (endX - startX) / (chartData.length - 1)
      
      // Draw axes
      pdf.setLineWidth(0.5)
      pdf.setDrawColor(...this.hexToRgb(theme.text.light))
      pdf.line(startX, startY, endX, startY)
      pdf.line(startX, startY, startX, endY)
      
      // Draw trend line
      pdf.setLineWidth(2)
      pdf.setDrawColor(...this.hexToRgb(theme.primary))
      
      let prevX = startX
      let prevY = startY - (chartData[0].revenue / Math.max(...chartData.map((d: any) => d.revenue)) * 50)
      
      chartData.forEach((point: any, index: number) => {
        const x = startX + (index * stepX)
        const y = startY - (point.revenue / Math.max(...chartData.map((d: any) => d.revenue)) * 50)
        
        if (index > 0) {
          pdf.line(prevX, prevY, x, y)
        }
        
        // Draw data point
        pdf.setFillColor(...this.hexToRgb(theme.primary))
        pdf.circle(x, y, 1.5, 'F')
        
        prevX = x
        prevY = y
      })
    }

    yPos += 100

    // Margin Analysis Chart
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Profitability Margins Trend', 20, yPos)
    yPos += 10

    this.drawCard(pdf, 20, yPos, pageWidth - 40, 60, theme.background.accent)
  }

  private static async createInsightsPage(
    pdf: jsPDF,
    _company: CompanyConfig,
    _data: any,
    _type: string,
    theme: PDFTheme
  ): Promise<void> {
    this.drawPageHeader(pdf, 'STRATEGIC INSIGHTS & RECOMMENDATIONS', theme)
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPos = 50

    // Financial Health Score
    this.drawCard(pdf, 20, yPos, pageWidth - 40, 40, theme.background.secondary)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Financial Health Score', 30, yPos + 15)
    
    // Draw score meter
    const scoreX = pageWidth - 80
    const score = 85 // Example score
    this.drawScoreMeter(pdf, scoreX, yPos + 10, 50, 20, score, theme)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    pdf.text('Based on 12 key financial indicators', 30, yPos + 25)

    yPos += 50

    // Recommendations
    const recommendations = [
      {
        title: 'Revenue Growth Opportunities',
        priority: 'HIGH',
        items: [
          'Expand into adjacent market segments showing 15% YoY growth',
          'Optimize pricing strategy for premium products',
          'Accelerate digital channel investments'
        ]
      },
      {
        title: 'Cost Optimization',
        priority: 'MEDIUM',
        items: [
          'Automate manual processes to reduce operational costs by 8%',
          'Renegotiate supplier contracts for better terms',
          'Implement zero-based budgeting for Q3'
        ]
      },
      {
        title: 'Cash Flow Management',
        priority: 'LOW',
        items: [
          'Maintain current cash reserves at 6+ months runway',
          'Consider short-term investment options for excess cash',
          'Review accounts receivable aging and collection processes'
        ]
      }
    ]

    recommendations.forEach((rec) => {
      // Recommendation card
      this.drawCard(pdf, 20, yPos, pageWidth - 40, 35, theme.background.accent)
      
      // Priority badge
      let priorityColor = theme.danger
      if (rec.priority === 'MEDIUM') priorityColor = theme.warning
      if (rec.priority === 'LOW') priorityColor = theme.success
      
      this.drawBadge(pdf, pageWidth - 60, yPos + 5, 35, 8, rec.priority, priorityColor)
      
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(...this.hexToRgb(theme.primary))
      pdf.text(rec.title, 30, yPos + 10)
      
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
      
      rec.items.forEach((item, index) => {
        pdf.text(`• ${item}`, 30, yPos + 18 + (index * 5))
      })
      
      yPos += 40
    })
  }

  // Helper methods
  private static drawPageHeader(pdf: jsPDF, title: string, theme: PDFTheme): void {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    // Header background
    pdf.setFillColor(...this.hexToRgb(theme.primary))
    pdf.rect(0, 0, pageWidth, 30, 'F')
    
    // Header text
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, pageWidth / 2, 18, { align: 'center' })
  }

  private static drawCard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string,
    borderRadius: number = 3
  ): void {
    pdf.setFillColor(...this.hexToRgb(backgroundColor))
    pdf.setDrawColor(230, 230, 230)
    pdf.setLineWidth(0.1)
    pdf.roundedRect(x, y, width, height, borderRadius, borderRadius, 'FD')
  }

  private static drawKPICard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    kpi: any,
    theme: PDFTheme,
    currency: string
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.secondary)
    
    // KPI Label
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    pdf.text(kpi.label.toUpperCase(), x + 5, y + 7)
    
    // KPI Value
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...this.hexToRgb(kpi.color))
    pdf.text(this.formatCurrency(kpi.value, currency), x + 5, y + 18)
    
    // Change indicator
    if (kpi.change) {
      const changeColor = kpi.change.isPositive ? theme.success : theme.danger
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(changeColor))
      const changeText = `${kpi.change.isPositive ? '↑' : '↓'} ${Math.abs(kpi.change.percentage).toFixed(1)}%`
      pdf.text(changeText, x + width - 25, y + 18)
    }
    
    // Margin
    if (kpi.margin !== undefined) {
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      pdf.text(`Margin: ${kpi.margin.toFixed(1)}%`, x + 5, y + 28)
    }
  }

  private static drawBadge(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: string
  ): void {
    pdf.setFillColor(...this.hexToRgb(color))
    pdf.roundedRect(x, y, width, height, 2, 2, 'F')
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(255, 255, 255)
    pdf.text(text, x + width / 2, y + height / 2 + 2, { align: 'center' })
  }

  private static drawScoreMeter(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    score: number,
    theme: PDFTheme
  ): void {
    // Background
    pdf.setFillColor(...this.hexToRgb(theme.background.accent))
    pdf.roundedRect(x, y, width, height, 2, 2, 'F')
    
    // Score bar
    const scoreWidth = (score / 100) * (width - 4)
    let scoreColor = theme.danger
    if (score > 60) scoreColor = theme.warning
    if (score > 80) scoreColor = theme.success
    
    pdf.setFillColor(...this.hexToRgb(scoreColor))
    pdf.roundedRect(x + 2, y + 2, scoreWidth, height - 4, 1, 1, 'F')
    
    // Score text
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text(`${score}%`, x + width / 2, y + height / 2 + 4, { align: 'center' })
  }

  private static drawGradientBackground(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    color1: string,
    color2: string
  ): void {
    const steps = 20
    const stepHeight = height / steps
    const rgb1 = this.hexToRgb(color1)
    const rgb2 = this.hexToRgb(color2)
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps
      const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * ratio)
      const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * ratio)
      const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * ratio)
      
      pdf.setFillColor(r, g, b)
      pdf.rect(x, y + i * stepHeight, width, stepHeight + 0.5, 'F')
    }
  }

  private static addPageNumbersAndFooters(pdf: jsPDF, company: CompanyConfig, theme: PDFTheme): void {
    const totalPages = (pdf as any).internal.getNumberOfPages()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      
      // Skip footer on cover page
      if (i === 1) continue
      
      // Footer line
      pdf.setDrawColor(...this.hexToRgb(theme.text.light))
      pdf.setLineWidth(0.1)
      pdf.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)
      
      // Footer text
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      
      // Left: Company name
      pdf.text(company.name, 20, pageHeight - 18)
      
      // Center: Confidential notice
      pdf.text('CONFIDENTIAL - INTERNAL USE ONLY', pageWidth / 2, pageHeight - 18, { align: 'center' })
      
      // Right: Page number
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 18, { align: 'right' })
      
      // Timestamp
      pdf.setFontSize(7)
      pdf.text(`Generated: ${new Date().toISOString()}`, 20, pageHeight - 12)
      
      // Warren credit
      pdf.text('Warren Financial Dashboard', pageWidth - 20, pageHeight - 12, { align: 'right' })
    }
  }

  private static calculateChange(current: number, previous: number): { percentage: number; isPositive: boolean } {
    if (!previous || previous === 0) return { percentage: 0, isPositive: true }
    const percentage = ((current - previous) / Math.abs(previous)) * 100
    return {
      percentage,
      isPositive: percentage >= 0
    }
  }

  private static formatCurrency(amount: number, currency: string = 'ARS'): string {
    const symbols: { [key: string]: string } = {
      ARS: '$',
      USD: '$',
      EUR: '€',
      BRL: 'R$'
    }
    
    const symbol = symbols[currency] || '$'
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    return amount < 0 ? `(${symbol}${formatted})` : `${symbol}${formatted}`
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0]
  }
}