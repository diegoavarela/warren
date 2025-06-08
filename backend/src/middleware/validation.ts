import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

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