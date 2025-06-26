import { Request, Response, NextFunction } from 'express'
import { ConfigurationServiceDB } from '../services/ConfigurationServiceDB'
import { logger } from '../utils/logger'

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
    companyId?: string
    companyName?: string
  }
  tenantId?: string
}

export class ConfigurationController {
  private configService: ConfigurationServiceDB

  constructor() {
    this.configService = ConfigurationServiceDB.getInstance()
  }

  async getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Platform admins can see all companies
      if (req.user?.role === 'platform_admin') {
        const companies = await this.configService.getCompanies()
        res.json({
          success: true,
          data: companies
        })
        return
      }

      // Company users can only see their own company
      if (req.user?.companyId) {
        const company = await this.configService.getCompanyById(req.user.companyId)
        res.json({
          success: true,
          data: company ? [company] : []
        })
        return
      }

      res.json({
        success: true,
        data: []
      })
    } catch (error) {
      logger.error('Error getting companies:', error)
      next(error)
    }
  }

  async getCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      
      // Company users can only access their own company
      if (req.user?.role !== 'platform_admin' && req.user?.companyId !== id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }

      const company = await this.configService.getCompanyById(id)
      
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
      // For multi-tenant, the active company is the user's company
      if (req.user?.companyId) {
        const company = await this.configService.getCompanyById(req.user.companyId)
        
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
      } else if (req.user?.role === 'platform_admin') {
        // Platform admins don't have an active company
        return res.status(400).json({
          success: false,
          message: 'Platform admins do not have an active company'
        })
      } else {
        return res.status(404).json({
          success: false,
          message: 'No active company found'
        })
      }
    } catch (error) {
      logger.error('Error getting active company:', error)
      next(error)
    }
  }

  async addCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Only platform admins can add companies
      if (req.user?.role !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only platform administrators can create companies'
        })
      }

      const { name, currency, scale } = req.body

      if (!name || !currency || !scale) {
        return res.status(400).json({
          success: false,
          message: 'Name, currency, and scale are required'
        })
      }

      const company = await this.configService.addCompany({
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

      // Company users can only update their own company
      if (req.user?.role !== 'platform_admin' && req.user?.companyId !== id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }

      const company = await this.configService.updateCompany(id, updates)
      
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
      // Only platform admins can delete companies
      if (req.user?.role !== 'platform_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only platform administrators can delete companies'
        })
      }

      const { id } = req.params
      
      await this.configService.deleteCompany(id)
      
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
      // This method is deprecated in multi-tenant architecture
      return res.status(400).json({
        success: false,
        message: 'This endpoint is deprecated. Active company is determined by user context in multi-tenant architecture.'
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

      const analysis = await this.configService.detectExcelStructure(req.file.buffer)

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

      // Company users can only save structure for their own company
      if (req.user?.role !== 'platform_admin' && req.user?.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }

      if (!structure) {
        return res.status(400).json({
          success: false,
          message: 'Excel structure is required'
        })
      }

      await this.configService.saveExcelStructure(companyId, structure)

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