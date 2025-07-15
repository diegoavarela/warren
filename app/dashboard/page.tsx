"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ROLES } from '@/lib/auth/rbac';

function DashboardRouter({ user }: { user: any }) {
  const router = useRouter();

  useEffect(() => {
    if (user) {
      console.log('Dashboard routing - User:', user);
      
      // First check organization-level roles (these take priority)
      switch (user.role) {
        case ROLES.ORG_ADMIN:
        case 'admin':
          router.replace('/dashboard/org-admin');
          return;
        case ROLES.SUPER_ADMIN:
        case 'super_admin':
          // This case is handled in MainDashboard, but include for completeness
          return;
      }
      
      // Then check company-level access for other roles
      const hasCompanyAccess = user.companyAccess && user.companyAccess.length > 0;
      
      if (hasCompanyAccess) {
        const primaryCompanyRole = user.companyAccess[0].role;
        const companyId = user.companyAccess[0].companyId;
        
        switch (primaryCompanyRole) {
          case ROLES.COMPANY_ADMIN:
          case 'company_admin':
            router.replace('/dashboard/company-admin');
            break;
          case ROLES.COMPANY_USER:
          case 'user':
          case ROLES.COMPANY_VIEWER:
          case 'viewer':
            // For company employees, automatically set company context and redirect to company admin view
            if (companyId) {
              sessionStorage.setItem('selectedCompanyId', companyId);
              router.replace('/dashboard/company-admin');
            } else {
              router.replace('/dashboard/user');
            }
            break;
          default:
            router.replace('/unauthorized');
        }
      } else {
        // No company access, check user role
        switch (user.role) {
          case ROLES.COMPANY_USER:
          case 'user':
          case ROLES.COMPANY_VIEWER:
          case 'viewer':
            router.replace('/dashboard/user');
            break;
          default:
            router.replace('/unauthorized');
        }
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

function MainDashboard({ user }: { user: any }) {
  const router = useRouter();
  
  useEffect(() => {
    // Platform admin should be redirected to their dedicated dashboard
    if (user?.role === ROLES.SUPER_ADMIN || user?.role === 'super_admin') {
      router.replace('/dashboard/platform-admin');
    }
  }, [user, router]);

  // For platform admin, show loading while redirecting
  if (user?.role === ROLES.SUPER_ADMIN || user?.role === 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Redirecting to admin panel...</p>
        </div>
      </div>
    );
  }

  // For other users, continue with routing logic
  return <DashboardRouter user={user} />;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  
  // Ensure we have a stable user state before rendering
  if (isLoading || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute>
      <MainDashboard user={user} />
    </ProtectedRoute>
  );
}