"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireRole?: string[];
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  requireRole 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (requireRole && user && !requireRole.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo, requireRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireRole && user && !requireRole.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}