import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { pool } from '../config/database'

export interface CompanyConfig {
  id: string
  name: string
  currency: string
  scale: string
  isActive: boolean
  createdAt: string
  lastUpdated?: string
  excelStructure?: ExcelStructure
  // Enhanced company information
  logo?: string
  website?: string
  address?: string
  phone?: string
  email?: string
  industry?: string
  description?: string
  primaryColor?: string
  secondaryColor?: string
  // Currency settings
  defaultCurrency?: string
  defaultUnit?: string
  currencySettings?: {
    defaultCurrency: string
    defaultUnit: string
    enableCurrencyConversion: boolean
    showCurrencySelector: boolean
  }
}

interface ExcelStructure {
  worksheetName: string
  headerRow: number
  dataStartRow: number
  monthColumns: { [key: string]: number }
  metricRows: { [key: string]: number }
  customMappings?: { [key: string]: any }
}

export interface StructureDetectionResult {
  worksheets: string[]
  headers: string[]
  potentialMetrics: { [key: string]: string }
  suggestedMapping: ExcelStructure
  confidence: number
}

export class ConfigurationServiceDB {
  private static instance: ConfigurationServiceDB
  private db: Pool

  private constructor() {
    this.db = pool
  }

  static getInstance(): ConfigurationServiceDB {
    if (!ConfigurationServiceDB.instance) {
      ConfigurationServiceDB.instance = new ConfigurationServiceDB()
    }
    return ConfigurationServiceDB.instance
  }

  async getCompanies(): Promise<CompanyConfig[]> {
    try {
      const query = `
        SELECT 
          id,
          name,
          currency,
          scale,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "lastUpdated",
          logo,
          website,
          address,
          phone,
          email,
          industry,
          description,
          primary_color as "primaryColor",
          secondary_color as "secondaryColor",
          default_currency as "defaultCurrency",
          default_unit as "defaultUnit",
          enable_currency_conversion as "enableCurrencyConversion",
          show_currency_selector as "showCurrencySelector",
          excel_structure as "excelStructure"
        FROM companies
        ORDER BY created_at DESC
      `
      
      const result = await this.db.query(query)
      
      return result.rows.map(row => ({
        ...row,
        currencySettings: {
          defaultCurrency: row.defaultCurrency || 'ARS',
          defaultUnit: row.defaultUnit || 'thousands',
          enableCurrencyConversion: row.enableCurrencyConversion ?? true,
          showCurrencySelector: row.showCurrencySelector ?? true
        }
      }))
    } catch (error) {
      logger.error('Error fetching companies:', error)
      throw error
    }
  }

  async getActiveCompany(): Promise<CompanyConfig | null> {
    try {
      const query = `
        SELECT 
          id,
          name,
          currency,
          scale,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "lastUpdated",
          logo,
          website,
          address,
          phone,
          email,
          industry,
          description,
          primary_color as "primaryColor",
          secondary_color as "secondaryColor",
          default_currency as "defaultCurrency",
          default_unit as "defaultUnit",
          enable_currency_conversion as "enableCurrencyConversion",
          show_currency_selector as "showCurrencySelector",
          excel_structure as "excelStructure"
        FROM companies
        WHERE is_active = true
        LIMIT 1
      `
      
      const result = await this.db.query(query)
      
      if (result.rows.length === 0) {
        return null
      }
      
      const row = result.rows[0]
      return {
        ...row,
        currencySettings: {
          defaultCurrency: row.defaultCurrency || 'ARS',
          defaultUnit: row.defaultUnit || 'thousands',
          enableCurrencyConversion: row.enableCurrencyConversion ?? true,
          showCurrencySelector: row.showCurrencySelector ?? true
        }
      }
    } catch (error) {
      logger.error('Error fetching active company:', error)
      throw error
    }
  }

  async addCompany(data: Partial<CompanyConfig>): Promise<CompanyConfig> {
    try {
      const id = uuidv4()
      const query = `
        INSERT INTO companies (
          id,
          name,
          currency,
          scale,
          is_active,
          logo,
          website,
          address,
          phone,
          email,
          industry,
          description,
          primary_color,
          secondary_color,
          default_currency,
          default_unit,
          enable_currency_conversion,
          show_currency_selector,
          excel_structure
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *
      `
      
      const values = [
        id,
        data.name || 'New Company',
        data.currency || 'ARS',
        data.scale || 'thousands',
        false, // New companies are not active by default
        data.logo || null,
        data.website || null,
        data.address || null,
        data.phone || null,
        data.email || null,
        data.industry || null,
        data.description || null,
        data.primaryColor || '#7CB342',
        data.secondaryColor || '#2E7D32',
        data.defaultCurrency || 'ARS',
        data.defaultUnit || 'thousands',
        data.currencySettings?.enableCurrencyConversion ?? true,
        data.currencySettings?.showCurrencySelector ?? true,
        data.excelStructure ? JSON.stringify(data.excelStructure) : null
      ]
      
      const result = await this.db.query(query, values)
      const row = result.rows[0]
      
      return {
        id: row.id,
        name: row.name,
        currency: row.currency,
        scale: row.scale,
        isActive: row.is_active,
        createdAt: row.created_at,
        lastUpdated: row.updated_at,
        logo: row.logo,
        website: row.website,
        address: row.address,
        phone: row.phone,
        email: row.email,
        industry: row.industry,
        description: row.description,
        primaryColor: row.primary_color,
        secondaryColor: row.secondary_color,
        defaultCurrency: row.default_currency,
        defaultUnit: row.default_unit,
        excelStructure: row.excel_structure,
        currencySettings: {
          defaultCurrency: row.default_currency || 'ARS',
          defaultUnit: row.default_unit || 'thousands',
          enableCurrencyConversion: row.enable_currency_conversion ?? true,
          showCurrencySelector: row.show_currency_selector ?? true
        }
      }
    } catch (error) {
      logger.error('Error adding company:', error)
      throw error
    }
  }

  async updateCompany(id: string, data: Partial<CompanyConfig>): Promise<CompanyConfig> {
    try {
      const query = `
        UPDATE companies
        SET
          name = COALESCE($2, name),
          currency = COALESCE($3, currency),
          scale = COALESCE($4, scale),
          logo = COALESCE($5, logo),
          website = COALESCE($6, website),
          address = COALESCE($7, address),
          phone = COALESCE($8, phone),
          email = COALESCE($9, email),
          industry = COALESCE($10, industry),
          description = COALESCE($11, description),
          primary_color = COALESCE($12, primary_color),
          secondary_color = COALESCE($13, secondary_color),
          default_currency = COALESCE($14, default_currency),
          default_unit = COALESCE($15, default_unit),
          enable_currency_conversion = COALESCE($16, enable_currency_conversion),
          show_currency_selector = COALESCE($17, show_currency_selector),
          excel_structure = COALESCE($18, excel_structure)
        WHERE id = $1
        RETURNING *
      `
      
      const values = [
        id,
        data.name,
        data.currency,
        data.scale,
        data.logo,
        data.website,
        data.address,
        data.phone,
        data.email,
        data.industry,
        data.description,
        data.primaryColor,
        data.secondaryColor,
        data.currencySettings?.defaultCurrency || data.defaultCurrency,
        data.currencySettings?.defaultUnit || data.defaultUnit,
        data.currencySettings?.enableCurrencyConversion,
        data.currencySettings?.showCurrencySelector,
        data.excelStructure ? JSON.stringify(data.excelStructure) : undefined
      ]
      
      const result = await this.db.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('Company not found')
      }
      
      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        currency: row.currency,
        scale: row.scale,
        isActive: row.is_active,
        createdAt: row.created_at,
        lastUpdated: row.updated_at,
        logo: row.logo,
        website: row.website,
        address: row.address,
        phone: row.phone,
        email: row.email,
        industry: row.industry,
        description: row.description,
        primaryColor: row.primary_color,
        secondaryColor: row.secondary_color,
        defaultCurrency: row.default_currency,
        defaultUnit: row.default_unit,
        excelStructure: row.excel_structure,
        currencySettings: {
          defaultCurrency: row.default_currency || 'ARS',
          defaultUnit: row.default_unit || 'thousands',
          enableCurrencyConversion: row.enable_currency_conversion ?? true,
          showCurrencySelector: row.show_currency_selector ?? true
        }
      }
    } catch (error) {
      logger.error('Error updating company:', error)
      throw error
    }
  }

  async deleteCompany(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM companies WHERE id = $1'
      await this.db.query(query, [id])
    } catch (error) {
      logger.error('Error deleting company:', error)
      throw error
    }
  }

  async setActiveCompany(id: string): Promise<void> {
    const client = await this.db.connect()
    
    try {
      await client.query('BEGIN')
      
      // First, deactivate all companies
      await client.query('UPDATE companies SET is_active = false')
      
      // Then activate the selected company
      const result = await client.query(
        'UPDATE companies SET is_active = true WHERE id = $1',
        [id]
      )
      
      if (result.rowCount === 0) {
        throw new Error('Company not found')
      }
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error setting active company:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async saveExcelStructure(companyId: string, structure: ExcelStructure): Promise<void> {
    try {
      const query = `
        UPDATE companies
        SET excel_structure = $2
        WHERE id = $1
      `
      
      await this.db.query(query, [companyId, JSON.stringify(structure)])
    } catch (error) {
      logger.error('Error saving Excel structure:', error)
      throw error
    }
  }

  // Excel structure detection methods
  async detectExcelStructure(buffer: Buffer): Promise<StructureDetectionResult> {
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    
    const worksheets = workbook.worksheets.map((ws: any) => ws.name)
    const worksheet = workbook.worksheets[0]
    
    if (!worksheet) {
      throw new Error('No worksheets found in Excel file')
    }

    const headers: string[] = []
    const potentialMetrics: { [key: string]: string } = {}
    
    // Analyze first 20 rows to detect structure
    for (let row = 1; row <= Math.min(20, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row)
      const firstCell = rowData.getCell(1).value
      
      if (firstCell && typeof firstCell === 'string') {
        // Look for date headers
        if (row <= 10) {
          for (let col = 1; col <= Math.min(30, worksheet.columnCount); col++) {
            const cellValue = rowData.getCell(col).value
            if (cellValue instanceof Date || (typeof cellValue === 'string' && /\d{4}/.test(cellValue))) {
              headers.push(`Row ${row} might contain date headers`)
              break
            }
          }
        }
        
        // Look for metric labels
        const lowerCase = firstCell.toLowerCase()
        if (lowerCase.includes('revenue') || lowerCase.includes('income')) {
          potentialMetrics.revenue = `Row ${row}: ${firstCell}`
        }
        if (lowerCase.includes('cost') || lowerCase.includes('expense')) {
          potentialMetrics.costs = `Row ${row}: ${firstCell}`
        }
        if (lowerCase.includes('profit')) {
          potentialMetrics.profit = `Row ${row}: ${firstCell}`
        }
      }
    }

    return {
      worksheets,
      headers,
      potentialMetrics,
      suggestedMapping: {
        worksheetName: worksheets[0] || 'Sheet1',
        headerRow: 4,
        dataStartRow: 8,
        monthColumns: {},
        metricRows: {}
      },
      confidence: 70
    }
  }
}