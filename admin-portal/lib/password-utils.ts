import bcrypt from 'bcrypt';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxLength?: number;
  preventReuse?: boolean;
  reuseCount?: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  maxLength: 128,
  preventReuse: true,
  reuseCount: 3
};

export interface PasswordStrengthResult {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

export function validatePassword(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): PasswordStrengthResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length validation
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  } else {
    score += Math.min(25, (password.length / policy.minLength) * 15);
  }

  if (policy.maxLength && password.length > policy.maxLength) {
    errors.push(`Password must be no more than ${policy.maxLength} characters long`);
  }

  // Character type validation
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (policy.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
    suggestions.push('Add an uppercase letter (A-Z)');
  } else if (hasUppercase) {
    score += 15;
  }

  if (policy.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
    suggestions.push('Add a lowercase letter (a-z)');
  } else if (hasLowercase) {
    score += 15;
  }

  if (policy.requireNumbers && !hasNumbers) {
    errors.push('Password must contain at least one number');
    suggestions.push('Add a number (0-9)');
  } else if (hasNumbers) {
    score += 15;
  }

  if (policy.requireSymbols && !hasSymbols) {
    errors.push('Password must contain at least one special character');
    suggestions.push('Add a special character (!@#$%^&*...)');
  } else if (hasSymbols) {
    score += 15;
  }

  // Additional strength checks
  if (password.length >= 12) score += 10;
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('Avoid repeating the same character multiple times');
  }

  // Common patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /login/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 20;
      suggestions.push('Avoid common words and patterns');
      break;
    }
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (score >= 80) strength = 'strong';
  else if (score >= 60) strength = 'good';
  else if (score >= 40) strength = 'fair';

  return {
    isValid: errors.length === 0,
    strength,
    score: Math.max(0, Math.min(100, score)),
    errors,
    suggestions
  };
}

export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*(),.?":{}|<>';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTempPassword(): string {
  // Generate a temporary password that meets policy requirements
  const words = ['Admin', 'User', 'Temp', 'Pass', 'New', 'Reset'];
  const word = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
  const symbol = '!@#$%'[Math.floor(Math.random() * 5)];
  
  return `${word}${number}${symbol}`;
}