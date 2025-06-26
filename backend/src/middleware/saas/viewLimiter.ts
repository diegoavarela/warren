import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    companyId?: string;
  };
}

/**
 * Middleware to enforce view limits for freemium accounts
 */
export async function enforceViewLimit(viewType: string = 'dashboard') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Check if user has remaining views
      const checkQuery = `SELECT check_view_limit($1) as has_access`;
      const checkResult = await pool.query(checkQuery, [req.user.companyId]);
      
      if (!checkResult.rows[0].has_access) {
        logger.warn(`View limit exceeded for company ${req.user.companyId}`);
        
        return res.status(403).json({
          error: 'View limit exceeded',
          message: 'You have reached your monthly view limit. Please upgrade to continue.',
          upgradeUrl: '/pricing',
          type: 'VIEW_LIMIT_EXCEEDED'
        });
      }

      // Track the view
      const trackQuery = `
        INSERT INTO view_tracking (company_id, user_id, view_type, metadata)
        VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(trackQuery, [
        req.user.companyId,
        req.user.id,
        viewType,
        { 
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      ]);

      next();
    } catch (error) {
      logger.error('Error checking view limit:', error);
      // Don't block on error - fail open
      next();
    }
  };
}