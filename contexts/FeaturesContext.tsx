"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  priceMonthly?: number;
  priceDisplay?: string;
  isPublic: boolean;
  isBaseline: boolean;
  requirements?: string;
  setupTime?: string;
  icon?: string;
  enabled?: boolean; // Whether this org has access to this feature
  enabledAt?: Date;
}

export interface FeatureRequest {
  id: string;
  organizationId: string;
  featureId: string;
  requestedBy: string;
  priority: 'low' | 'medium' | 'high';
  businessJustification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_development' | 'completed';
  requestedAt: Date;
  respondedAt?: Date;
  response?: string;
  feature?: FeatureFlag;
}

interface FeaturesContextType {
  // Feature flags for current organization
  availableFeatures: FeatureFlag[];
  enabledFeatures: FeatureFlag[];
  isLoading: boolean;
  
  // Feature requests
  featureRequests: FeatureRequest[];
  requestsLoading: boolean;
  
  // Actions
  hasFeature: (featureKey: string) => boolean;
  getFeature: (featureKey: string) => FeatureFlag | undefined;
  isFeatureVisible: (featureKey: string) => boolean;
  getVisibleFeatures: () => FeatureFlag[];
  requestFeature: (featureId: string, justification?: string, priority?: 'low' | 'medium' | 'high') => Promise<{ success: boolean; error?: string }>;
  refreshFeatures: () => Promise<void>;
  refreshRequests: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextType | null>(null);

interface FeaturesProviderProps {
  children: ReactNode;
}

export function FeaturesProvider({ children }: FeaturesProviderProps) {
  const { user, organization, isAuthenticated } = useAuth();
  const [availableFeatures, setAvailableFeatures] = useState<FeatureFlag[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureFlag[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const refreshFeatures = async () => {
    if (!isAuthenticated || !organization?.id) {
      setAvailableFeatures([]);
      setEnabledFeatures([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizations/${organization.id}/features`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableFeatures(data.features || []);
          setEnabledFeatures(data.features?.filter((f: FeatureFlag) => f.enabled) || []);
        }
      } else {
        console.error('Failed to fetch features:', response.status);
        setAvailableFeatures([]);
        setEnabledFeatures([]);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
      setAvailableFeatures([]);
      setEnabledFeatures([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRequests = async () => {
    if (!isAuthenticated || !organization?.id) {
      setFeatureRequests([]);
      setRequestsLoading(false);
      return;
    }

    try {
      setRequestsLoading(true);
      const response = await fetch(`/api/organizations/${organization.id}/feature-requests`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFeatureRequests(data.requests || []);
        }
      } else {
        console.error('Failed to fetch feature requests:', response.status);
        setFeatureRequests([]);
      }
    } catch (error) {
      console.error('Error fetching feature requests:', error);
      setFeatureRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && organization?.id) {
      refreshFeatures();
      refreshRequests();
    } else {
      setAvailableFeatures([]);
      setEnabledFeatures([]);
      setFeatureRequests([]);
      setIsLoading(false);
      setRequestsLoading(false);
    }
  }, [isAuthenticated, organization?.id]);

  // Periodically refresh features to pick up changes from admin portal
  useEffect(() => {
    if (!isAuthenticated || !organization?.id) return;

    const intervalId = setInterval(() => {
      refreshFeatures();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [isAuthenticated, organization?.id]);

  const hasFeature = (featureKey: string): boolean => {
    return enabledFeatures.some(f => f.key.toLowerCase() === featureKey.toLowerCase());
  };

  const getFeature = (featureKey: string): FeatureFlag | undefined => {
    return availableFeatures.find(f => f.key.toLowerCase() === featureKey.toLowerCase());
  };

  const isFeatureVisible = (featureKey: string): boolean => {
    const feature = availableFeatures.find(f => f.key.toLowerCase() === featureKey.toLowerCase());
    if (!feature) return false;
    
    // Baseline features are always visible and enabled
    if (feature.isBaseline) return true;
    
    // Public features are always visible (regardless of enabled status)
    if (feature.isPublic) return true;
    
    // Private features are only visible if they are enabled for the organization
    return feature.enabled === true;
  };

  const getVisibleFeatures = (): FeatureFlag[] => {
    return availableFeatures.filter(feature => {
      // Baseline features are always visible
      if (feature.isBaseline) return true;
      
      // Public features are always visible
      if (feature.isPublic) return true;
      
      // Private features are only visible if enabled
      return feature.enabled === true;
    });
  };

  const requestFeature = async (
    featureId: string, 
    businessJustification?: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    if (!organization?.id || !user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/organizations/${organization.id}/feature-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId,
          businessJustification,
          priority,
          requestedBy: user.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh requests to include the new one
        await refreshRequests();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to request feature' };
      }
    } catch (error) {
      console.error('Error requesting feature:', error);
      return { success: false, error: 'Network error' };
    }
  };

  return (
    <FeaturesContext.Provider 
      value={{
        availableFeatures,
        enabledFeatures,
        featureRequests,
        isLoading,
        requestsLoading,
        hasFeature,
        getFeature,
        isFeatureVisible,
        getVisibleFeatures,
        requestFeature,
        refreshFeatures,
        refreshRequests
      }}
    >
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures() {
  const context = useContext(FeaturesContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeaturesProvider');
  }
  return context;
}