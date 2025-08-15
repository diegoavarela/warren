/**
 * Hook for Processed Data Periods
 * 
 * This hook fetches available periods for a company.
 * Used for period selectors and data availability checks.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ProcessedDataPeriodsResponse {
  success: boolean;
  data: {
    companyId: string;
    periods: any; // Can be array or grouped object
    totalCount: number;
    types: string[];
  };
  metadata: {
    requestedAt: string;
    type: string;
    source: string;
  };
}

export interface UseProcessedDataPeriodsOptions {
  companyId: string;
  type?: 'pnl' | 'cashflow';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseProcessedDataPeriodsReturn {
  data: ProcessedDataPeriodsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useProcessedDataPeriods(options: UseProcessedDataPeriodsOptions): UseProcessedDataPeriodsReturn {
  const [data, setData] = useState<ProcessedDataPeriodsResponse | null>(null);
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

      console.log('🔍 useProcessedDataPeriods: Fetching periods for company', options.companyId);

      // Build query parameters
      const searchParams = new URLSearchParams();
      if (options.type) searchParams.set('type', options.type);

      const url = `/api/processed-data/${options.companyId}/periods?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ProcessedDataPeriodsResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.data ? 'Invalid response format' : 'API returned failure');
      }

      console.log(`✅ useProcessedDataPeriods: Successfully fetched ${result.data.totalCount} periods`);
      
      setData(result);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch periods';
      console.error('❌ useProcessedDataPeriods: Error fetching data', err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [options.companyId, options.type]);

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

// Helper hook for period selectors
export function useAvailablePeriods(companyId: string, type?: 'pnl' | 'cashflow') {
  const { data, loading, error } = useProcessedDataPeriods({ companyId, type });
  
  // Extract periods in a consistent format
  const periods = data?.data ? (
    Array.isArray(data.data.periods) 
      ? data.data.periods 
      : type 
        ? data.data.periods[type] || []
        : Object.values(data.data.periods).flat()
  ) : [];

  return {
    periods,
    loading,
    error,
    totalCount: data?.data.totalCount || 0,
    types: data?.data.types || []
  };
}