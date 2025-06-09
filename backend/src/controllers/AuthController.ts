import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return next(createError('Email and password are required', 400));
      }

      // Authenticate user using UserService
      const user = await UserService.authenticateUser(email, password);
      if (!user) {
        return next(createError('Invalid credentials', 401));
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      logger.info(`User logged in: ${email}`);

      // Remove sensitive data from response
      const { encryptedData, ...safeUser } = user;

      res.json({
        success: true,
        token,
        user: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // In a real app, you might blacklist the token
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}