"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, csrfToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiRequest('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        // Only allow platform admins
        if (userData.user && userData.user.role === 'platform_admin') {
          setUser(userData.user);
        } else {
          setUser(null);
          localStorage.removeItem('admin-token');
        }
      } else {
        setUser(null);
        localStorage.removeItem('admin-token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('admin-token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, csrfToken?: string) => {
    try {
      console.log('Attempting login with:', { email, passwordLength: password.length });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, csrfToken }),
      });

      const data = await response.json();
      console.log('Login response:', { status: response.status, data });

      if (response.ok && data.success) {
        // Check if user is platform admin
        if (data.user.role !== 'platform_admin') {
          console.log('Role check failed:', data.user.role);
          return {
            success: false,
            error: 'Access denied. Admin role required.'
          };
        }

        console.log('Login successful, setting user');
        setUser(data.user);
        // Token is now set as httpOnly cookie by the server
        
        return { success: true };
      } else {
        console.log('Login failed:', data);
        return {
          success: false,
          error: data.error || 'Login failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('admin-token');
    // Clear cookie
    document.cookie = 'admin-token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}