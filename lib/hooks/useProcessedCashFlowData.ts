/**
 * Hook for Cash Flow Processed Data
 * 
 * This hook replaces DirectCashFlowProvider for Cash Flow dashboards.
 * It fetches data from the new configuration-based processed-data API.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ProcessedCashFlowDataResponse {
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

export interface UseProcessedCashFlowDataOptions {
  companyId: string;
  limit?: number;
  periodStart?: string;
  periodEnd?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseProcessedCashFlowDataReturn {
  data: ProcessedCashFlowDataResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useProcessedCashFlowData(options: UseProcessedCashFlowDataOptions): UseProcessedCashFlowDataReturn {
  const [data, setData] = useState<ProcessedCashFlowDataResponse | null>(null);
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

      console.log('🔍 useProcessedCashFlowData: Fetching data for company', options.companyId);

      // Build query parameters
      const searchParams = new URLSearchParams();
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.periodStart) searchParams.set('periodStart', options.periodStart);
      if (options.periodEnd) searchParams.set('periodEnd', options.periodEnd);

      const url = `/api/processed-data/cashflow/${options.companyId}?${searchParams.toString()}`;
      
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

      const result: ProcessedCashFlowDataResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.data ? 'Invalid response format' : 'API returned failure');
      }

      console.log(`✅ useProcessedCashFlowData: Successfully fetched ${result.metadata.periodCount} periods`);
      
      setData(result);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Cash Flow data';
      console.error('❌ useProcessedCashFlowData: Error fetching data', err);
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

// Legacy compatibility types for DirectCashFlowProvider
export interface DirectCashFlowPeriod {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  lineItems: Array<{
    id: string;
    category: string;
    subcategory?: string;
    accountName: string;
    amount: number;
    currency: string;
    isInflow: boolean;
    periodEnd: string;
  }>;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  currency: string;
  initialBalance?: number;
  finalBalance?: number;
  lowestBalance?: number;
  monthlyGeneration?: number;
}

export interface DirectCashFlowData {
  periods: DirectCashFlowPeriod[];
  summary: {
    totalPeriods: number;
    currency: string;
    periodRange: string;
    lastUpdated: string;
  };
}

// Compatibility wrapper for existing dashboard components
export function useProcessedCashFlowDataLegacy(companyId: string, limit: number = 12) {
  const { data, loading, error, refetch } = useProcessedCashFlowData({
    companyId,
    limit
  });

  // Transform to match the old DirectCashFlowProvider format
  const directData: DirectCashFlowData | null = data ? {
    periods: data.data.periods.map((period, index) => ({
      id: `processed-${index}`,
      companyId,
      periodStart: new Date(2025, index, 1).toISOString().split('T')[0],
      periodEnd: new Date(2025, index + 1, 0).toISOString().split('T')[0],
      periodType: 'monthly' as const,
      lineItems: [
        {
          id: `processed-${index}-inflows`,
          category: 'operating_activities',
          subcategory: 'total_inflows',
          accountName: 'Total Inflows',
          amount: data.data.data.dataRows?.totalInflows?.values[index] || 0,
          currency: data.data.metadata.currency,
          isInflow: true,
          periodEnd: new Date(2025, index + 1, 0).toISOString()
        },
        {
          id: `processed-${index}-outflows`,
          category: 'operating_activities',
          subcategory: 'total_outflows',
          accountName: 'Total Outflows',
          amount: -(data.data.data.dataRows?.totalOutflows?.values[index] || 0),
          currency: data.data.metadata.currency,
          isInflow: false,
          periodEnd: new Date(2025, index + 1, 0).toISOString()
        }
      ],
      totalInflows: data.data.data.dataRows?.totalInflows?.values[index] || 0,
      totalOutflows: data.data.data.dataRows?.totalOutflows?.values[index] || 0,
      netCashFlow: data.data.data.dataRows?.monthlyGeneration?.values[index] || 0,
      currency: data.data.metadata.currency,
      initialBalance: data.data.data.dataRows?.initialBalance?.values[index] || 0,
      finalBalance: data.data.data.dataRows?.finalBalance?.values[index] || 0,
      lowestBalance: data.data.data.dataRows?.lowestBalance?.values[index] || 0,
      monthlyGeneration: data.data.data.dataRows?.monthlyGeneration?.values[index] || 0
    })),
    summary: {
      totalPeriods: data.metadata.periodCount,
      currency: data.data.metadata.currency,
      periodRange: `${data.data.periods[0]} - ${data.data.periods[data.data.periods.length - 1]}`,
      lastUpdated: new Date().toISOString()
    }
  } : null;

  return {
    directData,
    hasDirectAccess: directData !== null,
    loading,
    error,
    refetch
  };
}