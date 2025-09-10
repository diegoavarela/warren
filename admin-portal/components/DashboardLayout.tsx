"use client";

import { ProtectedRoute } from './ProtectedRoute';
import { Sidebar } from './Sidebar';
import { UserWelcomeCard } from './UserWelcomeCard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  helpAction?: React.ReactNode;
}

export function DashboardLayout({ children, title, description, helpAction }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        
        {/* Main content */}
        <div className="lg:pl-72">
          <main className="flex-1">
            {/* Page header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {title && (
                        <div className="flex items-center space-x-2">
                          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                          {helpAction}
                        </div>
                      )}
                      {description && (
                        <p className="mt-1 text-sm text-gray-500">{description}</p>
                      )}
                    </div>
                    <div className="ml-6 flex-shrink-0">
                      <UserWelcomeCard />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Page content */}
            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}