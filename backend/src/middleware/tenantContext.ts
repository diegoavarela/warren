import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { createError } from './errorHandler';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantName?: string;
      subscriptionTier?: string;
      featureFlags?: Record<string, boolean>;
    }
  }
}

/**
 * Middleware to set tenant context for all requests
 */
export const tenantContext = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip for public routes
    if (!req.user) {
      return next();
    }

    // Platform admins don't have a specific tenant context
    if (req.user.role === 'platform_admin') {
      req.tenantId = 'platform';
      req.tenantName = 'Platform Admin';
      req.subscriptionTier = 'enterprise';
      req.featureFlags = {
        user_management: true,
        pnl_access: true,
        cashflow_access: true,
        ai_analysis: true,
        advanced_reports: true,
        api_access: true,
        custom_branding: true,
        data_export: true,
        multi_currency: true,
        audit_logs: true,
        platform_management: true
      };
      return next();
    }

    // Get company details
    const companyResult = await pool.query(
      `SELECT 
        id, name, subscription_tier, feature_flags, 
        user_limit, license_expiry
       FROM companies 
       WHERE id = $1`,
      [req.user.companyId]
    );

    if (companyResult.rows.length === 0) {
      return next(createError('Company not found', 404));
    }

    const company = companyResult.rows[0];

    // Check license expiry
    if (company.license_expiry && new Date(company.license_expiry) < new Date()) {
      return next(createError('Company license has expired', 403));
    }

    // Set tenant context
    req.tenantId = company.id;
    req.tenantName = company.name;
    req.subscriptionTier = company.subscription_tier;
    req.featureFlags = company.feature_flags || {};

    // Set database session variable for RLS
    await pool.query('SELECT set_current_tenant($1)', [company.id]);

    next();
  } catch (error) {
    logger.error('Failed to set tenant context:', error);
    next(createError('Failed to establish tenant context', 500));
  }
};

/**
 * Middleware to check feature access
 */
export const requireFeature = (featureName: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Platform admins have access to all features
    if (req.user?.role === 'platform_admin') {
      return next();
    }

    // Check if feature is enabled
    if (!req.featureFlags || !req.featureFlags[featureName]) {
      // Log feature access denial
      logFeatureAccess(req, featureName, false);
      
      return next(createError(
        `Access denied. This feature (${featureName}) is not available in your subscription plan.`,
        403
      ));
    }

    // Log successful feature access
    logFeatureAccess(req, featureName, true);
    next();
  };
};

/**
 * Middleware to check user permissions
 */
export const requirePermission = (permissionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      // Platform admins have all permissions
      if (req.user.role === 'platform_admin') {
        return next();
      }

      // Check if user has permission
      const permissionResult = await pool.query(
        `SELECT 1 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         JOIN users u ON u.role = rp.role
         WHERE u.id = $1 AND p.name = $2`,
        [req.user.id, permissionName]
      );

      if (permissionResult.rows.length === 0) {
        return next(createError(
          `Access denied. You don't have permission to ${permissionName.replace('.', ' ')}.`,
          403
        ));
      }

      next();
    } catch (error) {
      logger.error('Failed to check permission:', error);
      next(createError('Failed to verify permissions', 500));
    }
  };
};

/**
 * Middleware to check user limit
 */
export const checkUserLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantId || req.tenantId === 'platform') {
      return next();
    }

    // Get current user count and limit
    const result = await pool.query(
      `SELECT 
        c.user_limit,
        COUNT(u.id) as current_users
       FROM companies c
       LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
       WHERE c.id = $1
       GROUP BY c.id, c.user_limit`,
      [req.tenantId]
    );

    if (result.rows.length === 0) {
      return next(createError('Company not found', 404));
    }

    const { user_limit, current_users } = result.rows[0];

    // Check if adding a new user would exceed the limit
    if (current_users >= user_limit) {
      return next(createError(
        `User limit reached. Your plan allows ${user_limit} users. Please upgrade to add more users.`,
        403
      ));
    }

    next();
  } catch (error) {
    logger.error('Failed to check user limit:', error);
    next(createError('Failed to verify user limit', 500));
  }
};

/**
 * Middleware to ensure tenant isolation in queries
 */
export const ensureTenantIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Add tenant filter to all queries
  const originalQuery = req.query;
  
  if (req.tenantId && req.tenantId !== 'platform') {
    req.query = {
      ...originalQuery,
      company_id: req.tenantId
    };
  }

  next();
};

/**
 * Log feature access attempts
 */
async function logFeatureAccess(
  req: AuthRequest,
  featureName: string,
  wasAllowed: boolean
): Promise<void> {
  try {
    if (!req.user || !req.tenantId) return;

    await pool.query(
      `INSERT INTO feature_access_log 
       (user_id, company_id, feature_name, was_allowed, denial_reason, accessed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        req.user.id,
        req.tenantId === 'platform' ? null : req.tenantId,
        featureName,
        wasAllowed,
        wasAllowed ? null : 'Feature not available in subscription plan'
      ]
    );
  } catch (error) {
    logger.error('Failed to log feature access:', error);
  }
}

/**
 * Get feature flags for a subscription tier
 */
export function getFeatureFlagsForTier(tier: string): Record<string, boolean> {
  const baseFeatures = {
    user_management: false,
    pnl_access: false,
    cashflow_access: false,
    ai_analysis: false,
    advanced_reports: false,
    api_access: false,
    custom_branding: false,
    data_export: false,
    multi_currency: false,
    audit_logs: false
  };

  switch (tier) {
    case 'basic':
      return {
        ...baseFeatures,
        user_management: true
      };
    
    case 'standard':
      return {
        ...baseFeatures,
        user_management: true,
        pnl_access: true,
        data_export: true
      };
    
    case 'premium':
      return {
        ...baseFeatures,
        user_management: true,
        pnl_access: true,
        cashflow_access: true,
        data_export: true,
        advanced_reports: true,
        multi_currency: true,
        audit_logs: true
      };
    
    case 'enterprise':
      return {
        user_management: true,
        pnl_access: true,
        cashflow_access: true,
        ai_analysis: true,
        advanced_reports: true,
        api_access: true,
        custom_branding: true,
        data_export: true,
        multi_currency: true,
        audit_logs: true
      };
    
    default:
      return baseFeatures;
  }
}