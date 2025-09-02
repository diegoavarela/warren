// Role-Based Access Control (RBAC) for Multi-tenant Warren App
import { NextRequest, NextResponse } from 'next/server';
import { db, companyUsers, companies, users, eq } from '@/lib/db';
import { verifyJWT } from './jwt';

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
  MANAGE_USERS: 'manage_users',
  
  // Company level
  MANAGE_COMPANY: 'manage_company',
  UPLOAD_FILES: 'upload_files',
  VIEW_FINANCIAL_DATA: 'view_financial_data',
  EDIT_FINANCIAL_DATA: 'edit_financial_data',
  DELETE_FINANCIAL_DATA: 'delete_financial_data',
  MANAGE_COMPANY_USERS: 'manage_company_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-Permission mapping - Simplified to 3 roles
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.PLATFORM_ADMIN]: [
    // Platform admin has all permissions
    PERMISSIONS.CREATE_COMPANY,
    PERMISSIONS.DELETE_COMPANY,
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_COMPANY,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.EDIT_FINANCIAL_DATA,
    PERMISSIONS.DELETE_FINANCIAL_DATA,
    PERMISSIONS.MANAGE_COMPANY_USERS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.ORGANIZATION_ADMIN]: [
    // Org admin can manage their organization and companies within it
    PERMISSIONS.CREATE_COMPANY,
    PERMISSIONS.DELETE_COMPANY,
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_COMPANY,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.EDIT_FINANCIAL_DATA,
    PERMISSIONS.DELETE_FINANCIAL_DATA,
    PERMISSIONS.MANAGE_COMPANY_USERS,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.USER]: [
    // Regular users can access assigned companies with limited permissions
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_FINANCIAL_DATA,
    PERMISSIONS.EDIT_FINANCIAL_DATA
  ]
};

// User context with company access
export interface UserContext {
  id: string;
  email: string;
  organizationId: string;
  role: Role; // Organization-level role
  companyAccess?: {
    companyId: string;
    role: Role; // Company-level role
    permissions: Permission[];
  }[];
}

// Check if user has permission
export function hasPermission(user: UserContext, permission: Permission, companyId?: string): boolean {

  // Check organization-level permissions
  const orgPermissions = ROLE_PERMISSIONS[user.role] || [];
  const hasOrgPermission = orgPermissions.includes(permission);
  
  if (hasOrgPermission) {
    return true;
  }
  
  // Check company-level permissions if companyId provided
  if (companyId && user.companyAccess) {
    const companyAccess = user.companyAccess.find(access => access.companyId === companyId);
    
    if (companyAccess && companyAccess.permissions.includes(permission)) {
      return true;
    }
  }
  return false;
}

// Get user's accessible companies
export function getAccessibleCompanies(user: UserContext): string[] {
  if (user.role === ROLES.PLATFORM_ADMIN || user.role === ROLES.ORGANIZATION_ADMIN) {
    // Platform and org admins can access all companies (platform admin = all orgs, org admin = their org)
    return ['*']; // Wildcard for all companies
  }
  
  // Regular users return specific companies they have access to
  return user.companyAccess?.map(access => access.companyId) || [];
}

// Load user's company access from database
export async function loadUserCompanyAccess(userId: string): Promise<UserContext['companyAccess']> {
  try {
    const userCompanies = await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.userId, userId))
      .where(eq(companyUsers.isActive, true));

    return userCompanies.map((uc: any) => ({
      companyId: uc.companyId,
      role: uc.role as Role,
      permissions: ROLE_PERMISSIONS[uc.role as Role] || []
    }));
  } catch (error) {
    console.error('Failed to load user company access:', error);
    return [];
  }
}

// Middleware to enforce company access
export function requireCompanyAccess(permission: Permission) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, user: UserContext, companyId: string) => Promise<NextResponse>
  ) => {
    try {
      // Extract companyId from request (URL param, body, etc.)
      const url = new URL(request.url);
      let companyId = url.searchParams.get('companyId');
      
      if (!companyId && request.method !== 'GET') {
        const body = await request.json();
        companyId = body.companyId;
      }
      
      if (!companyId) {
        return NextResponse.json(
          { error: 'Company ID is required' },
          { status: 400 }
        );
      }
      
      // Get user from auth middleware (this should be set by withAuth)
      const authHeader = request.headers.get('x-user-context');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'User context not found' },
          { status: 401 }
        );
      }
      
      const user: UserContext = JSON.parse(authHeader);
      
      // Check if user has required permission for this company
      if (!hasPermission(user, permission, companyId)) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            required: permission,
            companyId 
          },
          { status: 403 }
        );
      }
      
      return await handler(request, user, companyId);
      
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json(
        { error: 'Access control error' },
        { status: 500 }
      );
    }
  };
}

// Enhanced auth middleware with RBAC
export async function withRBAC(
  request: NextRequest,
  handler: (request: NextRequest, user: UserContext) => Promise<NextResponse>
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const url = new URL(request.url);

    // Mock auth for development - temporarily bypass org check
    if (process.env.NODE_ENV === 'development' && token === 'mock-session-token') {
      
      const mockUser: UserContext = {
        id: 'clz1234567890abcdef', // CUID2 format
        email: 'platform@warren.com', 
        organizationId: 'clz1234567890abcdef', // Use same ID to avoid FK constraint
        role: ROLES.PLATFORM_ADMIN,
        companyAccess: [
          // Add explicit company access for the test company
          {
            companyId: 'b1dea3ff-cac4-45cc-be78-5488e612c2a8', // VTEX Solutions SRL
            role: ROLES.PLATFORM_ADMIN,
            permissions: [
              PERMISSIONS.VIEW_FINANCIAL_DATA,
              PERMISSIONS.EDIT_FINANCIAL_DATA,
              PERMISSIONS.MANAGE_COMPANY,
              PERMISSIONS.UPLOAD_FILES
            ]
          }
        ]
      };
      
      return await handler(request, mockUser);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify JWT (reuse existing logic)
    const payload = await verifyJWT(token);
    
    // Load user's company access
    const companyAccess = await loadUserCompanyAccess(payload.userId);
    
    // Create enhanced user context
    const user: UserContext = {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role as Role,
      companyAccess
    };

    return await handler(request, user);

  } catch (error) {
    console.error('RBAC auth middleware error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

/**
 * Check if user has access to a specific company with required roles
 */
export async function hasCompanyAccess(
  userId: string, 
  companyId: string, 
  requiredRoles: string[]
): Promise<boolean> {
  try {
    // First, check if user is an organization admin for this company's organization
    const userResult = await db.select({
      id: users.id,
      role: users.role,
      organizationId: users.organizationId
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (userResult.length === 0) {
      return false;
    }
    
    const user = userResult[0];
    
    // Platform and organization admins have access to companies
    if (user.role === 'organization_admin' || user.role === 'platform_admin') {
      // Check if the company belongs to the user's organization
      const companyResult = await db.select({
        organizationId: companies.organizationId
      }).from(companies).where(eq(companies.id, companyId)).limit(1);
      
      if (companyResult.length > 0) {
        const company = companyResult[0];
        
        // Platform admins have access to all companies
        if (user.role === 'platform_admin') {
          return true;
        }
        
        // Organization admins have access to companies in their organization
        if (user.role === 'organization_admin' && company.organizationId === user.organizationId) {
          return true;
        }
      }
    }
    
    // Load user's company access for non-admin users or cross-organization access
    const companyAccess = await loadUserCompanyAccess(userId);
    
    // Check if user has access to the company with one of the required roles
    const access = companyAccess?.find(ca => ca.companyId === companyId);
    
    if (!access) {
      return false;
    }
    
    // Check if user's role for this company is in the required roles
    return requiredRoles.includes(access.role);
    
  } catch (error) {
    console.error('Error checking company access:', error);
    return false;
  }
}