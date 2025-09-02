import crypto from 'crypto';
import * as base32 from 'thirty-two';

export interface TOTPConfig {
  issuer: string;
  digits: number;
  period: number;
  algorithm: string;
}

const DEFAULT_CONFIG: TOTPConfig = {
  issuer: 'Warren Admin Portal',
  digits: 6,
  period: 30,
  algorithm: 'SHA1'
};

export function generateSecret(): string {
  return base32.encode(crypto.randomBytes(20)).toString();
}

export function generateQRCodeURL(secret: string, userEmail: string, config: TOTPConfig = DEFAULT_CONFIG): string {
  const params = new URLSearchParams({
    secret,
    issuer: config.issuer,
    algorithm: config.algorithm,
    digits: config.digits.toString(),
    period: config.period.toString()
  });

  return `otpauth://totp/${encodeURIComponent(config.issuer)}:${encodeURIComponent(userEmail)}?${params.toString()}`;
}

export function base32Decode(encoded: string): Buffer {
  return Buffer.from(base32.decode(encoded));
}

export function generateHOTP(secret: string, counter: bigint, digits: number = 6): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) >>> 0;
  
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

export function generateTOTP(secret: string, config: TOTPConfig = DEFAULT_CONFIG): string {
  const timeStep = BigInt(Math.floor(Date.now() / 1000 / config.period));
  return generateHOTP(secret, timeStep, config.digits);
}

export function verifyTOTP(
  token: string, 
  secret: string, 
  window: number = 1, 
  config: TOTPConfig = DEFAULT_CONFIG
): boolean {
  const timeStep = Math.floor(Date.now() / 1000 / config.period);
  
  for (let i = -window; i <= window; i++) {
    const testStep = BigInt(timeStep + i);
    const testToken = generateHOTP(secret, testStep, config.digits);
    
    if (testToken === token) {
      return true;
    }
  }
  
  return false;
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

export function verifyBackupCode(code: string, validCodes: string[]): boolean {
  return validCodes.includes(code.toUpperCase());
}

export function removeUsedBackupCode(code: string, validCodes: string[]): string[] {
  return validCodes.filter(c => c !== code.toUpperCase());
}