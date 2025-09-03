"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: string;
  locale?: string;
  companyAccess?: {
    companyId: string;
    role: string;
    permissions: string[];
  }[];
}

export interface Organization {
  id: string;
  name: string;
  locale?: string;
  baseCurrency?: string;
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  locale?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setOrganization(data.organization);
        } else {
          setUser(null);
          setOrganization(null);
        }
      } else {
        // Don't log 401 errors as they're expected when not authenticated
        if (response.status !== 401) {
          console.error('Failed to refresh user:', response.status);
        }
        setUser(null);
        setOrganization(null);
      }
    } catch (error) {
      // Only log actual network errors, not auth errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error while refreshing user:', error);
      }
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        await refreshUser(); // Get organization data
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (signupData: SignupData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setOrganization(data.organization);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Provide a fallback during SSR or when context is not available
    console.warn('useAuth called outside of AuthProvider, using defaults');
    return {
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => ({ success: false, error: 'Auth context not available' }),
      signup: async () => ({ success: false, error: 'Auth context not available' }),
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}