import { useState, useEffect, useCallback, useRef } from 'react';
import { currencyService } from '@/lib/services/currency';

interface FinancialDataResponse {
  success: boolean;
  data?: {
    currentMonth?: any;
    previousMonth?: any;
    yearToDate?: any;
    categories?: {
      revenue: any[];
      cogs: any[];
      operatingExpenses: any[];
    };
    trends?: {
      revenue: any[];
      expenses: any[];
      margins: any[];
    };
    statements?: any[];
    currentPeriod?: any;
    previousPeriod?: any;
    comparisonData?: any;
    comparisonPeriod?: string;
    periods?: any[];
    chartData?: any[];
  };
  error?: string;
}

interface UseFinancialDataOptions {
  companyId?: string;
  statementId?: string;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  autoRefresh?: boolean;
  refreshInterval?: number;
  selectedPeriod?: string;
  comparisonPeriod?: 'lastMonth' | 'lastQuarter' | 'lastYear';
}

export function useFinancialData(options: UseFinancialDataOptions) {
  const { companyId, statementId, autoRefresh = false, refreshInterval = 60000, selectedPeriod, comparisonPeriod } = options;
  
  const [data, setData] = useState<FinancialDataResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchFinancialData = useCallback(async () => {
    if (!companyId) {
      setError('Company ID is required');
      setLoading(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Fetch financial analytics
      const params = new URLSearchParams();
      if (statementId) params.append('statementId', statementId);
      if (selectedPeriod && selectedPeriod !== 'current') params.append('selectedPeriod', selectedPeriod);
      if (comparisonPeriod) params.append('comparisonPeriod', comparisonPeriod);
      
      const analyticsUrl = `/api/v1/companies/${companyId}/financial-analytics${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      
      console.log('Fetching financial data from:', analyticsUrl);
      
      const response = await fetch(analyticsUrl, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch financial data: ${response.statusText}`);
      }

      const result: FinancialDataResponse = await response.json();
      
      console.log('Financial data response:', result);
      
      if (result.success && result.data) {
        setData(result.data);
        console.log('Current month data:', result.data.currentMonth);
        // Update exchange rates if needed
        await currencyService.fetchLatestRates();
      } else {
        throw new Error(result.error || 'Failed to fetch financial data');
      }
    } catch (err) {
      // Don't set error state if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted:', err.message);
        return;
      }
      console.error('Error fetching financial data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [companyId, statementId, selectedPeriod, comparisonPeriod]);

  useEffect(() => {
    fetchFinancialData();
  }, [companyId, statementId, selectedPeriod, comparisonPeriod]);

  useEffect(() => {
    // Set up auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchFinancialData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchFinancialData, autoRefresh, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(() => {
    return fetchFinancialData();
  }, [fetchFinancialData]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

// Hook for fetching company list
export function useCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/companies');
        
        if (!response.ok) {
          throw new Error('Failed to fetch companies');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          setCompanies(result.data);
        } else if (result.success && result.companies) {
          setCompanies(result.companies);
        } else {
          throw new Error(result.error || 'Failed to fetch companies');
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return { companies, loading, error };
}

// Hook for fetching financial statements
export function useFinancialStatements(companyId?: string, type?: string) {
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchStatements = async () => {
      try {
        setLoading(true);
        const url = `/api/v1/companies/${companyId}/statements${
          type ? `?type=${type}` : ''
        }`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch statements');
        }

        const result = await response.json();
        
        if (result.success && result.statements) {
          setStatements(result.statements);
        } else {
          throw new Error(result.error || 'Failed to fetch statements');
        }
      } catch (err) {
        console.error('Error fetching statements:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();
  }, [companyId, type]);

  return { statements, loading, error };
}