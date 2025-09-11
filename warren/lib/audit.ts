import { NextRequest } from 'next/server';
import { db, auditLogs, companies, eq, type NewAuditLog } from '@/shared/db';

// Import types from admin portal
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
 * Get organization ID from company ID
 */
async function getOrganizationIdFromCompany(companyId: string): Promise<string | null> {
  try {
    const result = await db
      .select({ organizationId: companies.organizationId })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    return result[0]?.organizationId || null;
  } catch (error) {
    console.error('Failed to get organization ID from company:', error);
    return null;
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || remoteAddr || null;
}

/**
 * Main audit logging function for Warren app
 */
export async function logAudit(
  data: AuditLogData,
  context: AuditContext = {}
): Promise<void> {
  try {
    // If company ID is provided but organization ID is not, try to get it from company
    let organizationId = data.organizationId;
    if (!organizationId && data.companyId) {
      const orgId = await getOrganizationIdFromCompany(data.companyId);
      organizationId = orgId || undefined;
    }

    const auditEntry: NewAuditLog = {
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      userId: data.userId,
      organizationId: organizationId,
      companyId: data.companyId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      severity: data.severity ?? 'info',
      source: data.source ?? 'warren-app',
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
 * Log dashboard view activity
 */
export async function logDashboardView(
  dashboardType: 'pnl' | 'cashflow',
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action: dashboardType === 'pnl' ? 'view_pnl' : 'view_cashflow',
      resource: 'dashboard',
      resourceId: `${dashboardType}-${companyId}`,
      userId,
      companyId,
      metadata: {
        dashboardType,
        ...metadata
      },
    },
    { request }
  );
}

/**
 * Log configuration actions
 */
export async function logConfigurationAction(
  action: 'create_configuration' | 'update_configuration' | 'delete_configuration' | 'validate_configuration' | 'activate_configuration',
  configurationId: string,
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'configuration',
      resourceId: configurationId,
      userId,
      companyId,
      metadata,
    },
    { request }
  );
}

/**
 * Log data processing actions
 */
export async function logDataProcessing(
  action: 'upload_file' | 'process_data' | 'delete_file',
  resourceId: string,
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  const resourceType = action === 'upload_file' || action === 'delete_file' ? 'upload' : 'financial_data';
  
  await logAudit(
    {
      action,
      resource: resourceType,
      resourceId,
      userId,
      companyId,
      metadata,
    },
    { request }
  );
}

/**
 * Log export actions
 */
export async function logExportAction(
  format: 'pdf' | 'csv' | 'json',
  exportType: string,
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  const action: AuditAction = format === 'pdf' ? 'export_pdf' : format === 'csv' ? 'export_csv' : 'export_json';
  
  await logAudit(
    {
      action,
      resource: 'export',
      resourceId: `${exportType}-${format}`,
      userId,
      companyId,
      metadata: {
        format,
        exportType,
        ...metadata
      },
    },
    { request }
  );
}

/**
 * Log AI interaction
 */
export async function logAIInteraction(
  action: 'use_ai_chat' | 'ai_analysis',
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'ai_chat',
      resourceId: `${companyId}-${action}`,
      userId,
      companyId,
      metadata,
    },
    { request }
  );
}

/**
 * Log template actions
 */
export async function logTemplateAction(
  action: 'create_template' | 'update_template' | 'delete_template' | 'import_template' | 'export_template',
  templateId: string,
  companyId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action,
      resource: 'template',
      resourceId: templateId,
      userId,
      companyId,
      metadata,
    },
    { request }
  );
}

/**
 * Log help/manual views
 */
export async function logHelpView(
  helpType: 'manual' | 'help',
  resourceId: string,
  userId: string,
  request: NextRequest,
  metadata?: Record<string, any>
) {
  await logAudit(
    {
      action: helpType === 'manual' ? 'view_manual' : 'view_help',
      resource: helpType,
      resourceId,
      userId,
      metadata,
    },
    { request }
  );
}

/**
 * Helper to extract user information from request for audit logging
 */
export function extractAuditUser(request: NextRequest): { userId?: string; sessionId?: string } {
  try {
    // Extract from headers set by middleware or auth
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

/**
 * Alias for logAudit to maintain compatibility
 */
export const logAuditEvent = logAudit;