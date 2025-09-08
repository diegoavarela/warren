// Client-safe authentication constants
// These can be imported in client-side components

// Role definitions - Simplified to 3 roles
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',    // Can manage everything across all organizations
  ORGANIZATION_ADMIN: 'organization_admin', // Can manage their organization and its companies
  USER: 'user'                         // Can access companies they're assigned to
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Permission definitions
export const PERMISSIONS = {
  // Organization level
  CREATE_COMPANY: 'create_company',
  DELETE_COMPANY: 'delete_company',
  MANAGE_ORGANIZATION: 'manage_organization',
  
  // Company level
  MANAGE_COMPANY: 'manage_company',
  VIEW_COMPANY: 'view_company',
  
  // Financial data
  VIEW_FINANCIAL_DATA: 'view_financial_data',
  EDIT_FINANCIAL_DATA: 'edit_financial_data',
  DELETE_FINANCIAL_DATA: 'delete_financial_data',
  MANAGE_FINANCIAL_DATA: 'manage_financial_data',
  UPLOAD_FILES: 'upload_files',
  UPLOAD_DATA: 'upload_data',
  
  // User management
  INVITE_USERS: 'invite_users',
  MANAGE_USERS: 'manage_users',
  MANAGE_COMPANY_USERS: 'manage_company_users',
  
  // Templates and subcategories
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_SUBCATEGORIES: 'manage_subcategories',
  
  // Audit and monitoring
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Platform administration
  MANAGE_PLATFORM: 'manage_platform',
  VIEW_ANALYTICS: 'view_analytics'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];