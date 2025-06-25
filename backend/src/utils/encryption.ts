import crypto from 'crypto';
import { logger } from './logger';

interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
  version: number;
}

/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits
  private readonly iterations = 100000; // PBKDF2 iterations
  private readonly version = 1; // Encryption version for future compatibility

  private masterKey: Buffer;
  private companyKeys: Map<string, Buffer> = new Map();

  private constructor() {
    // Initialize master key from environment
    const masterKeyBase64 = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKeyBase64) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }
    
    this.masterKey = Buffer.from(masterKeyBase64, 'base64');
    if (this.masterKey.length !== this.keyLength) {
      throw new Error(`Master key must be ${this.keyLength} bytes`);
    }
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate a new encryption key
   */
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('base64');
  }

  /**
   * Derive a key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Get or generate company-specific encryption key
   */
  private async getCompanyKey(companyId: string): Promise<Buffer> {
    if (this.companyKeys.has(companyId)) {
      return this.companyKeys.get(companyId)!;
    }

    // In production, fetch from database
    // For now, derive from master key + company ID
    const salt = Buffer.from(companyId, 'utf-8');
    const companyKey = this.deriveKey(this.masterKey.toString('base64'), salt);
    this.companyKeys.set(companyId, companyKey);
    
    return companyKey;
  }

  /**
   * Encrypt a string value
   */
  async encryptString(plaintext: string, companyId: string): Promise<string> {
    try {
      const key = await this.getCompanyKey(companyId);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      // Combine version, iv, tag, and encrypted data
      const combined = Buffer.concat([
        Buffer.from([this.version]), // 1 byte version
        iv, // 16 bytes
        tag, // 16 bytes
        encrypted
      ]);

      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string value
   */
  async decryptString(encryptedData: string, companyId: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const version = combined[0];
      if (version !== this.version) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      const iv = combined.slice(1, 1 + this.ivLength);
      const tag = combined.slice(1 + this.ivLength, 1 + this.ivLength + this.tagLength);
      const encrypted = combined.slice(1 + this.ivLength + this.tagLength);

      const key = await this.getCompanyKey(companyId);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt a number (stores as encrypted string)
   */
  async encryptNumber(value: number, companyId: string): Promise<string> {
    return this.encryptString(value.toString(), companyId);
  }

  /**
   * Decrypt a number
   */
  async decryptNumber(encryptedData: string, companyId: string): Promise<number> {
    const decrypted = await this.decryptString(encryptedData, companyId);
    const num = parseFloat(decrypted);
    if (isNaN(num)) {
      throw new Error('Decrypted value is not a valid number');
    }
    return num;
  }

  /**
   * Encrypt an array of numbers
   */
  async encryptNumberArray(values: number[], companyId: string): Promise<string> {
    const jsonString = JSON.stringify(values);
    return this.encryptString(jsonString, companyId);
  }

  /**
   * Decrypt an array of numbers
   */
  async decryptNumberArray(encryptedData: string, companyId: string): Promise<number[]> {
    const decrypted = await this.decryptString(encryptedData, companyId);
    return JSON.parse(decrypted);
  }

  /**
   * Encrypt an object with numeric fields
   */
  async encryptObject(obj: any, companyId: string, fieldsToEncrypt: string[]): Promise<any> {
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (field in obj && obj[field] !== null && obj[field] !== undefined) {
        const value = obj[field];
        if (typeof value === 'number') {
          encrypted[`${field}_encrypted`] = await this.encryptNumber(value, companyId);
          delete encrypted[field];
        } else if (Array.isArray(value) && value.every(v => typeof v === 'number')) {
          encrypted[`${field}_encrypted`] = await this.encryptNumberArray(value, companyId);
          delete encrypted[field];
        }
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt an object with encrypted numeric fields
   */
  async decryptObject(obj: any, companyId: string, fieldsToDecrypt: string[]): Promise<any> {
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      const encryptedField = `${field}_encrypted`;
      if (encryptedField in obj && obj[encryptedField]) {
        try {
          // Try to decrypt as array first
          if (obj[encryptedField].includes('[')) {
            decrypted[field] = await this.decryptNumberArray(obj[encryptedField], companyId);
          } else {
            decrypted[field] = await this.decryptNumber(obj[encryptedField], companyId);
          }
          delete decrypted[encryptedField];
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Generate a TOTP secret and encrypt it
   */
  async generateEncryptedTOTPSecret(companyId: string): Promise<{ encrypted: string; qrData: string }> {
    const secret = crypto.randomBytes(20).toString('base32');
    const encrypted = await this.encryptString(secret, companyId);
    
    // Generate QR code data (this would be used with otplib)
    const qrData = `otpauth://totp/Warren:user@example.com?secret=${secret}&issuer=Warren`;
    
    return { encrypted, qrData };
  }

  /**
   * Hash a value with SHA-256 (for non-reversible data)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate secure random backup codes
   */
  async generateBackupCodes(count: number = 10): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Encrypt backup codes
   */
  async encryptBackupCodes(codes: string[], companyId: string): Promise<string> {
    return this.encryptString(JSON.stringify(codes), companyId);
  }

  /**
   * Decrypt backup codes
   */
  async decryptBackupCodes(encryptedCodes: string, companyId: string): Promise<string[]> {
    const decrypted = await this.decryptString(encryptedCodes, companyId);
    return JSON.parse(decrypted);
  }

  /**
   * Rotate encryption key for a company
   */
  async rotateCompanyKey(companyId: string): Promise<void> {
    // Generate new key
    const newKey = crypto.randomBytes(this.keyLength);
    
    // In production, this would:
    // 1. Fetch all encrypted data for the company
    // 2. Decrypt with old key
    // 3. Encrypt with new key
    // 4. Update database
    // 5. Update key version
    
    this.companyKeys.set(companyId, newKey);
    logger.info(`Rotated encryption key for company ${companyId}`);
  }

  /**
   * Clear cached keys (for security)
   */
  clearCache(): void {
    this.companyKeys.clear();
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();