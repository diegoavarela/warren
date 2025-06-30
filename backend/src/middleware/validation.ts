import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

interface ValidationOptions {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
  headers?: Joi.Schema;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Request validation middleware factory
 */
export function validateRequest(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    
    try {
      // Validate request body
      if (options.body && req.body) {
        const { error, value } = options.body.validate(req.body, {
          allowUnknown: options.allowUnknown ?? false,
          stripUnknown: options.stripUnknown ?? true,
          abortEarly: false,
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'body'));
        } else {
          req.body = value;
        }
      }
      
      // Validate query parameters
      if (options.query && req.query) {
        const { error, value } = options.query.validate(req.query, {
          allowUnknown: options.allowUnknown ?? false,
          stripUnknown: options.stripUnknown ?? true,
          abortEarly: false,
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'query'));
        } else {
          req.query = value;
        }
      }
      
      // Validate route parameters
      if (options.params && req.params) {
        const { error, value } = options.params.validate(req.params, {
          allowUnknown: options.allowUnknown ?? false,
          stripUnknown: options.stripUnknown ?? true,
          abortEarly: false,
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'params'));
        } else {
          req.params = value;
        }
      }
      
      // Validate headers
      if (options.headers && req.headers) {
        const { error } = options.headers.validate(req.headers, {
          allowUnknown: true, // Headers often have many unknown fields
          stripUnknown: false,
          abortEarly: false,
        });
        
        if (error) {
          errors.push(...formatJoiErrors(error, 'headers'));
        }
      }
      
      if (errors.length > 0) {
        logger.warn('Request validation failed:', {
          url: req.url,
          method: req.method,
          errors: errors,
          body: sanitizeForLogging(req.body),
          query: req.query,
          params: req.params,
        });
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      next();
    } catch (validationError) {
      logger.error('Validation middleware error:', validationError);
      return next(createError('Internal validation error', 500));
    }
  };
}

/**
 * Format Joi validation errors
 */
function formatJoiErrors(joiError: Joi.ValidationError, section: string): ValidationError[] {
  return joiError.details.map(detail => ({
    field: `${section}.${detail.path.join('.')}`,
    message: detail.message,
    value: detail.context?.value,
  }));
}

/**
 * Sanitize sensitive data for logging
 */
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'creditCard', 'ssn'];
  const sanitized = JSON.parse(JSON.stringify(data));
  
  const sanitizeObject = (obj: any): void => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

// Common validation schemas
export const commonSchemas = {
  // UUID
  uuid: Joi.string().uuid().message('Invalid UUID format'),
  
  // Email
  email: Joi.string().email().message('Invalid email format'),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
  
  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

// Financial data validation schemas
export const financialSchemas = {
  // Currency
  currency: Joi.string().length(3).uppercase().pattern(/^[A-Z]{3}$/).message('Invalid currency code'),
  
  // Amount (with precision handling)
  amount: Joi.number().precision(2).message('Amount must have maximum 2 decimal places'),
  
  // Positive amount
  positiveAmount: Joi.number().positive().precision(2).message('Amount must be positive with maximum 2 decimal places'),
  
  // Parser configuration
  parserConfig: Joi.object({
    fileType: Joi.string().valid('excel', 'csv', 'pdf').required(),
    dateFormat: Joi.string().optional(),
    currencyColumn: Joi.number().integer().min(1).optional(),
    amountColumn: Joi.number().integer().min(1).required(),
    descriptionColumn: Joi.number().integer().min(1).required(),
    dateColumn: Joi.number().integer().min(1).required(),
    skipRows: Joi.number().integer().min(0).default(0),
    customMappings: Joi.object().optional(),
  }),
};

// Legacy auth validation (keeping for backward compatibility)
const authSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const validateAuth = (req: Request, res: Response, next: NextFunction) => {
  const { error } = authSchema.validate(req.body);
  
  if (error) {
    return next(createError(error.details[0].message, 400));
  }
  
  next();
};

// Parser-specific validation middleware
export const validateFileUpload = validateRequest({
  body: Joi.object({
    companyId: commonSchemas.uuid.optional(),
    mappingType: Joi.string().valid('cashflow', 'pnl').required(),
    currency: financialSchemas.currency.optional(),
    parserConfig: financialSchemas.parserConfig.optional(),
  }),
});

// Security validation
export const validateCompanyAccess = validateRequest({
  params: Joi.object({
    companyId: commonSchemas.uuid.required(),
  }),
  headers: Joi.object({
    authorization: Joi.string().pattern(/^Bearer\s+.+/).required(),
  }).unknown(true),
});