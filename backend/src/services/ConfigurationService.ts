import { Buffer } from 'buffer'
import * as ExcelJS from 'exceljs'
import { logger } from '../utils/logger'

interface CompanyConfig {
  id: string
  name: string
  currency: string
  scale: string
  isActive: boolean
  createdAt: string
  lastUpdated?: string
  excelStructure?: ExcelStructure
}

interface ExcelStructure {
  worksheetName: string
  headerRow: number
  dataStartRow: number
  monthColumns: { [key: string]: number }
  metricRows: { [key: string]: number }
  customMappings?: { [key: string]: any }
}

interface StructureDetectionResult {
  worksheets: string[]
  headers: string[]
  potentialMetrics: { [key: string]: string }
  suggestedMapping: ExcelStructure
  confidence: number
}

export class ConfigurationService {
  private static instance: ConfigurationService
  private companies: Map<string, CompanyConfig> = new Map()
  private activeCompanyId: string | null = null

  private constructor() {
    // Initialize with default Vortex configuration
    this.addDefaultConfiguration()
  }

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService()
    }
    return ConfigurationService.instance
  }

  private addDefaultConfiguration() {
    const defaultConfig: CompanyConfig = {
      id: 'vortex-default',
      name: 'Vortex Tech Solutions',
      currency: 'ARS',
      scale: 'thousands',
      isActive: true,
      createdAt: '2025-01-01',
      excelStructure: {
        worksheetName: 'Combined Pesos',
        headerRow: 4,
        dataStartRow: 8,
        monthColumns: {
          'January': 2, 'February': 4, 'March': 6, 'April': 8, 'May': 10, 'June': 12,
          'July': 14, 'August': 16, 'September': 18, 'October': 20, 'November': 22, 'December': 24
        },
        metricRows: {
          revenue: 8,
          costOfRevenue: 18,
          grossProfit: 19,
          grossMargin: 20,
          operatingExpenses: 52,
          ebitda: 65,
          ebitdaMargin: 66,
          netIncome: 81,
          netIncomeMargin: 82,
          personnelSalariesCoR: 11,
          payrollTaxesCoR: 12,
          personnelSalariesOp: 23,
          payrollTaxesOp: 24,
          healthCoverageCoR: 14,
          healthCoverageOp: 25,
          personnelBenefits: 26,
          contractServicesCoR: 13,
          contractServicesOp: 27
        }
      }
    }
    this.companies.set(defaultConfig.id, defaultConfig)
    this.activeCompanyId = defaultConfig.id
  }

  async analyzeExcelStructure(buffer: Buffer): Promise<StructureDetectionResult> {
    try {
      logger.info('Starting Excel structure analysis')
      
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      const worksheets = workbook.worksheets.map(ws => ws.name)
      const detectionResult: StructureDetectionResult = {
        worksheets,
        headers: [],
        potentialMetrics: {},
        suggestedMapping: {
          worksheetName: '',
          headerRow: 0,
          dataStartRow: 0,
          monthColumns: {},
          metricRows: {}
        },
        confidence: 0
      }

      // Analyze each worksheet
      let bestWorksheet: ExcelJS.Worksheet | null = null
      let maxDataDensity = 0

      for (const worksheet of workbook.worksheets) {
        const analysis = this.analyzeWorksheet(worksheet)
        if (analysis.dataDensity > maxDataDensity) {
          maxDataDensity = analysis.dataDensity
          bestWorksheet = worksheet
          detectionResult.suggestedMapping.worksheetName = worksheet.name
        }
      }

      if (bestWorksheet) {
        const detailedAnalysis = this.performDetailedAnalysis(bestWorksheet)
        detectionResult.headers = detailedAnalysis.headers
        detectionResult.potentialMetrics = detailedAnalysis.potentialMetrics
        detectionResult.suggestedMapping = detailedAnalysis.suggestedMapping
        detectionResult.confidence = detailedAnalysis.confidence
      }

      logger.info(`Excel analysis complete. Best worksheet: ${detectionResult.suggestedMapping.worksheetName}, Confidence: ${detectionResult.confidence}%`)
      return detectionResult

    } catch (error) {
      logger.error('Error analyzing Excel structure:', error)
      throw new Error('Failed to analyze Excel structure')
    }
  }

  private analyzeWorksheet(worksheet: ExcelJS.Worksheet): { dataDensity: number } {
    let cellCount = 0
    let populatedCells = 0

    // Sample first 100 rows and 30 columns
    for (let row = 1; row <= Math.min(100, worksheet.rowCount); row++) {
      for (let col = 1; col <= Math.min(30, worksheet.columnCount); col++) {
        cellCount++
        const cell = worksheet.getCell(row, col)
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          populatedCells++
        }
      }
    }

    return {
      dataDensity: cellCount > 0 ? (populatedCells / cellCount) * 100 : 0
    }
  }

  private performDetailedAnalysis(worksheet: ExcelJS.Worksheet): {
    headers: string[]
    potentialMetrics: { [key: string]: string }
    suggestedMapping: ExcelStructure
    confidence: number
  } {
    const headers: string[] = []
    const potentialMetrics: { [key: string]: string } = {}
    const monthColumns: { [key: string]: number } = {}
    const metricRows: { [key: string]: number } = {}
    
    // Common month patterns
    const monthPatterns = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]

    // Financial term patterns with confidence weights
    const financialPatterns = [
      { terms: ['revenue', 'ingreso', 'ingresos', 'ventas', 'sales'], metric: 'revenue', confidence: 'high' },
      { terms: ['cost of goods', 'cogs', 'cost of sales', 'costo de ventas'], metric: 'costOfRevenue', confidence: 'high' },
      { terms: ['gross profit', 'beneficio bruto', 'utilidad bruta'], metric: 'grossProfit', confidence: 'high' },
      { terms: ['gross margin', 'margen bruto'], metric: 'grossMargin', confidence: 'medium' },
      { terms: ['operating expense', 'gastos operativos', 'opex'], metric: 'operatingExpenses', confidence: 'high' },
      { terms: ['ebitda'], metric: 'ebitda', confidence: 'high' },
      { terms: ['net income', 'utilidad neta', 'beneficio neto'], metric: 'netIncome', confidence: 'high' },
      { terms: ['personnel', 'personal', 'salaries', 'salarios'], metric: 'personnelCosts', confidence: 'medium' }
    ]

    let headerRow = 0
    let dataStartRow = 0

    // Find header row (look for month patterns)
    for (let row = 1; row <= Math.min(10, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row)
      let monthMatches = 0
      
      for (let col = 1; col <= Math.min(25, worksheet.columnCount); col++) {
        const cellValue = this.getCellStringValue(rowData.getCell(col))
        if (this.containsMonthPattern(cellValue, monthPatterns)) {
          monthMatches++
          if (monthMatches >= 3) { // Found at least 3 months
            headerRow = row
            break
          }
        }
      }
      
      if (headerRow > 0) break
    }

    // Extract month columns from header row
    if (headerRow > 0) {
      const headerRowData = worksheet.getRow(headerRow)
      for (let col = 1; col <= Math.min(25, worksheet.columnCount); col++) {
        const cellValue = this.getCellStringValue(headerRowData.getCell(col))
        const monthMatch = this.findMonthMatch(cellValue, monthPatterns)
        if (monthMatch) {
          monthColumns[monthMatch] = col
          headers.push(monthMatch)
        }
      }
      dataStartRow = headerRow + 1
    }

    // Find potential metric rows
    for (let row = dataStartRow; row <= Math.min(100, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row)
      const firstCellValue = this.getCellStringValue(rowData.getCell(1))
      
      if (firstCellValue) {
        for (const pattern of financialPatterns) {
          if (this.containsTermPattern(firstCellValue, pattern.terms)) {
            const key = `Row ${row}`
            potentialMetrics[key] = `${pattern.metric} (${pattern.confidence} confidence)`
            metricRows[pattern.metric] = row
            break
          }
        }
      }
    }

    // Calculate overall confidence
    const monthConfidence = Object.keys(monthColumns).length >= 6 ? 30 : Object.keys(monthColumns).length * 5
    const metricConfidence = Object.keys(metricRows).length >= 5 ? 40 : Object.keys(metricRows).length * 8
    const structureConfidence = headerRow > 0 && dataStartRow > 0 ? 30 : 0
    
    const totalConfidence = Math.min(100, monthConfidence + metricConfidence + structureConfidence)

    return {
      headers,
      potentialMetrics,
      suggestedMapping: {
        worksheetName: worksheet.name,
        headerRow,
        dataStartRow,
        monthColumns,
        metricRows
      },
      confidence: totalConfidence
    }
  }

  private getCellStringValue(cell: ExcelJS.Cell): string {
    if (!cell.value) return ''
    if (typeof cell.value === 'string') return cell.value.toLowerCase().trim()
    if (typeof cell.value === 'number') return cell.value.toString()
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return cell.value.text?.toLowerCase().trim() || ''
    }
    return cell.value.toString().toLowerCase().trim()
  }

  private containsMonthPattern(text: string, patterns: string[]): boolean {
    if (!text) return false
    return patterns.some(pattern => text.includes(pattern))
  }

  private findMonthMatch(text: string, patterns: string[]): string | null {
    if (!text) return null
    
    const monthMap: { [key: string]: string } = {
      'january': 'January', 'jan': 'January', 'enero': 'January',
      'february': 'February', 'feb': 'February', 'febrero': 'February',
      'march': 'March', 'mar': 'March', 'marzo': 'March',
      'april': 'April', 'apr': 'April', 'abril': 'April',
      'may': 'May', 'mayo': 'May',
      'june': 'June', 'jun': 'June', 'junio': 'June',
      'july': 'July', 'jul': 'July', 'julio': 'July',
      'august': 'August', 'aug': 'August', 'agosto': 'August',
      'september': 'September', 'sep': 'September', 'septiembre': 'September',
      'october': 'October', 'oct': 'October', 'octubre': 'October',
      'november': 'November', 'nov': 'November', 'noviembre': 'November',
      'december': 'December', 'dec': 'December', 'diciembre': 'December'
    }

    for (const [pattern, standardMonth] of Object.entries(monthMap)) {
      if (text.includes(pattern)) {
        return standardMonth
      }
    }
    return null
  }

  private containsTermPattern(text: string, terms: string[]): boolean {
    if (!text) return false
    return terms.some(term => text.includes(term.toLowerCase()))
  }

  // Company management methods
  getCompanies(): CompanyConfig[] {
    return Array.from(this.companies.values())
  }

  getCompany(id: string): CompanyConfig | null {
    return this.companies.get(id) || null
  }

  getActiveCompany(): CompanyConfig | null {
    if (!this.activeCompanyId) return null
    return this.companies.get(this.activeCompanyId) || null
  }

  addCompany(company: Omit<CompanyConfig, 'id'>): CompanyConfig {
    const id = Date.now().toString()
    const newCompany: CompanyConfig = { ...company, id }
    this.companies.set(id, newCompany)
    logger.info(`Added new company configuration: ${company.name}`)
    return newCompany
  }

  updateCompany(id: string, updates: Partial<CompanyConfig>): CompanyConfig | null {
    const company = this.companies.get(id)
    if (!company) return null

    const updatedCompany = { ...company, ...updates, lastUpdated: new Date().toISOString().split('T')[0] }
    this.companies.set(id, updatedCompany)
    logger.info(`Updated company configuration: ${updatedCompany.name}`)
    return updatedCompany
  }

  deleteCompany(id: string): boolean {
    if (id === this.activeCompanyId) {
      // Set another company as active if deleting active company
      const otherCompanies = Array.from(this.companies.values()).filter(c => c.id !== id)
      this.activeCompanyId = otherCompanies.length > 0 ? otherCompanies[0].id : null
    }
    
    const deleted = this.companies.delete(id)
    if (deleted) {
      logger.info(`Deleted company configuration: ${id}`)
    }
    return deleted
  }

  setActiveCompany(id: string): boolean {
    const company = this.companies.get(id)
    if (!company) return false

    // Update all companies to inactive
    for (const [companyId, companyData] of this.companies) {
      this.companies.set(companyId, { ...companyData, isActive: false })
    }

    // Set selected company as active
    this.companies.set(id, { ...company, isActive: true })
    this.activeCompanyId = id
    
    logger.info(`Set active company: ${company.name}`)
    return true
  }

  saveExcelStructure(companyId: string, structure: ExcelStructure): boolean {
    const company = this.companies.get(companyId)
    if (!company) return false

    const updatedCompany = {
      ...company,
      excelStructure: structure,
      lastUpdated: new Date().toISOString().split('T')[0]
    }
    
    this.companies.set(companyId, updatedCompany)
    logger.info(`Saved Excel structure for company: ${company.name}`)
    return true
  }
}