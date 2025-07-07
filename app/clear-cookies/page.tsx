"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCookiesPage() {
  const router = useRouter();

  useEffect(() => {
    const clearAllAuth = async () => {
      // Clear any localStorage items
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Call logout API to clear server-side cookies
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Error clearing cookies:', error);
      }
      
      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    };

    clearAllAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg text-gray-600 mb-2">Clearing all authentication...</p>
        <p className="text-sm text-gray-500">You will be redirected to login page</p>
      </div>
    </div>
  );
}