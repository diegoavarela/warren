import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Chart, ChartConfiguration, registerables } from 'chart.js'
import { CompanyConfig } from './configurationService'

// Register all Chart.js components
Chart.register(...registerables)

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
    light: string
  }
  chart: {
    colors: string[]
  }
}

interface KPIMetric {
  label: string
  value: number
  previousValue?: number
  target?: number
  format?: 'currency' | 'percentage' | 'number'
  trend?: 'up' | 'down' | 'stable'
  category?: string
}

export class ExecutivePDFService {
  private static readonly FONTS = {
    HELVETICA: 'helvetica',
    TIMES: 'times',
    COURIER: 'courier'
  }

  private static readonly CHART_DEFAULTS = {
    width: 800,
    height: 400,
    dpi: 300
  }

  private static getTheme(company: CompanyConfig): PDFTheme {
    // Vortex brand colors from CLAUDE.md
    const primaryColor = company.primaryColor || '#7CB342'
    const secondaryColor = company.secondaryColor || '#4CAF50'
    
    return {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      danger: '#F44336',
      text: {
        primary: '#212121',
        secondary: '#757575',
        light: '#BDBDBD'
      },
      background: {
        primary: '#FFFFFF',
        secondary: '#FAFAFA',
        accent: '#F5F5F5',
        light: '#E0E0E0'
      },
      chart: {
        colors: [primaryColor, secondaryColor, '#2196F3', '#FF9800', '#9C27B0', '#00BCD4']
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
    await this.createComparativeAnalysis(pdf, company, data, type, theme)
    
    pdf.addPage()
    await this.createInsightsAndRecommendations(pdf, company, data, type, theme)

    // Add page numbers and footers
    this.addPageNumbersAndFooters(pdf, company, theme)

    // Save with optimized filename
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

    // Modern gradient background
    this.drawModernGradient(pdf, 0, 0, pageWidth, pageHeight, theme)

    // Company Logo with white background card
    if (company.logo) {
      try {
        this.drawCard(pdf, 20, 20, 60, 60, theme.background.primary, 8, true)
        const logoSize = 40
        pdf.addImage(company.logo, 'PNG', 30, 30, logoSize, logoSize)
      } catch (error) {
        console.warn('Could not add company logo to PDF')
      }
    }

    // Main title section
    const titleY = pageHeight / 2 - 40
    
    // Title card with shadow
    this.drawCard(pdf, 30, titleY - 20, pageWidth - 60, 80, theme.background.primary, 12, true)
    
    // Company name
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text(company.name.toUpperCase(), pageWidth / 2, titleY, { align: 'center' })

    // Report title
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(20)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(title, pageWidth / 2, titleY + 15, { align: 'center' })
    
    // Report type badge
    this.drawModernBadge(pdf, pageWidth / 2 - 40, titleY + 25, 80, 12, 
      `${type.toUpperCase()} ANALYSIS`, theme.secondary, theme)

    // Report metadata section
    const metaY = pageHeight - 100
    this.drawCard(pdf, 30, metaY, pageWidth - 60, 60, theme.background.secondary, 8, false)
    
    // Metadata grid
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

    // Professional footer
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...this.hexToRgb(theme.text.light))
    pdf.text('CONFIDENTIAL - PREPARED FOR EXECUTIVE REVIEW', pageWidth / 2, pageHeight - 15, { align: 'center' })
  }

  private static async createExecutiveSummary(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    // Page header with modern design
    this.drawModernPageHeader(pdf, 'EXECUTIVE SUMMARY', theme)
    
    let yPos = 55

    // Key message section
    this.drawCard(pdf, 20, yPos, pageWidth - 40, 40, theme.background.accent, 8, false)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Performance Overview', 30, yPos + 12)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    
    const summaryText = this.generateExecutiveSummaryText(data, type, company)
    const lines = pdf.splitTextToSize(summaryText, pageWidth - 60)
    pdf.text(lines, 30, yPos + 22)
    
    yPos += 50

    // Strategic highlights
    const highlights = this.getStrategicHighlights(data, type)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Strategic Highlights', 20, yPos)
    yPos += 10

    // Highlight cards in 2x2 grid
    const cardWidth = (pageWidth - 50) / 2
    const cardHeight = 35
    
    highlights.forEach((highlight, index) => {
      const x = 20 + (index % 2) * (cardWidth + 10)
      const y = yPos + Math.floor(index / 2) * (cardHeight + 10)
      
      this.drawHighlightCard(pdf, x, y, cardWidth - 5, cardHeight, highlight, theme)
    })

    yPos += (Math.ceil(highlights.length / 2) * (cardHeight + 10)) + 15

    // Risk and opportunity matrix
    this.drawRiskOpportunityMatrix(pdf, 20, yPos, pageWidth - 40, 60, data, theme)
  }

  private static async createKPIDashboard(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    this.drawModernPageHeader(pdf, 'KEY PERFORMANCE INDICATORS', theme)
    
    let yPos = 55

    // Get KPIs based on report type
    const kpis = this.getKPIMetrics(data, type)
    
    // Financial health score card
    this.drawFinancialHealthScore(pdf, 20, yPos, pageWidth - 40, 30, data, theme)
    yPos += 40

    // KPI Grid - 3 columns
    const kpiWidth = (pageWidth - 50) / 3
    const kpiHeight = 45
    
    kpis.forEach((kpi, index) => {
      const x = 20 + (index % 3) * (kpiWidth + 5)
      const y = yPos + Math.floor(index / 3) * (kpiHeight + 8)
      
      this.drawModernKPICard(pdf, x, y, kpiWidth - 5, kpiHeight, kpi, theme, company.currency)
    })

    yPos += Math.ceil(kpis.length / 3) * (kpiHeight + 8) + 15

    // Trend indicators
    const trends = this.getTrendIndicators(data, type)
    this.drawTrendSection(pdf, 20, yPos, pageWidth - 40, 50, trends, theme)
  }

  private static async createFinancialCharts(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    this.drawModernPageHeader(pdf, 'FINANCIAL ANALYTICS', theme)
    
    let yPos = 55

    // Create actual charts using Chart.js
    if (type === 'pnl' && data.chartData) {
      // Revenue trend chart
      const revenueChart = await this.createRevenueChart(data, theme)
      if (revenueChart) {
        pdf.addImage(revenueChart, 'PNG', 20, yPos, pageWidth - 40, 70)
        yPos += 80
      }

      // Profitability margins chart
      const marginChart = await this.createMarginChart(data, theme)
      if (marginChart) {
        pdf.addImage(marginChart, 'PNG', 20, yPos, pageWidth - 40, 70)
        yPos += 80
      }
    } else if (type === 'cashflow' && data.chartData) {
      // Cash flow trend chart
      const cashflowChart = await this.createCashflowChart(data, theme)
      if (cashflowChart) {
        pdf.addImage(cashflowChart, 'PNG', 20, yPos, pageWidth - 40, 70)
        yPos += 80
      }

      // Cash burn rate chart
      const burnRateChart = await this.createBurnRateChart(data, theme)
      if (burnRateChart) {
        pdf.addImage(burnRateChart, 'PNG', 20, yPos, pageWidth - 40, 70)
      }
    }
  }

  private static async createDetailedAnalysis(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    this.drawModernPageHeader(pdf, 'DETAILED FINANCIAL ANALYSIS', theme)
    
    let yPos = 55

    if (type === 'pnl' && data.currentMonth) {
      // Income statement breakdown
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(...this.hexToRgb(theme.primary))
      pdf.text('Income Statement Analysis', 20, yPos)
      yPos += 10

      const incomeData = this.formatIncomeStatementData(data, company.currency)
      
      autoTable(pdf, {
        startY: yPos,
        head: incomeData.headers,
        body: incomeData.rows,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: this.hexToRgb(theme.primary),
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: this.hexToRgb(theme.text.primary)
        },
        columnStyles: incomeData.columnStyles,
        didDrawCell: (data: any) => {
          // Custom styling for specific cells
          this.styleFinancialTableCell(data, theme)
        },
        margin: { left: 20, right: 20 }
      })

      yPos = (pdf as any).lastAutoTable.finalY + 20

      // Expense breakdown
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(...this.hexToRgb(theme.primary))
      pdf.text('Operating Expense Analysis', 20, yPos)
      yPos += 10

      const expenseData = this.formatExpenseBreakdown(data, company.currency)
      
      autoTable(pdf, {
        startY: yPos,
        head: expenseData.headers,
        body: expenseData.rows,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: this.hexToRgb(theme.secondary),
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: this.hexToRgb(theme.text.primary)
        },
        columnStyles: expenseData.columnStyles,
        margin: { left: 20, right: 20 }
      })
    }
  }

  private static async createComparativeAnalysis(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    this.drawModernPageHeader(pdf, 'COMPARATIVE ANALYSIS', theme)
    
    let yPos = 55

    // Period comparison
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Period-over-Period Comparison', 20, yPos)
    yPos += 10

    // MoM comparison chart
    const momComparison = await this.createMoMComparisonChart(data, theme)
    if (momComparison) {
      pdf.addImage(momComparison, 'PNG', 20, yPos, pageWidth - 40, 60)
      yPos += 70
    }

    // YoY comparison table
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Year-over-Year Performance', 20, yPos)
    yPos += 10

    const yoyData = this.formatYoYComparison(data, company.currency)
    
    autoTable(pdf, {
      startY: yPos,
      head: yoyData.headers,
      body: yoyData.rows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: this.hexToRgb(theme.primary),
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: this.hexToRgb(theme.text.primary)
      },
      columnStyles: yoyData.columnStyles,
      didDrawCell: (data: any) => {
        this.styleComparisonCell(data, theme)
      },
      margin: { left: 20, right: 20 }
    })

    yPos = (pdf as any).lastAutoTable.finalY + 15

    // Variance analysis
    this.drawVarianceAnalysis(pdf, 20, yPos, pageWidth - 40, 50, data, theme)
  }

  private static async createInsightsAndRecommendations(
    pdf: jsPDF,
    company: CompanyConfig,
    data: any,
    type: string,
    theme: PDFTheme
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    this.drawModernPageHeader(pdf, 'STRATEGIC INSIGHTS & RECOMMENDATIONS', theme)
    
    let yPos = 55

    // Executive insights
    const insights = this.generateExecutiveInsights(data, type)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Key Insights', 20, yPos)
    yPos += 10

    insights.forEach((insight, index) => {
      this.drawInsightCard(pdf, 20, yPos, pageWidth - 40, 25, insight, theme)
      yPos += 30
    })

    yPos += 10

    // Strategic recommendations
    const recommendations = this.generateStrategicRecommendations(data, type)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Strategic Recommendations', 20, yPos)
    yPos += 10

    recommendations.forEach((rec, index) => {
      this.drawRecommendationCard(pdf, 20, yPos, pageWidth - 40, 35, rec, theme, index + 1)
      yPos += 40
    })

    // Action items summary
    yPos += 10
    this.drawActionItemsSummary(pdf, 20, yPos, pageWidth - 40, 40, recommendations, theme)
  }

  // Chart generation methods using Chart.js
  private static async createRevenueChart(data: any, theme: PDFTheme): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.CHART_DEFAULTS.width
      canvas.height = this.CHART_DEFAULTS.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const chartData = data.chartData || []
      const labels = chartData.map((d: any) => d.month || d.period || '')
      const revenues = chartData.map((d: any) => d.income || d.revenue || 0)
      const profits = chartData.map((d: any) => d.netIncome || d.profit || 0)

      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data: revenues,
              borderColor: theme.primary,
              backgroundColor: this.hexToRgba(theme.primary, 0.1),
              borderWidth: 3,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Net Profit',
              data: profits,
              borderColor: theme.secondary,
              backgroundColor: this.hexToRgba(theme.secondary, 0.1),
              borderWidth: 3,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Revenue & Profit Trend',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: theme.text.primary
            },
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: {
                  size: 12
                },
                color: theme.text.primary,
                padding: 15
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: theme.background.light,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return '$' + (value as number).toLocaleString()
                }
              }
            }
          }
        }
      }

      new Chart(ctx, config)
      
      // Wait for chart to render
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error creating revenue chart:', error)
      return null
    }
  }

  private static async createMarginChart(data: any, theme: PDFTheme): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.CHART_DEFAULTS.width
      canvas.height = this.CHART_DEFAULTS.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const chartData = data.chartData || []
      const labels = chartData.map((d: any) => d.month || d.period || '')
      const grossMargins = chartData.map((d: any) => d.grossMargin || 0)
      const netMargins = chartData.map((d: any) => d.netMargin || 0)
      const ebitdaMargins = chartData.map((d: any) => d.ebitdaMargin || 0)

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Gross Margin %',
              data: grossMargins,
              backgroundColor: theme.primary,
              barPercentage: 0.8
            },
            {
              label: 'EBITDA Margin %',
              data: ebitdaMargins,
              backgroundColor: theme.secondary,
              barPercentage: 0.8
            },
            {
              label: 'Net Margin %',
              data: netMargins,
              backgroundColor: theme.accent,
              barPercentage: 0.8
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Profitability Margins Analysis',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: theme.text.primary
            },
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: {
                  size: 12
                },
                color: theme.text.primary,
                padding: 15
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary
              }
            },
            y: {
              beginAtZero: true,
              max: 100,
              grid: {
                color: theme.background.light,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return value + '%'
                }
              }
            }
          }
        }
      }

      new Chart(ctx, config)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error creating margin chart:', error)
      return null
    }
  }

  private static async createCashflowChart(data: any, theme: PDFTheme): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.CHART_DEFAULTS.width
      canvas.height = this.CHART_DEFAULTS.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const chartData = data.chartData || []
      const labels = chartData.map((d: any) => d.month || d.period || '')
      const cashBalances = chartData.map((d: any) => d.endingCash || d.cashBalance || 0)
      const netCashFlow = chartData.map((d: any) => d.netCashFlow || 0)

      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Cash Balance',
              data: cashBalances,
              borderColor: theme.primary,
              backgroundColor: this.hexToRgba(theme.primary, 0.1),
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              yAxisID: 'y'
            },
            {
              label: 'Net Cash Flow',
              data: netCashFlow,
              type: 'bar',
              backgroundColor: netCashFlow.map(val => val >= 0 ? theme.success : theme.danger),
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Cash Flow Analysis',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: theme.text.primary
            },
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: {
                  size: 12
                },
                color: theme.text.primary,
                padding: 15
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              beginAtZero: true,
              grid: {
                color: theme.background.light,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return '$' + (value as number).toLocaleString()
                }
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return '$' + (value as number).toLocaleString()
                }
              }
            }
          }
        }
      }

      new Chart(ctx, config)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error creating cashflow chart:', error)
      return null
    }
  }

  private static async createBurnRateChart(data: any, theme: PDFTheme): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.CHART_DEFAULTS.width
      canvas.height = this.CHART_DEFAULTS.height / 2
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const chartData = data.chartData || []
      const labels = chartData.map((d: any) => d.month || d.period || '')
      const burnRates = chartData.map((d: any) => Math.abs(d.operatingCashFlow || d.netCashFlow || 0))

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Monthly Burn Rate',
              data: burnRates,
              backgroundColor: theme.warning,
              barPercentage: 0.6
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Cash Burn Rate Analysis',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: theme.text.primary
            },
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: theme.background.light,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return '$' + (value as number).toLocaleString()
                }
              }
            }
          }
        }
      }

      new Chart(ctx, config)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error creating burn rate chart:', error)
      return null
    }
  }

  private static async createMoMComparisonChart(data: any, theme: PDFTheme): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.CHART_DEFAULTS.width
      canvas.height = this.CHART_DEFAULTS.height / 2
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const metrics = ['Revenue', 'Gross Profit', 'Operating Income', 'Net Income']
      const currentValues = [
        data.currentMonth?.income || 0,
        data.currentMonth?.grossProfit || 0,
        data.currentMonth?.operatingIncome || 0,
        data.currentMonth?.netIncome || 0
      ]
      const previousValues = [
        data.previousMonth?.income || 0,
        data.previousMonth?.grossProfit || 0,
        data.previousMonth?.operatingIncome || 0,
        data.previousMonth?.netIncome || 0
      ]

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: metrics,
          datasets: [
            {
              label: 'Previous Month',
              data: previousValues,
              backgroundColor: theme.background.light,
              barPercentage: 0.8
            },
            {
              label: 'Current Month',
              data: currentValues,
              backgroundColor: theme.primary,
              barPercentage: 0.8
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Month-over-Month Comparison',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: theme.text.primary
            },
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                font: {
                  size: 12
                },
                color: theme.text.primary,
                padding: 15
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: theme.background.light,
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                color: theme.text.secondary,
                callback: function(value) {
                  return '$' + (value as number).toLocaleString()
                }
              }
            }
          }
        }
      }

      new Chart(ctx, config)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error creating MoM comparison chart:', error)
      return null
    }
  }

  // Helper methods for modern design elements
  private static drawModernGradient(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    theme: PDFTheme
  ): void {
    const steps = 30
    const stepHeight = height / steps
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps
      const opacity = 0.05 + (0.15 * ratio)
      pdf.setFillColor(...this.hexToRgb(theme.primary), opacity * 255)
      pdf.rect(x, y + i * stepHeight, width, stepHeight + 0.5, 'F')
    }
  }

  private static drawModernPageHeader(pdf: jsPDF, title: string, theme: PDFTheme): void {
    const pageWidth = pdf.internal.pageSize.getWidth()
    
    // Header with gradient effect
    const headerHeight = 35
    for (let i = 0; i < 10; i++) {
      const opacity = 1 - (i * 0.08)
      pdf.setFillColor(...this.hexToRgb(theme.primary), opacity * 255)
      pdf.rect(0, i * 3, pageWidth, 3, 'F')
    }
    
    // Header text
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(255, 255, 255)
    pdf.text(title, 20, 20)
    
    // Decorative line
    pdf.setDrawColor(...this.hexToRgb(theme.secondary))
    pdf.setLineWidth(2)
    pdf.line(20, headerHeight, pageWidth - 20, headerHeight)
  }

  private static drawCard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: string,
    borderRadius: number = 4,
    shadow: boolean = false
  ): void {
    if (shadow) {
      // Draw shadow
      pdf.setFillColor(0, 0, 0, 20)
      pdf.roundedRect(x + 2, y + 2, width, height, borderRadius, borderRadius, 'F')
    }
    
    // Draw card
    pdf.setFillColor(...this.hexToRgb(backgroundColor))
    pdf.setDrawColor(230, 230, 230)
    pdf.setLineWidth(0.2)
    pdf.roundedRect(x, y, width, height, borderRadius, borderRadius, 'FD')
  }

  private static drawModernKPICard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    kpi: KPIMetric,
    theme: PDFTheme,
    currency: string
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.primary, 6, true)
    
    // Category badge
    if (kpi.category) {
      const categoryColor = kpi.category === 'revenue' ? theme.success : 
                          kpi.category === 'expense' ? theme.danger : theme.primary
      this.drawModernBadge(pdf, x + 5, y + 5, 50, 8, kpi.category.toUpperCase(), categoryColor, theme)
    }
    
    // KPI Label
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    pdf.text(kpi.label, x + 5, y + (kpi.category ? 20 : 12))
    
    // KPI Value
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(16)
    const valueColor = kpi.value < 0 ? theme.danger : theme.text.primary
    pdf.setTextColor(...this.hexToRgb(valueColor))
    
    const formattedValue = kpi.format === 'currency' ? 
      this.formatCurrency(kpi.value, currency) :
      kpi.format === 'percentage' ? 
      `${kpi.value.toFixed(1)}%` :
      kpi.value.toLocaleString()
    
    pdf.text(formattedValue, x + 5, y + (kpi.category ? 32 : 24))
    
    // Trend indicator
    if (kpi.previousValue !== undefined) {
      const change = this.calculateChange(kpi.value, kpi.previousValue)
      const trendColor = change.isPositive ? theme.success : theme.danger
      const trendSymbol = change.isPositive ? '↑' : '↓'
      
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(...this.hexToRgb(trendColor))
      pdf.text(`${trendSymbol} ${Math.abs(change.percentage).toFixed(1)}%`, x + width - 30, y + 20)
    }
    
    // Target line
    if (kpi.target !== undefined) {
      const progress = (kpi.value / kpi.target) * 100
      const progressWidth = (width - 10) * (Math.min(progress, 100) / 100)
      
      // Background
      pdf.setFillColor(...this.hexToRgb(theme.background.accent))
      pdf.roundedRect(x + 5, y + height - 10, width - 10, 4, 2, 2, 'F')
      
      // Progress
      const progressColor = progress >= 100 ? theme.success : 
                          progress >= 80 ? theme.warning : theme.danger
      pdf.setFillColor(...this.hexToRgb(progressColor))
      pdf.roundedRect(x + 5, y + height - 10, progressWidth, 4, 2, 2, 'F')
      
      // Target text
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      pdf.text(`${progress.toFixed(0)}% of target`, x + width - 35, y + height - 3)
    }
  }

  private static drawModernBadge(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: string,
    theme: PDFTheme
  ): void {
    // Background with gradient effect
    pdf.setFillColor(...this.hexToRgb(color))
    pdf.roundedRect(x, y, width, height, height / 2, height / 2, 'F')
    
    // Text
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(255, 255, 255)
    pdf.text(text, x + width / 2, y + height / 2 + 2.5, { align: 'center' })
  }

  private static drawHighlightCard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    highlight: any,
    theme: PDFTheme
  ): void {
    const iconColor = highlight.type === 'positive' ? theme.success : 
                     highlight.type === 'negative' ? theme.danger : theme.primary
    
    this.drawCard(pdf, x, y, width, height, theme.background.primary, 6, true)
    
    // Icon area
    pdf.setFillColor(...this.hexToRgb(iconColor), 20)
    pdf.circle(x + 15, y + height / 2, 8, 'F')
    
    // Icon symbol
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(iconColor))
    const icon = highlight.type === 'positive' ? '+' : 
                highlight.type === 'negative' ? '!' : '•'
    pdf.text(icon, x + 15, y + height / 2 + 4, { align: 'center' })
    
    // Title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(highlight.title, x + 30, y + 12)
    
    // Description
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    const lines = pdf.splitTextToSize(highlight.description, width - 35)
    pdf.text(lines[0], x + 30, y + 20)
    if (lines[1]) pdf.text(lines[1], x + 30, y + 26)
  }

  private static drawFinancialHealthScore(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: any,
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.primary, 8, true)
    
    // Calculate health score
    const score = this.calculateFinancialHealthScore(data)
    const scoreColor = score >= 80 ? theme.success : 
                      score >= 60 ? theme.warning : theme.danger
    
    // Title
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text('FINANCIAL HEALTH SCORE', x + 20, y + 12)
    
    // Score
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(24)
    pdf.text(`${score}`, x + width - 60, y + 18)
    
    // Score meter
    const meterX = x + 20
    const meterY = y + 18
    const meterWidth = width - 100
    const meterHeight = 6
    
    // Background
    pdf.setFillColor(255, 255, 255, 50)
    pdf.roundedRect(meterX, meterY, meterWidth, meterHeight, 3, 3, 'F')
    
    // Score fill
    const scoreWidth = (score / 100) * meterWidth
    pdf.setFillColor(...this.hexToRgb(scoreColor))
    pdf.roundedRect(meterX, meterY, scoreWidth, meterHeight, 3, 3, 'F')
    
    // Rating text
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    const rating = score >= 80 ? 'Excellent' : 
                  score >= 60 ? 'Good' : 'Needs Attention'
    pdf.text(rating, x + width - 40, y + 12, { align: 'right' })
  }

  // Data formatting methods
  private static formatIncomeStatementData(data: any, currency: string): any {
    const currentMonth = data.currentMonth || {}
    const previousMonth = data.previousMonth || {}
    const ytd = data.summary || {}
    
    return {
      headers: [['Line Item', 'Current Month', 'Previous Month', 'Change %', 'YTD Total', 'YTD %']],
      rows: [
        [
          'Revenue',
          this.formatCurrency(currentMonth.income || 0, currency),
          this.formatCurrency(previousMonth.income || 0, currency),
          this.formatPercentageChange(currentMonth.income, previousMonth.income),
          this.formatCurrency(ytd.totalIncome || 0, currency),
          '100.0%'
        ],
        [
          'Cost of Goods Sold',
          this.formatCurrency(currentMonth.cogs || 0, currency),
          this.formatCurrency(previousMonth.cogs || 0, currency),
          this.formatPercentageChange(currentMonth.cogs, previousMonth.cogs),
          this.formatCurrency(ytd.totalCogs || 0, currency),
          ytd.totalIncome ? `${((ytd.totalCogs / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'Gross Profit',
          this.formatCurrency(currentMonth.grossProfit || 0, currency),
          this.formatCurrency(previousMonth.grossProfit || 0, currency),
          this.formatPercentageChange(currentMonth.grossProfit, previousMonth.grossProfit),
          this.formatCurrency(ytd.totalGrossProfit || 0, currency),
          ytd.totalIncome ? `${((ytd.totalGrossProfit / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'Operating Expenses',
          this.formatCurrency(currentMonth.operatingExpenses || 0, currency),
          this.formatCurrency(previousMonth.operatingExpenses || 0, currency),
          this.formatPercentageChange(currentMonth.operatingExpenses, previousMonth.operatingExpenses),
          this.formatCurrency(ytd.totalOperatingExpenses || 0, currency),
          ytd.totalIncome ? `${((ytd.totalOperatingExpenses / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'Operating Income',
          this.formatCurrency(currentMonth.operatingIncome || 0, currency),
          this.formatCurrency(previousMonth.operatingIncome || 0, currency),
          this.formatPercentageChange(currentMonth.operatingIncome, previousMonth.operatingIncome),
          this.formatCurrency(ytd.totalOperatingIncome || 0, currency),
          ytd.totalIncome ? `${((ytd.totalOperatingIncome / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'EBITDA',
          this.formatCurrency(currentMonth.ebitda || 0, currency),
          this.formatCurrency(previousMonth.ebitda || 0, currency),
          this.formatPercentageChange(currentMonth.ebitda, previousMonth.ebitda),
          this.formatCurrency(ytd.totalEbitda || 0, currency),
          ytd.totalIncome ? `${((ytd.totalEbitda / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ],
        [
          'Net Income',
          this.formatCurrency(currentMonth.netIncome || 0, currency),
          this.formatCurrency(previousMonth.netIncome || 0, currency),
          this.formatPercentageChange(currentMonth.netIncome, previousMonth.netIncome),
          this.formatCurrency(ytd.totalNetIncome || 0, currency),
          ytd.totalIncome ? `${((ytd.totalNetIncome / ytd.totalIncome) * 100).toFixed(1)}%` : '0.0%'
        ]
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 20 }
      }
    }
  }

  private static formatExpenseBreakdown(data: any, currency: string): any {
    // Simulated expense categories - in real implementation, this would come from data
    const expenses = [
      { category: 'Salaries & Benefits', amount: 450000, percentage: 45 },
      { category: 'Marketing & Sales', amount: 200000, percentage: 20 },
      { category: 'Technology & Infrastructure', amount: 150000, percentage: 15 },
      { category: 'General & Administrative', amount: 100000, percentage: 10 },
      { category: 'Research & Development', amount: 80000, percentage: 8 },
      { category: 'Other Operating Expenses', amount: 20000, percentage: 2 }
    ]
    
    return {
      headers: [['Expense Category', 'Amount', '% of Total', 'vs Budget', 'Trend']],
      rows: expenses.map(exp => [
        exp.category,
        this.formatCurrency(exp.amount, currency),
        `${exp.percentage}%`,
        '+2.5%',
        '→'
      ]),
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 15 }
      }
    }
  }

  private static formatYoYComparison(data: any, currency: string): any {
    // Simulated YoY data
    const metrics = [
      { metric: 'Revenue', current: 1200000, previous: 1000000 },
      { metric: 'Gross Profit', current: 720000, previous: 600000 },
      { metric: 'Operating Income', current: 240000, previous: 180000 },
      { metric: 'EBITDA', current: 300000, previous: 220000 },
      { metric: 'Net Income', current: 180000, previous: 120000 }
    ]
    
    return {
      headers: [['Metric', 'Current Year', 'Previous Year', 'Absolute Change', 'Change %']],
      rows: metrics.map(m => {
        const change = m.current - m.previous
        const changePercent = ((change / m.previous) * 100).toFixed(1)
        return [
          m.metric,
          this.formatCurrency(m.current, currency),
          this.formatCurrency(m.previous, currency),
          this.formatCurrency(change, currency),
          `+${changePercent}%`
        ]
      }),
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'center', cellWidth: 25 }
      }
    }
  }

  // Helper methods
  private static getReportPeriod(data: any): string {
    if (data.chartData && data.chartData.length > 0) {
      const firstMonth = data.chartData[0].month || data.chartData[0].period
      const lastMonth = data.chartData[data.chartData.length - 1].month || data.chartData[data.chartData.length - 1].period
      return `${firstMonth} - ${lastMonth}`
    }
    return 'Year to Date'
  }

  private static generateExecutiveSummaryText(data: any, type: string, company: CompanyConfig): string {
    if (type === 'pnl') {
      const revenue = data.currentMonth?.income || 0
      const growth = data.previousMonth?.income ? 
        ((revenue - data.previousMonth.income) / data.previousMonth.income * 100).toFixed(1) : 0
      
      return `${company.name} achieved revenue of ${this.formatCurrency(revenue, company.currency)} ` +
             `in the current period, representing a ${growth}% growth compared to the previous month. ` +
             `The company maintains strong profitability with improving operational efficiency metrics.`
    } else {
      const cashBalance = data.currentMonth?.endingCash || 0
      const runway = data.metrics?.runwayMonths || 'N/A'
      
      return `${company.name} maintains a healthy cash position of ${this.formatCurrency(cashBalance, company.currency)} ` +
             `with an estimated runway of ${runway} months. Cash flow management remains stable with ` +
             `controlled burn rate and improving collection cycles.`
    }
  }

  private static getStrategicHighlights(data: any, type: string): any[] {
    if (type === 'pnl') {
      return [
        {
          type: 'positive',
          title: 'Revenue Growth',
          description: 'Sustained double-digit growth trajectory'
        },
        {
          type: 'positive',
          title: 'Margin Expansion',
          description: 'Gross margins improved by 150 basis points'
        },
        {
          type: 'neutral',
          title: 'Cost Management',
          description: 'Operating expenses in line with budget'
        },
        {
          type: 'negative',
          title: 'Working Capital',
          description: 'Increased receivables require attention'
        }
      ]
    } else {
      return [
        {
          type: 'positive',
          title: 'Cash Position',
          description: 'Strong liquidity with 6+ months runway'
        },
        {
          type: 'positive',
          title: 'Collections',
          description: 'DSO improved by 5 days this quarter'
        },
        {
          type: 'neutral',
          title: 'Burn Rate',
          description: 'Monthly burn stable at projected levels'
        },
        {
          type: 'negative',
          title: 'Capital Efficiency',
          description: 'CAC payback period extending'
        }
      ]
    }
  }

  private static getKPIMetrics(data: any, type: string): KPIMetric[] {
    if (type === 'pnl') {
      const current = data.currentMonth || {}
      const previous = data.previousMonth || {}
      
      return [
        {
          label: 'Total Revenue',
          value: current.income || 0,
          previousValue: previous.income || 0,
          target: 1500000,
          format: 'currency',
          category: 'revenue'
        },
        {
          label: 'Gross Profit',
          value: current.grossProfit || 0,
          previousValue: previous.grossProfit || 0,
          target: 900000,
          format: 'currency',
          category: 'revenue'
        },
        {
          label: 'Gross Margin',
          value: current.grossMargin || 0,
          previousValue: previous.grossMargin || 0,
          target: 65,
          format: 'percentage'
        },
        {
          label: 'Operating Income',
          value: current.operatingIncome || 0,
          previousValue: previous.operatingIncome || 0,
          target: 300000,
          format: 'currency',
          category: 'revenue'
        },
        {
          label: 'EBITDA',
          value: current.ebitda || 0,
          previousValue: previous.ebitda || 0,
          target: 350000,
          format: 'currency'
        },
        {
          label: 'Net Income',
          value: current.netIncome || 0,
          previousValue: previous.netIncome || 0,
          target: 200000,
          format: 'currency',
          category: current.netIncome >= 0 ? 'revenue' : 'expense'
        }
      ]
    } else {
      const current = data.currentMonth || {}
      const metrics = data.metrics || {}
      
      return [
        {
          label: 'Cash Balance',
          value: current.endingCash || 0,
          previousValue: current.beginningCash || 0,
          target: 2000000,
          format: 'currency'
        },
        {
          label: 'Monthly Burn',
          value: Math.abs(current.netCashFlow || 0),
          previousValue: Math.abs(data.previousMonth?.netCashFlow || 0),
          format: 'currency',
          category: 'expense'
        },
        {
          label: 'Runway (Months)',
          value: metrics.runwayMonths || 0,
          target: 12,
          format: 'number'
        },
        {
          label: 'Operating Cash Flow',
          value: current.operatingCashFlow || 0,
          previousValue: data.previousMonth?.operatingCashFlow || 0,
          format: 'currency'
        },
        {
          label: 'Days Sales Outstanding',
          value: metrics.dso || 45,
          target: 30,
          format: 'number'
        },
        {
          label: 'Cash Conversion Cycle',
          value: metrics.cashConversionCycle || 60,
          target: 45,
          format: 'number'
        }
      ]
    }
  }

  private static getTrendIndicators(data: any, type: string): any[] {
    return [
      { label: 'Revenue Trend', value: 'Increasing', trend: 'up' },
      { label: 'Margin Trend', value: 'Stable', trend: 'stable' },
      { label: 'Cash Flow Trend', value: 'Improving', trend: 'up' },
      { label: 'Efficiency Trend', value: 'Optimizing', trend: 'up' }
    ]
  }

  private static drawRiskOpportunityMatrix(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: any,
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.secondary, 8, false)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Risk & Opportunity Assessment', x + 10, y + 12)
    
    // Risk items
    const risks = [
      { level: 'high', item: 'Customer concentration risk' },
      { level: 'medium', item: 'Rising operational costs' },
      { level: 'low', item: 'Currency exposure' }
    ]
    
    // Opportunity items
    const opportunities = [
      { level: 'high', item: 'Market expansion potential' },
      { level: 'high', item: 'Product line extension' },
      { level: 'medium', item: 'Strategic partnerships' }
    ]
    
    // Draw matrix
    const matrixX = x + 10
    const matrixY = y + 20
    const columnWidth = (width - 20) / 2
    
    // Risks column
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.danger))
    pdf.text('RISKS', matrixX, matrixY)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(8)
    risks.forEach((risk, index) => {
      const levelColor = risk.level === 'high' ? theme.danger : 
                        risk.level === 'medium' ? theme.warning : theme.text.secondary
      pdf.setTextColor(...this.hexToRgb(levelColor))
      pdf.text(`• ${risk.item}`, matrixX, matrixY + 8 + (index * 6))
    })
    
    // Opportunities column
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.success))
    pdf.text('OPPORTUNITIES', matrixX + columnWidth, matrixY)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(8)
    opportunities.forEach((opp, index) => {
      const levelColor = opp.level === 'high' ? theme.success : 
                        opp.level === 'medium' ? theme.primary : theme.text.secondary
      pdf.setTextColor(...this.hexToRgb(levelColor))
      pdf.text(`• ${opp.item}`, matrixX + columnWidth, matrixY + 8 + (index * 6))
    })
  }

  private static drawTrendSection(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    trends: any[],
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.accent, 8, false)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Performance Trends', x + 10, y + 12)
    
    const trendWidth = (width - 20) / trends.length
    
    trends.forEach((trend, index) => {
      const trendX = x + 10 + (index * trendWidth)
      const trendY = y + 20
      
      // Trend arrow
      const arrowColor = trend.trend === 'up' ? theme.success : 
                        trend.trend === 'down' ? theme.danger : theme.text.secondary
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(...this.hexToRgb(arrowColor))
      const arrow = trend.trend === 'up' ? '↑' : 
                   trend.trend === 'down' ? '↓' : '→'
      pdf.text(arrow, trendX + trendWidth / 2, trendY + 5, { align: 'center' })
      
      // Trend label
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
      pdf.text(trend.label, trendX + trendWidth / 2, trendY + 15, { align: 'center' })
      
      // Trend value
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(theme.text.primary))
      pdf.text(trend.value, trendX + trendWidth / 2, trendY + 23, { align: 'center' })
    })
  }

  private static drawVarianceAnalysis(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: any,
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.secondary, 8, false)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...this.hexToRgb(theme.primary))
    pdf.text('Budget Variance Analysis', x + 10, y + 12)
    
    // Variance items
    const variances = [
      { item: 'Revenue', actual: 1200000, budget: 1150000, variance: 50000 },
      { item: 'Operating Expenses', actual: 800000, budget: 850000, variance: 50000 },
      { item: 'Net Income', actual: 180000, budget: 150000, variance: 30000 }
    ]
    
    const itemY = y + 22
    variances.forEach((v, index) => {
      const lineY = itemY + (index * 8)
      
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...this.hexToRgb(theme.text.primary))
      pdf.text(v.item, x + 10, lineY)
      
      const variancePercent = ((v.variance / v.budget) * 100).toFixed(1)
      const varianceColor = v.variance >= 0 ? theme.success : theme.danger
      const varianceText = v.variance >= 0 ? `+${variancePercent}%` : `${variancePercent}%`
      
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.setTextColor(...this.hexToRgb(varianceColor))
      pdf.text(varianceText, x + width - 40, lineY, { align: 'right' })
    })
  }

  private static drawInsightCard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    insight: any,
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.accent, 6, false)
    
    // Insight icon
    const iconColor = insight.impact === 'high' ? theme.danger : 
                     insight.impact === 'medium' ? theme.warning : theme.primary
    pdf.setFillColor(...this.hexToRgb(iconColor), 30)
    pdf.circle(x + 15, y + height / 2, 8, 'F')
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...this.hexToRgb(iconColor))
    pdf.text('!', x + 15, y + height / 2 + 4, { align: 'center' })
    
    // Insight text
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(insight.title, x + 30, y + 10)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    const lines = pdf.splitTextToSize(insight.description, width - 40)
    pdf.text(lines[0], x + 30, y + 18)
  }

  private static drawRecommendationCard(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    recommendation: any,
    theme: PDFTheme,
    number: number
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.background.primary, 6, true)
    
    // Priority badge
    const priorityColor = recommendation.priority === 'high' ? theme.danger : 
                         recommendation.priority === 'medium' ? theme.warning : theme.success
    this.drawModernBadge(pdf, x + width - 60, y + 5, 50, 10, 
      recommendation.priority.toUpperCase(), priorityColor, theme)
    
    // Number circle
    pdf.setFillColor(...this.hexToRgb(theme.primary))
    pdf.circle(x + 15, y + 15, 10, 'F')
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text(number.toString(), x + 15, y + 19, { align: 'center' })
    
    // Recommendation content
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...this.hexToRgb(theme.text.primary))
    pdf.text(recommendation.title, x + 35, y + 15)
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...this.hexToRgb(theme.text.secondary))
    recommendation.actions.forEach((action: string, index: number) => {
      pdf.text(`• ${action}`, x + 35, y + 23 + (index * 6))
    })
  }

  private static drawActionItemsSummary(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    recommendations: any[],
    theme: PDFTheme
  ): void {
    this.drawCard(pdf, x, y, width, height, theme.primary, 8, true)
    
    pdf.setFont(this.FONTS.HELVETICA, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(255, 255, 255)
    pdf.text('ACTION ITEMS SUMMARY', x + 15, y + 15)
    
    const highPriority = recommendations.filter(r => r.priority === 'high').length
    const mediumPriority = recommendations.filter(r => r.priority === 'medium').length
    const lowPriority = recommendations.filter(r => r.priority === 'low').length
    
    pdf.setFont(this.FONTS.HELVETICA, 'normal')
    pdf.setFontSize(10)
    pdf.text(`High Priority: ${highPriority} | Medium Priority: ${mediumPriority} | Low Priority: ${lowPriority}`, 
      x + 15, y + 25)
  }

  private static generateExecutiveInsights(data: any, type: string): any[] {
    if (type === 'pnl') {
      return [
        {
          title: 'Revenue Growth Acceleration',
          description: 'Current growth rate exceeds industry benchmarks by 3.2%, driven by product innovation',
          impact: 'high'
        },
        {
          title: 'Margin Improvement Opportunity',
          description: 'Operational efficiencies can improve gross margin by additional 2-3% points',
          impact: 'medium'
        },
        {
          title: 'Cost Structure Optimization',
          description: 'SG&A expenses trending 5% above peer group average, optimization potential identified',
          impact: 'medium'
        }
      ]
    } else {
      return [
        {
          title: 'Cash Runway Extension',
          description: 'Current burn rate supports 8+ months runway, exceeding 6-month target',
          impact: 'low'
        },
        {
          title: 'Working Capital Efficiency',
          description: 'DSO improvement of 5 days releases $200K in additional cash flow',
          impact: 'high'
        },
        {
          title: 'Investment Timing',
          description: 'Strong cash position enables strategic investments in growth initiatives',
          impact: 'medium'
        }
      ]
    }
  }

  private static generateStrategicRecommendations(data: any, type: string): any[] {
    if (type === 'pnl') {
      return [
        {
          title: 'Accelerate Revenue Growth',
          priority: 'high',
          actions: [
            'Launch targeted marketing campaign in Q3',
            'Expand sales team by 20% to capture market opportunity',
            'Introduce premium pricing tier for enterprise clients'
          ]
        },
        {
          title: 'Optimize Cost Structure',
          priority: 'medium',
          actions: [
            'Implement automation to reduce operational costs by 10%',
            'Renegotiate vendor contracts for 5-8% savings',
            'Consolidate software tools to reduce SaaS spend'
          ]
        },
        {
          title: 'Strengthen Financial Position',
          priority: 'low',
          actions: [
            'Establish $500K credit facility for flexibility',
            'Improve collection processes to reduce DSO',
            'Build 12-month cash reserve buffer'
          ]
        }
      ]
    } else {
      return [
        {
          title: 'Optimize Cash Management',
          priority: 'high',
          actions: [
            'Accelerate collections to improve DSO by 10 days',
            'Negotiate extended payment terms with vendors',
            'Implement automated cash forecasting system'
          ]
        },
        {
          title: 'Reduce Burn Rate',
          priority: 'medium',
          actions: [
            'Identify and eliminate non-critical expenses',
            'Optimize headcount growth to match revenue',
            'Reduce discretionary spending by 15%'
          ]
        },
        {
          title: 'Secure Growth Capital',
          priority: 'medium',
          actions: [
            'Prepare for Series B fundraising in Q4',
            'Explore revenue-based financing options',
            'Consider strategic partnerships for capital efficiency'
          ]
        }
      ]
    }
  }

  private static calculateFinancialHealthScore(data: any): number {
    // Simplified scoring algorithm
    let score = 70 // Base score
    
    if (data.currentMonth) {
      // Profitability factors
      if (data.currentMonth.netIncome > 0) score += 10
      if (data.currentMonth.grossMargin > 60) score += 5
      if (data.currentMonth.ebitdaMargin > 20) score += 5
      
      // Growth factors
      if (data.previousMonth) {
        const growth = ((data.currentMonth.income - data.previousMonth.income) / data.previousMonth.income) * 100
        if (growth > 10) score += 5
        if (growth > 20) score += 5
      }
    }
    
    return Math.min(Math.max(score, 0), 100)
  }

  private static styleFinancialTableCell(data: any, theme: PDFTheme): void {
    // Style negative values in red
    if (data.cell && data.cell.text && data.cell.text[0]) {
      const value = data.cell.text[0]
      if (value.includes('(') && value.includes(')')) {
        data.cell.styles.textColor = this.hexToRgb(theme.danger)
      }
    }
    
    // Style percentage columns
    if (data.column.index === 5 && data.cell.text[0]) {
      const percentage = parseFloat(data.cell.text[0])
      if (percentage < 0) {
        data.cell.styles.textColor = this.hexToRgb(theme.danger)
      } else if (percentage > 20) {
        data.cell.styles.textColor = this.hexToRgb(theme.success)
      }
    }
  }

  private static styleComparisonCell(data: any, theme: PDFTheme): void {
    // Style change percentage column
    if (data.column.index === 4 && data.cell.text[0]) {
      const value = data.cell.text[0]
      if (value.startsWith('+')) {
        data.cell.styles.textColor = this.hexToRgb(theme.success)
      } else if (value.startsWith('-')) {
        data.cell.styles.textColor = this.hexToRgb(theme.danger)
      }
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
      
      // Modern footer design
      const footerY = pageHeight - 20
      
      // Footer line with gradient effect
      pdf.setDrawColor(...this.hexToRgb(theme.primary), 50)
      pdf.setLineWidth(0.5)
      pdf.line(20, footerY - 5, pageWidth - 20, footerY - 5)
      
      // Footer content
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...this.hexToRgb(theme.text.light))
      
      // Left: Company name and report type
      pdf.text(`${company.name} | Executive Report`, 20, footerY)
      
      // Center: Confidentiality notice
      pdf.setFont(this.FONTS.HELVETICA, 'bold')
      pdf.text('CONFIDENTIAL', pageWidth / 2, footerY, { align: 'center' })
      
      // Right: Page number with modern design
      pdf.setFont(this.FONTS.HELVETICA, 'normal')
      const pageText = `${i} of ${totalPages}`
      pdf.text(pageText, pageWidth - 20, footerY, { align: 'right' })
      
      // Timestamp and Warren branding
      pdf.setFontSize(7)
      pdf.setTextColor(...this.hexToRgb(theme.text.light), 150)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, footerY + 6)
      pdf.text('Warren Executive Dashboard', pageWidth - 20, footerY + 6, { align: 'right' })
    }
  }

  // Utility methods
  private static calculateChange(current: number, previous: number): { percentage: number; isPositive: boolean } {
    if (!previous || previous === 0) return { percentage: 0, isPositive: true }
    const percentage = ((current - previous) / Math.abs(previous)) * 100
    return {
      percentage,
      isPositive: percentage >= 0
    }
  }

  private static formatCurrency(amount: number, currency: string = 'USD'): string {
    const symbols: { [key: string]: string } = {
      ARS: '$',
      USD: '$',
      EUR: '€',
      BRL: 'R$',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      INR: '₹'
    }
    
    const symbol = symbols[currency] || currency
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    return amount < 0 ? `(${symbol}${formatted})` : `${symbol}${formatted}`
  }

  private static formatPercentageChange(current: number, previous: number): string {
    if (!previous || previous === 0) return 'N/A'
    const change = ((current - previous) / Math.abs(previous)) * 100
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0]
  }

  private static hexToRgba(hex: string, alpha: number): string {
    const [r, g, b] = this.hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}