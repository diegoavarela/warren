/**
 * Request Validation Middleware
 * 
 * Validates request body, query, and params using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

interface ValidationSchemas {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body);
      if (error) {
        logger.warn('Request body validation failed:', error.details);
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }
      req.body = value;
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query);
      if (error) {
        logger.warn('Request query validation failed:', error.details);
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }
      req.query = value;
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params);
      if (error) {
        logger.warn('Request params validation failed:', error.details);
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }
      req.params = value;
    }

    next();
  };
}