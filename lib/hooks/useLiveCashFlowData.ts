/**
 * Live Cash Flow Data Hook
 * 
 * This hook fetches Cash Flow data directly from configuration + Excel,
 * rather than from pre-processed database records. This ensures the
 * dashboard always reflects the current configuration.
 */

import { useState, useEffect, useCallback } from 'react';

export interface LiveCashFlowDataResponse {
  success: boolean;
  data: {
    periods: string[];
    data: {
      dataRows: Record<string, {
        label: string | number;
        values: (number | null)[];
        total: number;
      }>;
      categories: Record<string, Record<string, {
        label: string | number;
        values: (number | null)[];
        total: number;
        subcategories?: Record<string, {
          label: string | number;
          values: (number | null)[];
          total: number;
        }>;
      }>>;
      periods?: string[];
      currency?: string;
      units?: string;
    };
    metadata: {
      currency: string;
      units: string;
      type: string;
      configurationName: string;
    };
  };
  metadata: {
    companyId: string;
    dataType: string;
    periodCount: number;
    requestedAt: string;
    source: string;
    configurationId: string;
    configurationName: string;
  };
}

export interface UseLiveCashFlowDataOptions {
  companyId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseLiveCashFlowDataReturn {
  data: LiveCashFlowDataResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useLiveCashFlowData(options: UseLiveCashFlowDataOptions): UseLiveCashFlowDataReturn {
  const [data, setData] = useState<LiveCashFlowDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!options.companyId) {
      setError('Company ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 useLiveCashFlowData: Fetching LIVE data for company', options.companyId);

      const url = `/api/cashflow-live/${options.companyId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: LiveCashFlowDataResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.data ? 'Invalid response format' : 'API returned failure');
      }

      console.log(`✅ useLiveCashFlowData: Successfully fetched LIVE data with ${result.metadata.periodCount} periods`);
      console.log(`🔧 Configuration: ${result.metadata.configurationName} (${result.metadata.configurationId})`);
      
      setData(result);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live Cash Flow data';
      console.error('❌ useLiveCashFlowData: Error fetching live data', err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [options.companyId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options.autoRefresh, options.refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}