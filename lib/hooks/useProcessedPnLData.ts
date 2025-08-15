/**
 * Hook for P&L Processed Data
 * 
 * This hook replaces useFinancialData for P&L dashboards.
 * It fetches data from the new configuration-based processed-data API.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ProcessedPnLDataResponse {
  success: boolean;
  data: {
    periods: string[];
    data: {
      dataRows: Record<string, {
        label: string;
        values: (number | null)[];
        total: number;
      }>;
      categories: Record<string, Record<string, {
        label: string;
        values: (number | null)[];
        total: number;
        subcategories?: Record<string, {
          label: string;
          values: (number | null)[];
          total: number;
        }>;
      }>>;
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
    type: string;
    periodCount: number;
    requestedAt: string;
    source: string;
  };
}

export interface UseProcessedPnLDataOptions {
  companyId: string;
  limit?: number;
  periodStart?: string;
  periodEnd?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseProcessedPnLDataReturn {
  data: ProcessedPnLDataResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useProcessedPnLData(options: UseProcessedPnLDataOptions): UseProcessedPnLDataReturn {
  const [data, setData] = useState<ProcessedPnLDataResponse | null>(null);
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

      console.log('🔍 useProcessedPnLData: Fetching data for company', options.companyId);

      // Build query parameters
      const searchParams = new URLSearchParams();
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.periodStart) searchParams.set('periodStart', options.periodStart);
      if (options.periodEnd) searchParams.set('periodEnd', options.periodEnd);

      const url = `/api/processed-data/pnl/${options.companyId}?${searchParams.toString()}`;
      
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

      const result: ProcessedPnLDataResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.data ? 'Invalid response format' : 'API returned failure');
      }

      console.log(`✅ useProcessedPnLData: Successfully fetched ${result.metadata.periodCount} periods`);
      
      setData(result);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch P&L data';
      console.error('❌ useProcessedPnLData: Error fetching data', err);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [options.companyId, options.limit, options.periodStart, options.periodEnd]);

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

// Compatibility wrapper for existing dashboard components
export function useProcessedPnLDataLegacy(companyId: string, limit: number = 12) {
  const { data, loading, error, refetch } = useProcessedPnLData({
    companyId,
    limit
  });

  // Transform to match the old useFinancialData format
  const legacyFormat = data ? {
    financialData: {
      periods: data.data.periods,
      revenue: data.data.data.categories?.revenue || {},
      cogs: data.data.data.categories?.cogs || {},
      opex: data.data.data.categories?.opex || {},
      otherIncome: data.data.data.categories?.otherIncome || {},
      otherExpenses: data.data.data.categories?.otherExpenses || {},
      taxes: data.data.data.categories?.taxes || {},
      // Map dataRows to expected structure
      totalRevenue: data.data.data.dataRows?.totalRevenue?.values || [],
      grossIncome: data.data.data.dataRows?.grossIncome?.values || [],
      grossProfit: data.data.data.dataRows?.grossProfit?.values || [],
      cogsValues: data.data.data.dataRows?.cogs?.values || [],
      totalOpex: data.data.data.dataRows?.totalOpex?.values || [],
      ebitda: data.data.data.dataRows?.ebitda?.values || [],
      netIncome: data.data.data.dataRows?.netIncome?.values || [],
    },
    metadata: data.data.metadata
  } : null;

  return {
    data: legacyFormat,
    loading,
    error,
    refetch
  };
}