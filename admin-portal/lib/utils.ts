import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers
 */
export function getClientIP(request: NextRequest): string | null {
  // Check for forwarded IP addresses (common in production behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Vercel
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback to connection remote address (less reliable)
  const remoteAddress = request.headers.get('x-forwarded-host');
  if (remoteAddress) {
    return remoteAddress;
  }

  // In development/localhost, this might not be available
  return null;
}

/**
 * Format date for display in audit logs
 */
export function formatAuditDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Sanitize metadata for audit logging (remove sensitive data)
 */
export function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  
  // Remove sensitive fields
  const sensitiveKeys = [
    'password', 'passwordHash', 'token', 'secret', 
    'apiKey', 'privateKey', 'ssn', 'creditCard'
  ];
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}