import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db';
import { getClientIP } from './utils';

export type AuditAction = 
  // Authentication actions
  | 'login' | 'logout' | 'failed_login'
  // Generic CRUD actions
  | 'create' | 'update' | 'delete'
  // User management actions
  | 'invite' | 'activate' | 'deactivate'
  | 'reset_password' | 'change_password'
  // Feature management actions
  | 'enable_feature' | 'disable_feature'
  // Data operations
  | 'export_data' | 'copy_data' | 'view_sensitive'
  // Warren-specific dashboard actions
  | 'view_pnl' | 'view_cashflow' | 'view_dashboard'
  // Warren-specific configuration actions
  | 'create_configuration' | 'update_configuration' | 'delete_configuration'
  | 'validate_configuration' | 'activate_configuration'
  // Warren-specific data processing actions
  | 'upload_file' | 'process_data' | 'delete_file'
  // Warren-specific export actions
  | 'export_pdf' | 'export_csv' | 'export_json'
  // Warren-specific AI actions
  | 'use_ai_chat' | 'ai_analysis'
  // Warren-specific template actions
  | 'create_template' | 'update_template' | 'delete_template'
  | 'import_template' | 'export_template'
  // Warren-specific help/manual actions
  | 'view_manual' | 'view_help';

export type AuditResource = 
  // Admin portal resources
  | 'user' | 'organization' | 'company' 
  | 'feature_flag' | 'system_setting'
  | 'audit_log' | 'session' | 'data'
  // Warren-specific resources
  | 'configuration' | 'financial_data' | 'dashboard'
  | 'template' | 'ai_chat' | 'export'
  | 'upload' | 'manual' | 'help';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogData {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  userId?: string;
  organizationId?: string;
  companyId?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  severity?: AuditSeverity;
  source?: string;
}

export interface AuditContext {
  request?: NextRequest;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Main audit logging function
 */
export async function logAudit(
  data: AuditLogData,
  context: AuditContext = {}
): Promise<void> {
  try {
    const auditEntry: NewAuditLog = {
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      userId: data.userId,
      organizationId: data.organizationId,
      companyId: data.companyId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      severity: data.severity ?? 'info',
      source: data.source ?? 'admin-portal',
      ipAddress: context.ipAddress ?? (context.request ? getClientIP(context.request) : null),
      userAgent: context.userAgent ?? context.request?.headers.get('user-agent') ?? null,
      sessionId: context.sessionId,
    };

    await db.insert(auditLogs).values(auditEntry);
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Convenience functions for common audit operations
 */
export async function logAuthentication(
  action: 'login' | 'logout' | 'failed_login',
  userId: string | null,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'session',
      userId: userId ?? undefined,
      metadata,
      severity: action === 'failed_login' ? 'warning' : 'info',
      success: action !== 'failed_login',
    },
    { request }
  );
}

export async function logUserAction(
  action: AuditAction,
  targetUserId: string,
  performedBy: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'user',
      resourceId: targetUserId,
      userId: performedBy,
      metadata,
    },
    { request }
  );
}

export async function logOrganizationAction(
  action: AuditAction,
  organizationId: string,
  performedBy: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'organization',
      resourceId: organizationId,
      organizationId,
      userId: performedBy,
      metadata,
    },
    { request }
  );
}

export async function logCompanyAction(
  action: AuditAction,
  companyId: string,
  organizationId: string,
  performedBy: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'company',
      resourceId: companyId,
      companyId,
      organizationId,
      userId: performedBy,
      metadata,
    },
    { request }
  );
}

export async function logFeatureFlagAction(
  action: AuditAction,
  featureId: string,
  organizationId: string | undefined,
  performedBy: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'feature_flag',
      resourceId: featureId,
      organizationId,
      userId: performedBy,
      metadata,
    },
    { request }
  );
}

export async function logSecurityEvent(
  action: AuditAction,
  resource: AuditResource,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>,
  severity: AuditSeverity = 'warning'
) {
  await logAudit(
    {
      action,
      resource,
      userId,
      metadata,
      severity,
    },
    { request }
  );
}

/**
 * Helper to extract user information from JWT token for audit logging
 */
export function extractAuditUser(request: NextRequest): { userId?: string; sessionId?: string } {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return {};

    // This is a simplified version - in production you'd properly decode the JWT
    // For now, we'll extract from headers or context set by middleware
    const userId = request.headers.get('x-user-id');
    const sessionId = request.headers.get('x-session-id');

    return { 
      userId: userId || undefined, 
      sessionId: sessionId || undefined 
    };
  } catch {
    return {};
  }
}