import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { emailService } from '../services/EmailService';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class PlatformAdminController {
  /**
   * Create a new company
   */
  async createCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const {
        name,
        website,
        email,
        industry,
        description,
        subscriptionTier = 'basic',
        userLimit,
        allowedEmailDomains = [],
        adminEmail,
        adminPassword
      } = req.body;

      // Validate required fields
      if (!name || !adminEmail || !adminPassword) {
        return next(createError('Company name, admin email, and admin password are required', 400));
      }

      // Set user limit based on subscription tier if not provided
      const tierLimits: { [key: string]: number | null } = {
        'basic': 5,
        'standard': 10,
        'premium': 25,
        'enterprise': null
      };
      const finalUserLimit = userLimit || tierLimits[subscriptionTier];

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Create the company
        const companyResult = await client.query(
          `INSERT INTO companies (
            name, website, email, industry, description,
            subscription_tier, user_limit, allowed_email_domains,
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
          RETURNING *`,
          [
            name, website, email, industry, description,
            subscriptionTier, finalUserLimit, allowedEmailDomains
          ]
        );

        const company = companyResult.rows[0];

        // Hash the admin password
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        // Create the company admin user
        const userResult = await client.query(
          `INSERT INTO users (
            email, password_hash, company_id, role,
            is_active, email_verified, created_at, updated_at
          ) VALUES ($1, $2, $3, 'company_admin', true, true, NOW(), NOW())
          RETURNING id, email, role`,
          [adminEmail, passwordHash, company.id]
        );

        const adminUser = userResult.rows[0];

        // Create encryption key for the company
        await client.query(
          `INSERT INTO encryption_keys (company_id, key_version, encrypted_key, is_active)
          VALUES ($1, 1, $2, true)`,
          [company.id, crypto.randomBytes(32).toString('base64')]
        );

        // Log audit event
        await client.query(
          `INSERT INTO audit_logs 
          (user_id, company_id, action, entity_type, entity_id, new_values, created_at)
          VALUES ($1, NULL, 'company.create', 'company', $2, $3, NOW())`,
          [
            req.user.id,
            company.id,
            JSON.stringify({ name, subscriptionTier, adminEmail })
          ]
        );

        await client.query('COMMIT');

        // Send welcome email to company admin
        try {
          await emailService.sendEmail({
            to: adminEmail,
            subject: `Welcome to Warren - ${name}`,
            html: `
              <h2>Welcome to Warren!</h2>
              <p>Your company account has been created successfully.</p>
              <p><strong>Company:</strong> ${name}</p>
              <p><strong>Your Role:</strong> Company Administrator</p>
              <p><strong>Email:</strong> ${adminEmail}</p>
              <p>You can now log in and start inviting your team members.</p>
              <p>If you have any questions, please contact support.</p>
            `,
            text: `Welcome to Warren! Your company account for ${name} has been created.`
          });
        } catch (emailError) {
          logger.error('Failed to send welcome email:', emailError);
        }

        res.status(201).json({
          success: true,
          company: {
            id: company.id,
            name: company.name,
            subscriptionTier: company.subscription_tier,
            userLimit: company.user_limit
          },
          admin: adminUser,
          message: `Company "${name}" created successfully`
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all companies
   */
  async getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const result = await pool.query(
        `SELECT 
          c.id, c.name, c.website, c.email, c.industry,
          c.subscription_tier, c.user_limit, c.is_active,
          c.created_at, c.updated_at,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_user_count,
          MAX(u.last_login) as last_activity
        FROM companies c
        LEFT JOIN users u ON c.id = u.company_id
        GROUP BY c.id
        ORDER BY c.created_at DESC`
      );

      res.json({
        success: true,
        companies: result.rows,
        totalCompanies: result.rows.length,
        activeCompanies: result.rows.filter(c => c.is_active).length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update company details
   */
  async updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const { companyId } = req.params;
      const updates = req.body;

      // Build update query dynamically
      const allowedFields = [
        'name', 'website', 'email', 'industry', 'description',
        'subscription_tier', 'user_limit', 'allowed_email_domains',
        'is_active'
      ];

      const setClause = [];
      const values = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updates.hasOwnProperty(field)) {
          setClause.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        return next(createError('No valid fields to update', 400));
      }

      values.push(companyId);

      const result = await pool.query(
        `UPDATE companies 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return next(createError('Company not found', 404));
      }

      // Log audit event
      await pool.query(
        `INSERT INTO audit_logs 
        (user_id, company_id, action, entity_type, entity_id, new_values, created_at)
        VALUES ($1, NULL, 'company.update', 'company', $2, $3, NOW())`,
        [req.user.id, companyId, JSON.stringify(updates)]
      );

      res.json({
        success: true,
        company: result.rows[0],
        message: 'Company updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete/deactivate a company
   */
  async deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const { companyId } = req.params;

      // Soft delete - just deactivate the company and its users
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Deactivate company
        await client.query(
          'UPDATE companies SET is_active = false, updated_at = NOW() WHERE id = $1',
          [companyId]
        );

        // Deactivate all users
        await client.query(
          'UPDATE users SET is_active = false, updated_at = NOW() WHERE company_id = $1',
          [companyId]
        );

        // Log audit event
        await client.query(
          `INSERT INTO audit_logs 
          (user_id, company_id, action, entity_type, entity_id, created_at)
          VALUES ($1, NULL, 'company.deactivate', 'company', $2, NOW())`,
          [req.user.id, companyId]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Company deactivated successfully'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const { companyId } = req.params;

      const stats = await pool.query(
        `SELECT 
          c.id, c.name, c.subscription_tier, c.user_limit,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users,
          COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'company_admin') as admin_count,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_2fa_enabled = true) as users_with_2fa,
          COUNT(DISTINCT ui.id) as pending_invitations,
          COUNT(DISTINCT f.id) as uploaded_files,
          COUNT(DISTINCT p.id) as pnl_uploads,
          MAX(u.last_login) as last_activity
        FROM companies c
        LEFT JOIN users u ON c.id = u.company_id
        LEFT JOIN user_invitations ui ON c.id = ui.company_id 
          AND ui.accepted_at IS NULL AND ui.expires_at > NOW()
        LEFT JOIN file_uploads f ON c.id = f.company_id
        LEFT JOIN pnl_uploads p ON c.id = p.company_id
        WHERE c.id = $1
        GROUP BY c.id`,
        [companyId]
      );

      if (stats.rows.length === 0) {
        return next(createError('Company not found', 404));
      }

      res.json({
        success: true,
        stats: stats.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'platform_admin') {
        return next(createError('Platform admin access required', 403));
      }

      const stats = await pool.query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_companies,
          COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_companies,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_2fa_enabled = true) as users_with_2fa,
          COUNT(DISTINCT c.id) FILTER (WHERE c.subscription_tier = 'basic') as basic_companies,
          COUNT(DISTINCT c.id) FILTER (WHERE c.subscription_tier = 'standard') as standard_companies,
          COUNT(DISTINCT c.id) FILTER (WHERE c.subscription_tier = 'premium') as premium_companies,
          COUNT(DISTINCT c.id) FILTER (WHERE c.subscription_tier = 'enterprise') as enterprise_companies
        FROM companies c
        LEFT JOIN users u ON c.id = u.company_id
      `);

      const recentActivity = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);

      res.json({
        success: true,
        stats: stats.rows[0],
        recentActivity: recentActivity.rows
      });
    } catch (error) {
      next(error);
    }
  }
}