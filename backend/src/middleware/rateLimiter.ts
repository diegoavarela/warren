/**
 * Rate Limiter Middleware
 * 
 * Protects API endpoints from abuse by limiting request rates
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Extend Express Request type to include rateLimit
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

// Rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  message: 'Rate limit exceeded for sensitive operations',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false // Count all requests, not just failed ones
});

// File upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 uploads per 5 minutes
  message: 'Too many file uploads, please wait before uploading more files',
  standardHeaders: true,
  legacyHeaders: false
});

// Export default for backward compatibility
export const rateLimiter = authRateLimiter;