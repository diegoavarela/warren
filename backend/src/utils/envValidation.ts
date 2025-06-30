import { logger } from './logger';

interface EnvVariable {
  name: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email';
  defaultValue?: string | number | boolean;
  validate?: (value: string) => boolean;
}

const ENV_VARIABLES: EnvVariable[] = [
  // Server Configuration
  { name: 'PORT', required: false, type: 'number', defaultValue: 3002 },
  { name: 'NODE_ENV', required: false, type: 'string', defaultValue: 'development' },
  
  // Database Configuration
  { name: 'DB_HOST', required: true, type: 'string' },
  { name: 'DB_PORT', required: true, type: 'number' },
  { name: 'DB_NAME', required: true, type: 'string' },
  { name: 'DB_USER', required: true, type: 'string' },
  { name: 'DB_PASSWORD', required: false, type: 'string' }, // Optional for local dev
  { name: 'DATABASE_URL', required: false, type: 'string' },
  
  // Authentication
  { name: 'JWT_SECRET', required: true, type: 'string', 
    validate: (value) => value.length >= 32 
  },
  
  // Encryption
  { name: 'ENCRYPTION_MASTER_KEY', required: true, type: 'string',
    validate: (value) => value.length === 44 // Base64 encoded 256-bit key
  },
  
  // Email Configuration
  { name: 'EMAIL_PROVIDER', required: false, type: 'string', defaultValue: 'smtp' },
  { name: 'EMAIL_FROM', required: false, type: 'email', defaultValue: 'noreply@warren.ai' },
  { name: 'EMAIL_FROM_NAME', required: false, type: 'string', defaultValue: 'Warren Finance' },
  { name: 'FRONTEND_URL', required: true, type: 'url' },
  
  // SMTP Configuration (conditional)
  { name: 'SMTP_HOST', required: false, type: 'string' },
  { name: 'SMTP_PORT', required: false, type: 'number' },
  { name: 'SMTP_SECURE', required: false, type: 'boolean' },
  { name: 'SMTP_USER', required: false, type: 'string' },
  { name: 'SMTP_PASS', required: false, type: 'string' },
  
  // AWS SES Configuration (conditional)
  { name: 'AWS_ACCESS_KEY_ID', required: false, type: 'string' },
  { name: 'AWS_SECRET_ACCESS_KEY', required: false, type: 'string' },
  { name: 'AWS_REGION', required: false, type: 'string' },
  
  // SendGrid Configuration (conditional)
  { name: 'SENDGRID_API_KEY', required: false, type: 'string' },
  
  // CORS Configuration
  { name: 'CORS_ORIGIN', required: false, type: 'string', defaultValue: 'http://localhost:3000' },
  
  // Logging
  { name: 'LOG_LEVEL', required: false, type: 'string', defaultValue: 'info' },
  
  // External APIs
  { name: 'EXCHANGE_RATE_API_KEY', required: false, type: 'string' },
  { name: 'OPENAI_API_KEY', required: false, type: 'string' },
  
  // Stripe Configuration (optional)
  { name: 'STRIPE_SECRET_KEY', required: false, type: 'string' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false, type: 'string' },
  { name: 'STRIPE_PRICE_ID_PROFESSIONAL', required: false, type: 'string' },
  { name: 'STRIPE_PRICE_ID_ENTERPRISE', required: false, type: 'string' },
];

export class EnvironmentValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Environment validation failed:\n${errors.join('\n')}`);
    this.name = 'EnvironmentValidationError';
  }
}

function validateType(value: string, type?: string): boolean {
  if (!type) return true;
  
  switch (type) {
    case 'number':
      return !isNaN(Number(value));
    case 'boolean':
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'string':
    default:
      return true;
  }
}

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if DATABASE_URL is provided (can replace individual DB settings)
  const hasDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';
  
  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name];
    
    // Skip individual DB config if DATABASE_URL is provided
    if (hasDatabaseUrl && ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].includes(envVar.name)) {
      continue;
    }
    
    // Check if required variable is missing or empty
    if (envVar.required && (!value || value.trim() === '')) {
      errors.push(`Missing or empty required environment variable: ${envVar.name}`);
      continue;
    }
    
    // Skip optional variables that are not set
    if (!envVar.required && !value) {
      // Set default value if provided
      if (envVar.defaultValue !== undefined) {
        process.env[envVar.name] = String(envVar.defaultValue);
      }
      continue;
    }
    
    // Validate type
    if (value && !validateType(value, envVar.type)) {
      errors.push(`Invalid type for ${envVar.name}: expected ${envVar.type}, got "${value}"`);
    }
    
    // Run custom validation
    if (value && envVar.validate && !envVar.validate(value)) {
      errors.push(`Invalid value for ${envVar.name}: custom validation failed`);
    }
  }
  
  // Validate database configuration - need either DATABASE_URL or individual settings
  if (!hasDatabaseUrl) {
    const dbVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
    const missingDb = dbVars.filter(v => !process.env[v] || process.env[v]!.trim() === '');
    if (missingDb.length > 0) {
      errors.push(`Database configuration incomplete. Missing: ${missingDb.join(', ')}. Alternatively, provide DATABASE_URL.`);
    }
    // DB_PASSWORD is optional for local development
    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.trim() === '') {
      warnings.push('DB_PASSWORD is empty. This may cause connection issues in production.');
    }
  }
  
  // Validate email provider configuration
  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
  if (emailProvider === 'smtp') {
    const smtpVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingSmtp = smtpVars.filter(v => !process.env[v]);
    if (missingSmtp.length > 0) {
      warnings.push(`SMTP configuration incomplete. Missing: ${missingSmtp.join(', ')}`);
    }
  } else if (emailProvider === 'ses') {
    const sesVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    const missingSes = sesVars.filter(v => !process.env[v]);
    if (missingSes.length > 0) {
      warnings.push(`AWS SES configuration incomplete. Missing: ${missingSes.join(', ')}`);
    }
  } else if (emailProvider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    warnings.push('SendGrid API key is missing');
  }
  
  // Validate Stripe configuration if any Stripe variable is set
  const stripeVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID_PROFESSIONAL', 'STRIPE_PRICE_ID_ENTERPRISE'];
  const hasAnyStripe = stripeVars.some(v => process.env[v]);
  if (hasAnyStripe) {
    const missingStripe = stripeVars.filter(v => !process.env[v]);
    if (missingStripe.length > 0) {
      warnings.push(`Stripe configuration incomplete. Missing: ${missingStripe.join(', ')}`);
    }
  }
  
  // Log warnings
  warnings.forEach(warning => logger.warn(warning));
  
  // Throw error if there are validation errors
  if (errors.length > 0) {
    throw new EnvironmentValidationError(errors);
  }
  
  logger.info('Environment variables validated successfully');
}

// Export for testing
export const _testExports = {
  ENV_VARIABLES,
  validateType
};