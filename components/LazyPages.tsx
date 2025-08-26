/**
 * Lazy Loading Page Components
 * 
 * Route-level lazy loading to improve initial bundle splitting and
 * reduce the size of each page bundle.
 */

import { lazy, Suspense } from 'react';
import { AppLayout } from './AppLayout';

// Page loading fallback
const PageLoader = ({ pageName }: { pageName?: string }) => (
  <AppLayout showFooter={true}>
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4 p-8">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lg font-medium text-gray-900">
          Loading {pageName || 'Page'}...
        </div>
        <div className="text-sm text-gray-600">
          Preparing your dashboard experience
        </div>
      </div>
    </div>
  </AppLayout>
);

// Lazy loaded dashboard pages - These are heavy and benefit from code splitting
export const LazyPnLDashboard = lazy(() => 
  import('./dashboard/PnLDashboard').then(module => ({ default: module.PnLDashboard || module.default }))
);

export const LazyCashFlowDashboard = lazy(() => 
  import('./dashboard/CashFlowDashboard').then(module => ({ default: module.CashFlowDashboard || module.default }))
);

// Admin pages - Less frequently accessed, good candidates for lazy loading
export const LazyPlatformAdminPage = lazy(() => 
  import('../app/dashboard/platform-admin/page').then(module => ({ default: module.default }))
);

export const LazyOrgAdminPage = lazy(() => 
  import('../app/dashboard/org-admin/page').then(module => ({ default: module.default }))
);

export const LazyCompanyAdminPage = lazy(() => 
  import('../app/dashboard/company-admin/page').then(module => ({ default: module.default }))
);

// Configuration pages - Complex forms, good for lazy loading
export const LazyConfigurationsPage = lazy(() => 
  import('../app/dashboard/company-admin/configurations/page').then(module => ({ default: module.default }))
);

export const LazyNewConfigurationPage = lazy(() => 
  import('../app/dashboard/company-admin/configurations/new/page').then(module => ({ default: module.default }))
);

// User management pages - Admin-only, infrequently accessed
export const LazyUsersPage = lazy(() => 
  import('../app/dashboard/company-admin/users/page').then(module => ({ default: module.default }))
);

export const LazyInviteUserPage = lazy(() => 
  import('../app/dashboard/company-admin/users/invite/page').then(module => ({ default: module.default }))
);

// Wrapped components with Suspense
export const PnLDashboardPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="P&L Dashboard" />}>
    <LazyPnLDashboard {...props} />
  </Suspense>
);

export const CashFlowDashboardPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Cash Flow Dashboard" />}>
    <LazyCashFlowDashboard {...props} />
  </Suspense>
);

export const PlatformAdminPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Platform Administration" />}>
    <LazyPlatformAdminPage {...props} />
  </Suspense>
);

export const OrgAdminPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Organization Administration" />}>
    <LazyOrgAdminPage {...props} />
  </Suspense>
);

export const CompanyAdminPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Company Administration" />}>
    <LazyCompanyAdminPage {...props} />
  </Suspense>
);

export const ConfigurationsPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Configurations" />}>
    <LazyConfigurationsPage {...props} />
  </Suspense>
);

export const NewConfigurationPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="New Configuration" />}>
    <LazyNewConfigurationPage {...props} />
  </Suspense>
);

export const UsersPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="User Management" />}>
    <LazyUsersPage {...props} />
  </Suspense>
);

export const InviteUserPage = (props: any) => (
  <Suspense fallback={<PageLoader pageName="Invite User" />}>
    <LazyInviteUserPage {...props} />
  </Suspense>
);

// Helper function for performance monitoring
export const trackLazyLoad = (componentName: string, loadTime: number) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Lazy loaded ${componentName} in ${loadTime}ms`);
  }
  
  // Could send to analytics in production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'lazy_component_load', {
      component_name: componentName,
      load_time: loadTime,
      event_category: 'performance'
    });
  }
};