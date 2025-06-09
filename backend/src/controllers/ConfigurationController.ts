import { Request, Response, NextFunction } from 'express'
import { ConfigurationService } from '../services/ConfigurationService'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: any
}

export class ConfigurationController {
  private configService: ConfigurationService

  constructor() {
    this.configService = ConfigurationService.getInstance()
  }

  async getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companies = this.configService.getCompanies()
      
      res.json({
        success: true,
        data: companies
      })
    } catch (error) {
      logger.error('Error getting companies:', error)
      next(error)
    }
  }

  async getCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const company = this.configService.getCompany(id)
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        })
      }

      res.json({
        success: true,
        data: company
      })
    } catch (error) {
      logger.error('Error getting company:', error)
      next(error)
    }
  }

  async getActiveCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const company = this.configService.getActiveCompany()
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'No active company found'
        })
      }

      res.json({
        success: true,
        data: company
      })
    } catch (error) {
      logger.error('Error getting active company:', error)
      next(error)
    }
  }

  async addCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, currency, scale } = req.body

      if (!name || !currency || !scale) {
        return res.status(400).json({
          success: false,
          message: 'Name, currency, and scale are required'
        })
      }

      const company = this.configService.addCompany({
        name,
        currency,
        scale,
        isActive: false,
        createdAt: new Date().toISOString().split('T')[0]
      })

      logger.info(`Company added by user ${req.user?.email}: ${name}`)

      res.status(201).json({
        success: true,
        data: company,
        message: 'Company added successfully'
      })
    } catch (error) {
      logger.error('Error adding company:', error)
      next(error)
    }
  }

  async updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const updates = req.body

      const company = this.configService.updateCompany(id, updates)
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        })
      }

      logger.info(`Company updated by user ${req.user?.email}: ${company.name}`)

      res.json({
        success: true,
        data: company,
        message: 'Company updated successfully'
      })
    } catch (error) {
      logger.error('Error updating company:', error)
      next(error)
    }
  }

  async deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      
      const deleted = this.configService.deleteCompany(id)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        })
      }

      logger.info(`Company deleted by user ${req.user?.email}: ${id}`)

      res.json({
        success: true,
        message: 'Company deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting company:', error)
      next(error)
    }
  }

  async setActiveCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      
      const success = this.configService.setActiveCompany(id)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        })
      }

      logger.info(`Active company set by user ${req.user?.email}: ${id}`)

      res.json({
        success: true,
        message: 'Active company updated successfully'
      })
    } catch (error) {
      logger.error('Error setting active company:', error)
      next(error)
    }
  }

  async analyzeExcelStructure(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        })
      }

      logger.info(`Excel structure analysis initiated by user ${req.user?.email}`)

      const analysis = await this.configService.analyzeExcelStructure(req.file.buffer)

      res.json({
        success: true,
        data: analysis,
        message: 'Excel structure analyzed successfully'
      })
    } catch (error) {
      logger.error('Error analyzing Excel structure:', error)
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to analyze Excel structure'
      })
    }
  }

  async saveExcelStructure(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params
      const { structure } = req.body

      if (!structure) {
        return res.status(400).json({
          success: false,
          message: 'Excel structure is required'
        })
      }

      const success = this.configService.saveExcelStructure(companyId, structure)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        })
      }

      logger.info(`Excel structure saved by user ${req.user?.email} for company: ${companyId}`)

      res.json({
        success: true,
        message: 'Excel structure saved successfully'
      })
    } catch (error) {
      logger.error('Error saving Excel structure:', error)
      next(error)
    }
  }
}