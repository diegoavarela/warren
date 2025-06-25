import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { TwoFactorService } from '../services/TwoFactorService';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import { encryptionService } from '../utils/encryption';

interface LoginRequest {
  email: string;
  password: string;
  totpToken?: string;
}

interface MultiTenantUser {
  id: number;
  email: string;
  company_id: string;
  role: string;
  is_2fa_enabled: boolean;
  email_verified: boolean;
  is_active: boolean;
}

export class MultiTenantAuthController {
  /**
   * Login with email, password, and optional TOTP
   */
  async login(req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction) {
    try {
      const { email, password, totpToken } = req.body;

      // Validate input
      if (!email || !password) {
        return next(createError('Email and password are required', 400));
      }

      // Validate email domain
      const isValidDomain = await this.validateEmailDomain(email);
      if (!isValidDomain) {
        return next(createError('Email domain not allowed. Please use your corporate email.', 403));
      }

      // Get user with company info
      const userResult = await pool.query(
        `SELECT u.*, c.name as company_name, c.subscription_tier, c.license_expiry
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return next(createError('Invalid credentials', 401));
      }

      const user = userResult.rows[0];

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedAttempts(user.id);
        return next(createError('Invalid credentials', 401));
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return next(createError('Account is locked. Please try again later.', 423));
      }

      // Check email verification
      if (!user.email_verified && user.role !== 'platform_admin') {
        return next(createError('Please verify your email before logging in', 403));
      }

      // Check license expiry
      if (user.license_expiry && new Date(user.license_expiry) < new Date()) {
        return next(createError('Your company license has expired. Please contact your administrator.', 403));
      }

      // Check 2FA
      if (user.is_2fa_enabled) {
        if (!totpToken) {
          // Return partial success indicating 2FA is required
          return res.json({
            success: true,
            requiresTwoFactor: true,
            userId: user.id
          });
        }

        // Verify TOTP token
        const verifyResult = await TwoFactorService.verifyToken(
          user.id, 
          totpToken, 
          user.company_id
        );

        if (!verifyResult.valid) {
          await this.incrementFailedAttempts(user.id);
          return next(createError('Invalid 2FA code', 401));
        }

        if (verifyResult.backupCodeUsed) {
          // Notify user that a backup code was used
          logger.warn(`Backup code used for user ${user.id}`);
        }
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.id);

      // Update last login
      await pool.query(
        `UPDATE users 
         SET last_login = NOW(), 
             ip_address = $1, 
             user_agent = $2
         WHERE id = $3`,
        [req.ip, req.get('user-agent'), user.id]
      );

      // Generate JWT token with tenant context
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          companyName: user.company_name,
          subscriptionTier: user.subscription_tier
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // Create session
      await this.createSession(user.id, user.company_id, token, req);

      // Log audit event
      await this.logAuditEvent(user.id, user.company_id, 'auth.login', req);

      logger.info(`User logged in: ${email} (Company: ${user.company_name})`);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          companyName: user.company_name,
          is2FAEnabled: user.is_2fa_enabled,
          subscriptionTier: user.subscription_tier
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup 2FA for the current user
   */
  async setup2FA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const setup = await TwoFactorService.generateSecret(
        parseInt(req.user.id),
        req.user.email,
        req.user.companyId!
      );

      res.json({
        success: true,
        qrCode: setup.qrCodeUrl,
        backupCodes: setup.backupCodes,
        message: 'Scan the QR code with your authenticator app and verify with a code'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { token } = req.body;
      if (!token) {
        return next(createError('Verification token required', 400));
      }

      const success = await TwoFactorService.enable2FA(
        parseInt(req.user.id),
        token,
        req.user.companyId!
      );

      if (!success) {
        return next(createError('Invalid verification code', 400));
      }

      res.json({
        success: true,
        message: '2FA has been enabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { password, totpToken } = req.body;
      if (!password || !totpToken) {
        return next(createError('Password and 2FA code required', 400));
      }

      // Verify password
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!isValidPassword) {
        return next(createError('Invalid password', 401));
      }

      // Verify TOTP
      const verifyResult = await TwoFactorService.verifyToken(
        parseInt(req.user.id),
        totpToken,
        req.user.companyId!
      );

      if (!verifyResult.valid) {
        return next(createError('Invalid 2FA code', 401));
      }

      await TwoFactorService.disable2FA(parseInt(req.user.id), req.user.companyId!);

      res.json({
        success: true,
        message: '2FA has been disabled'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { password } = req.body;
      if (!password) {
        return next(createError('Password required', 400));
      }

      // Verify password
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!isValidPassword) {
        return next(createError('Invalid password', 401));
      }

      const backupCodes = await TwoFactorService.regenerateBackupCodes(
        parseInt(req.user.id),
        req.user.companyId!
      );

      res.json({
        success: true,
        backupCodes,
        message: 'Backup codes regenerated. Please save them securely.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate email domain
   */
  private async validateEmailDomain(email: string): Promise<boolean> {
    const domain = email.split('@')[1];
    
    // Check if domain is in blocked list
    const blockedResult = await pool.query(
      'SELECT 1 FROM blocked_email_domains WHERE domain = $1',
      [domain]
    );

    if (blockedResult.rows.length > 0) {
      return false;
    }

    // For platform admins, allow any domain
    const platformAdminResult = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 AND role = $2',
      [email, 'platform_admin']
    );

    if (platformAdminResult.rows.length > 0) {
      return true;
    }

    // Check if domain is allowed for any company
    const allowedResult = await pool.query(
      'SELECT 1 FROM companies WHERE $1 = ANY(allowed_email_domains)',
      [domain]
    );

    return allowedResult.rows.length > 0;
  }

  /**
   * Increment failed login attempts
   */
  private async incrementFailedAttempts(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE 
             WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
             ELSE locked_until
           END
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedAttempts(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           locked_until = NULL 
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Create user session
   */
  private async createSession(
    userId: number, 
    companyId: string, 
    token: string,
    req: Request
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_sessions 
       (session_token, user_id, company_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')`,
      [token, userId, companyId, req.ip, req.get('user-agent')]
    );
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    userId: number, 
    companyId: string, 
    action: string,
    req: Request
  ): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs 
       (user_id, company_id, action, entity_type, entity_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, 'auth', $4, $5, $6, NOW())`,
      [userId, companyId, action, userId, req.ip, req.get('user-agent')]
    );
  }

  /**
   * Logout
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      // Invalidate session
      await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
        [token]
      );

      // Log audit event
      await this.logAuditEvent(
        parseInt(req.user.id), 
        req.user.companyId!, 
        'auth.logout',
        req
      );

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const userResult = await pool.query(
        `SELECT 
          u.id, u.email, u.role, u.is_2fa_enabled, u.email_verified,
          u.created_at, u.last_login, u.company_id,
          c.name as company_name, c.subscription_tier, c.user_limit,
          (SELECT COUNT(*) FROM users WHERE company_id = u.company_id AND is_active = true) as company_user_count
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return next(createError('User not found', 404));
      }

      const user = userResult.rows[0];

      // Get remaining backup codes if 2FA is enabled
      let backupCodesRemaining = 0;
      if (user.is_2fa_enabled) {
        backupCodesRemaining = await TwoFactorService.getRemainingBackupCodesCount(
          parseInt(req.user.id),
          req.user.companyId!
        );
      }

      res.json({
        success: true,
        user: {
          ...user,
          backupCodesRemaining
        }
      });
    } catch (error) {
      next(error);
    }
  }
}