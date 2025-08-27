import crypto from 'crypto';

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
  return crypto.randomBytes(20).toString('base32');
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
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let value = 0;
  
  for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 character');
    }
    bits += index.toString(2).padStart(5, '0');
  }
  
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substr(i, 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return Buffer.from(bytes);
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
  config: TOTPConfig = DEFAULT_CONFIG,
  windowSize: number = 1
): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000 / config.period));
  
  for (let i = -windowSize; i <= windowSize; i++) {
    const timeStep = now + BigInt(i);
    const expectedToken = generateHOTP(secret, timeStep, config.digits);
    
    if (constantTimeCompare(token, expectedToken)) {
      return true;
    }
  }
  
  return false;
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

export function verifyBackupCode(code: string, storedCodes: string[]): boolean {
  const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
  return storedCodes.some(stored => {
    const normalizedStored = stored.replace(/[-\s]/g, '').toUpperCase();
    return constantTimeCompare(normalizedCode, normalizedStored);
  });
}

export function removeUsedBackupCode(code: string, storedCodes: string[]): string[] {
  const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
  return storedCodes.filter(stored => {
    const normalizedStored = stored.replace(/[-\s]/g, '').toUpperCase();
    return !constantTimeCompare(normalizedCode, normalizedStored);
  });
}