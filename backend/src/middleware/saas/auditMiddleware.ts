import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../services/saas/AuditService';
import { pool } from '../../config/database';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    companyId?: string;
  };
}

/**
 * Middleware to automatically audit data access
 */
export function auditDataAccess(dataType: string, operation: 'view' | 'export' | 'modify' | 'delete') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const auditService = AuditService.getInstance(pool);
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture response data
    res.json = function(data: any) {
      // Log the access after successful response
      const recordCount = Array.isArray(data?.data) ? data.data.length : 1;
      
      auditService.logDataAccess({
        userId: req.user!.id,
        companyId: req.user!.companyId || 'unknown',
        dataType,
        operation,
        recordCount,
        metadata: {
          endpoint: req.originalUrl,
          method: req.method,
          query: req.query,
          responseStatus: res.statusCode
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }).catch(error => {
        // Don't block response on audit failure
        console.error('Audit logging failed:', error);
      });

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware to audit authentication events
 */
export function auditAuth(action: 'login' | 'logout' | 'failed_login') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const auditService = AuditService.getInstance(pool);
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // Only log on successful auth events or all failed login attempts
      if (res.statusCode === 200 || action === 'failed_login') {
        auditService.logAuth({
          userId: req.user?.id,
          email: req.body?.email || req.user?.email || 'unknown',
          companyId: req.user?.companyId || data?.data?.companyId,
          action,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          metadata: {
            success: res.statusCode === 200,
            timestamp: new Date().toISOString()
          }
        }).catch(error => {
          console.error('Auth audit logging failed:', error);
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware to audit API requests
 */
export function auditAPIAccess() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const auditService = AuditService.getInstance(pool);
    const startTime = Date.now();
    
    // Log API access after response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      auditService.log({
        userId: req.user!.id,
        companyId: req.user!.companyId || 'unknown',
        action: 'api.access',
        entityType: 'api',
        entityId: req.path,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode: res.statusCode,
          duration,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      }).catch(error => {
        console.error('API audit logging failed:', error);
      });
    });

    next();
  };
}

/**
 * Middleware to audit critical operations
 */
export function auditCriticalOperation(operation: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const auditService = AuditService.getInstance(pool);
    
    // Log before operation
    await auditService.log({
      userId: req.user.id,
      companyId: req.user.companyId || 'unknown',
      action: operation,
      entityType: 'critical_operation',
      metadata: {
        requestBody: req.body,
        query: req.query,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    next();
  };
}