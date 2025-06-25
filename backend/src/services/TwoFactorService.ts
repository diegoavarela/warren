import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { encryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';
import { pool } from '../config/database';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface VerifyResult {
  valid: boolean;
  backupCodeUsed?: boolean;
}

export class TwoFactorService {
  private static readonly APP_NAME = 'Warren Finance';
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly TOKEN_WINDOW = 2; // Allow 2 windows (90 seconds) for time drift

  /**
   * Generate a new 2FA secret for a user
   */
  static async generateSecret(userId: number, email: string, companyId: string): Promise<TwoFactorSetup> {
    try {
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Generate backup codes
      const backupCodes = await encryptionService.generateBackupCodes(this.BACKUP_CODE_COUNT);
      
      // Encrypt secret and backup codes
      const encryptedSecret = await encryptionService.encryptString(secret, companyId);
      const encryptedBackupCodes = await encryptionService.encryptBackupCodes(backupCodes, companyId);
      
      // Generate QR code URL
      const otpAuthUrl = authenticator.keyuri(email, this.APP_NAME, secret);
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
      
      // Store encrypted data temporarily (user must verify before enabling)
      await this.storePendingSetup(userId, encryptedSecret, encryptedBackupCodes);
      
      logger.info(`Generated 2FA setup for user ${userId}`);
      
      return {
        secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret:', error);
      throw new Error('Failed to generate 2FA setup');
    }
  }

  /**
   * Verify a TOTP token
   */
  static async verifyToken(userId: number, token: string, companyId: string): Promise<VerifyResult> {
    try {
      // Get user's encrypted secret
      const result = await pool.query(
        'SELECT totp_secret, backup_codes FROM users WHERE id = $1 AND is_2fa_enabled = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return { valid: false };
      }

      const { totp_secret, backup_codes } = result.rows[0];
      
      // Decrypt secret
      const secret = await encryptionService.decryptString(totp_secret, companyId);
      
      // Configure authenticator options
      authenticator.options = {
        window: this.TOKEN_WINDOW
      };
      
      // Verify token
      const isValid = authenticator.verify({ token, secret });
      
      if (isValid) {
        return { valid: true };
      }
      
      // If token is invalid, check backup codes
      if (backup_codes) {
        const decryptedBackupCodes = await encryptionService.decryptBackupCodes(backup_codes, companyId);
        const backupCodeIndex = decryptedBackupCodes.findIndex(code => code === token);
        
        if (backupCodeIndex !== -1) {
          // Remove used backup code
          decryptedBackupCodes.splice(backupCodeIndex, 1);
          const updatedEncryptedCodes = await encryptionService.encryptBackupCodes(decryptedBackupCodes, companyId);
          
          await pool.query(
            'UPDATE users SET backup_codes = $1 WHERE id = $2',
            [updatedEncryptedCodes, userId]
          );
          
          logger.info(`Backup code used for user ${userId}`);
          return { valid: true, backupCodeUsed: true };
        }
      }
      
      return { valid: false };
    } catch (error) {
      logger.error('Failed to verify TOTP token:', error);
      return { valid: false };
    }
  }

  /**
   * Enable 2FA for a user after verification
   */
  static async enable2FA(userId: number, verificationToken: string, companyId: string): Promise<boolean> {
    try {
      // Get pending setup
      const pendingSetup = await this.getPendingSetup(userId);
      if (!pendingSetup) {
        throw new Error('No pending 2FA setup found');
      }

      // Verify the token with the pending secret
      const secret = await encryptionService.decryptString(pendingSetup.secret, companyId);
      const isValid = authenticator.verify({ 
        token: verificationToken, 
        secret 
      });

      if (!isValid) {
        return false;
      }

      // Enable 2FA
      await pool.query(
        `UPDATE users 
         SET is_2fa_enabled = true, 
             totp_secret = $1, 
             backup_codes = $2
         WHERE id = $3`,
        [pendingSetup.secret, pendingSetup.backupCodes, userId]
      );

      // Clear pending setup
      await this.clearPendingSetup(userId);

      // Log audit event
      await this.logAuditEvent(userId, companyId, 'two_factor.enabled');

      logger.info(`2FA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for a user
   */
  static async disable2FA(userId: number, companyId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE users 
         SET is_2fa_enabled = false, 
             totp_secret = NULL, 
             backup_codes = NULL
         WHERE id = $1`,
        [userId]
      );

      // Log audit event
      await this.logAuditEvent(userId, companyId, 'two_factor.disabled');

      logger.info(`2FA disabled for user ${userId}`);
    } catch (error) {
      logger.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: number, companyId: string): Promise<string[]> {
    try {
      const backupCodes = await encryptionService.generateBackupCodes(this.BACKUP_CODE_COUNT);
      const encryptedBackupCodes = await encryptionService.encryptBackupCodes(backupCodes, companyId);

      await pool.query(
        'UPDATE users SET backup_codes = $1 WHERE id = $2',
        [encryptedBackupCodes, userId]
      );

      // Log audit event
      await this.logAuditEvent(userId, companyId, 'two_factor.backup_codes_regenerated');

      logger.info(`Regenerated backup codes for user ${userId}`);
      return backupCodes;
    } catch (error) {
      logger.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Store pending 2FA setup
   */
  private static async storePendingSetup(
    userId: number, 
    encryptedSecret: string, 
    encryptedBackupCodes: string
  ): Promise<void> {
    // In production, use Redis or a temporary table
    // For now, store in a simple table
    await pool.query(
      `INSERT INTO pending_2fa_setups (user_id, secret, backup_codes, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')
       ON CONFLICT (user_id) DO UPDATE 
       SET secret = $2, backup_codes = $3, expires_at = NOW() + INTERVAL '15 minutes'`,
      [userId, encryptedSecret, encryptedBackupCodes]
    );
  }

  /**
   * Get pending 2FA setup
   */
  private static async getPendingSetup(userId: number): Promise<any> {
    const result = await pool.query(
      `SELECT secret, backup_codes 
       FROM pending_2fa_setups 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Clear pending 2FA setup
   */
  private static async clearPendingSetup(userId: number): Promise<void> {
    await pool.query(
      'DELETE FROM pending_2fa_setups WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Check if user has 2FA enabled
   */
  static async is2FAEnabled(userId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT is_2fa_enabled FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0]?.is_2fa_enabled || false;
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(
    userId: number, 
    companyId: string, 
    action: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, 'user', $4, NOW())`,
      [userId, companyId, action, userId]
    );
  }

  /**
   * Validate recovery code format
   */
  static isValidBackupCodeFormat(code: string): boolean {
    return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
  }

  /**
   * Get remaining backup codes count
   */
  static async getRemainingBackupCodesCount(userId: number, companyId: string): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT backup_codes FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]?.backup_codes) {
        return 0;
      }

      const decryptedCodes = await encryptionService.decryptBackupCodes(
        result.rows[0].backup_codes, 
        companyId
      );

      return decryptedCodes.length;
    } catch (error) {
      logger.error('Failed to get backup codes count:', error);
      return 0;
    }
  }
}

// Create the pending setups table
export const createPending2FATable = `
CREATE TABLE IF NOT EXISTS pending_2fa_setups (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_2fa_expires ON pending_2fa_setups(expires_at);
`;