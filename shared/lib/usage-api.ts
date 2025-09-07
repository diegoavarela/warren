import { UsageData } from '../types/usage';

export interface UsageApiOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class UsageApi {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: UsageApiOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
  }

  async fetchOrganizationUsage(
    organizationId: string,
    customHeaders: Record<string, string> = {}
  ): Promise<{ success: boolean; data?: UsageData; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/organizations/${organizationId}/usage`,
        {
          method: 'GET',
          headers: {
            ...this.defaultHeaders,
            ...customHeaders
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch usage data'
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Usage API fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

// Factory functions for different environments
export function createWarrenUsageApi(): UsageApi {
  return new UsageApi({
    baseUrl: '', // Same domain for Warren app
  });
}

export function createAdminPortalUsageApi(): UsageApi {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('admin-token') 
    : null;

  return new UsageApi({
    baseUrl: '', // Same domain for admin portal
    headers: token ? {
      'Authorization': `Bearer ${token}`
    } : {}
  });
}

// Convenience functions
export async function fetchOrganizationUsage(
  organizationId: string,
  api?: UsageApi
): Promise<{ success: boolean; data?: UsageData; error?: string }> {
  const usageApi = api || createWarrenUsageApi();
  return usageApi.fetchOrganizationUsage(organizationId);
}

export async function fetchOrganizationUsageForAdmin(
  organizationId: string,
  api?: UsageApi
): Promise<{ success: boolean; data?: UsageData; error?: string }> {
  const usageApi = api || createAdminPortalUsageApi();
  return usageApi.fetchOrganizationUsage(organizationId);
}