/**
 * Security utilities for the Warren Admin Portal
 * Prevents credential exposure and implements security best practices
 */

import { NextRequest, NextResponse } from 'next/server';

// Sensitive parameters that should never appear in URLs
const SENSITIVE_PARAMETERS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
  'pass',
];

// Security incident types
export enum SecurityIncidentType {
  SENSITIVE_URL_PARAMETER = 'sensitive_url_parameter',
  CSRF_ATTEMPT = 'csrf_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

/**
 * Check if URL contains sensitive parameters
 */
export function hasSensitiveParameters(url: string): boolean {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  
  for (const param of params.keys()) {
    if (SENSITIVE_PARAMETERS.some(sensitive => 
      param.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * Remove sensitive parameters from URL
 */
export function sanitizeUrl(url: string): string {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  
  // Remove sensitive parameters
  for (const param of params.keys()) {
    if (SENSITIVE_PARAMETERS.some(sensitive => 
      param.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      params.delete(param);
    }
  }
  
  return urlObj.toString();
}

/**
 * Log security incident (never log sensitive data)
 */
export function logSecurityIncident(
  type: SecurityIncidentType, 
  details: { ip?: string; userAgent?: string; path?: string; severity?: 'low' | 'medium' | 'high' }
): void {
  const incident = {
    type,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    path: details.path || 'unknown',
    severity: details.severity || 'medium',
  };
  
  // In production, this would go to a proper logging service
  console.warn('🚨 SECURITY INCIDENT:', JSON.stringify(incident, null, 2));
}

/**
 * Middleware function to sanitize URLs and prevent credential exposure
 */
export function sanitizeUrlMiddleware(request: NextRequest): NextResponse | null {
  const url = request.url;
  
  if (hasSensitiveParameters(url)) {
    // Log security incident
    logSecurityIncident(SecurityIncidentType.SENSITIVE_URL_PARAMETER, {
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      path: request.nextUrl.pathname,
      severity: 'high'
    });
    
    // Redirect to sanitized URL
    const sanitizedUrl = sanitizeUrl(url);
    const sanitizedNextUrl = new URL(sanitizedUrl);
    
    return NextResponse.redirect(sanitizedNextUrl);
  }
  
  return null; // Continue with normal processing
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length > 20;
}

/**
 * Rate limiting store (in production, use Redis or similar)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if request should be rate limited
 */
export function isRateLimited(
  identifier: string, 
  maxAttempts: number = 5, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxAttempts) {
    // Rate limit exceeded
    logSecurityIncident(SecurityIncidentType.RATE_LIMIT_EXCEEDED, {
      ip: identifier,
      severity: 'high'
    });
    return true;
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return false;
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  return request.ip || 
         request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Security headers for responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self';
    frame-ancestors 'none';
  `.replace(/\s+/g, ' ').trim(),
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}