import crypto from 'crypto';

// In production, this should come from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here-change-me!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts sensitive financial data
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)), 
    iv
  );
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts sensitive financial data
 */
export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)), 
    iv
  );
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

/**
 * Encrypts an entire object by converting to JSON
 */
export function encryptObject(obj: any): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypts a string back to an object
 */
export function decryptObject<T>(encryptedStr: string): T {
  return JSON.parse(decrypt(encryptedStr));
}

/**
 * Encrypts specific sensitive fields in financial data
 */
export function encryptFinancialData(data: any): any {
  const sensitiveFields = ['amount', 'accountCode', 'accountName', 'balance'];
  
  const encryptedData = { ...data };
  
  // Recursively encrypt sensitive fields
  const encryptFields = (obj: any) => {
    for (const key in obj) {
      if (sensitiveFields.includes(key) && typeof obj[key] === 'string' || typeof obj[key] === 'number') {
        obj[key] = encrypt(String(obj[key]));
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        encryptFields(obj[key]);
      }
    }
  };
  
  encryptFields(encryptedData);
  return encryptedData;
}