/**
 * Configuration Hook
 * 
 * Provides easy access to hierarchical configuration values in React components.
 * Automatically handles context (user, company, organization) and caching.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ConfigurationValue<T = any> {
  value: T;
  level: 'system' | 'organization' | 'company' | 'user';
  inheritedFrom: 'system' | 'organization' | 'company' | 'user';
  description?: string;
  category?: string;
}

interface UseConfigurationOptions {
  companyId?: string;
  organizationId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseConfigurationReturn<T> {
  value: T | null;
  loading: boolean;
  error: string | null;
  metadata: ConfigurationValue<T> | null;
  refetch: () => Promise<void>;
}

export function useConfiguration<T = any>(
  key: string,
  defaultValue?: T,
  options?: UseConfigurationOptions
): UseConfigurationReturn<T> {
  const { user } = useAuth();
  const [value, setValue] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<ConfigurationValue<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfiguration = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        key,
        ...(options?.companyId && { companyId: options.companyId }),
        ...(options?.organizationId && { organizationId: options.organizationId })
      });

      const response = await fetch(`/api/settings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Setting not found, use default value
          if (defaultValue !== undefined) {
            setValue(defaultValue);
            setMetadata({
              value: defaultValue,
              level: 'system',
              inheritedFrom: 'system',
              description: 'Default value',
              category: 'defaults'
            });
          } else {
            setValue(null);
            setMetadata(null);
          }
          setError(null);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
      } else {
        const result = await response.json();
        
        if (result.success && result.data) {
          setValue(result.data.value);
          setMetadata(result.data);
          setError(null);
        } else {
          throw new Error('Invalid response format');
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configuration';
      setError(errorMessage);
      
      // Use default value on error
      if (defaultValue !== undefined) {
        setValue(defaultValue);
        setMetadata({
          value: defaultValue,
          level: 'system',
          inheritedFrom: 'system',
          description: 'Fallback default value',
          category: 'defaults'
        });
      } else {
        setValue(null);
        setMetadata(null);
      }
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue, user?.id, options?.companyId, options?.organizationId]);

  // Initial fetch
  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  // Auto-refresh setup
  useEffect(() => {
    if (options?.autoRefresh && options?.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(fetchConfiguration, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchConfiguration, options?.autoRefresh, options?.refreshInterval]);

  return {
    value,
    loading,
    error,
    metadata,
    refetch: fetchConfiguration
  };
}

/**
 * Hook for getting multiple configuration values from a category
 */
export function useCategoryConfiguration(
  category: string,
  options?: UseConfigurationOptions
) {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, ConfigurationValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfiguration = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        category,
        ...(options?.companyId && { companyId: options.companyId }),
        ...(options?.organizationId && { organizationId: options.organizationId })
      });

      const response = await fetch(`/api/settings?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setValues(result.data);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configuration';
      setError(errorMessage);
      setValues({});
    } finally {
      setLoading(false);
    }
  }, [category, user?.id, options?.companyId, options?.organizationId]);

  // Initial fetch
  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  return {
    values,
    loading,
    error,
    refetch: fetchConfiguration
  };
}

/**
 * Convenience hooks for common configuration categories
 */
export function useFinancialDefaults(options?: UseConfigurationOptions) {
  const { values, loading, error, refetch } = useCategoryConfiguration('financial', options);
  
  return {
    defaultCurrency: values['financial.defaultCurrency']?.value || 'USD',
    defaultUnits: values['financial.defaultUnits']?.value || 'normal',
    supportedCurrencies: values['financial.supportedCurrencies']?.value || ['USD', 'EUR', 'GBP', 'ARS'],
    supportedUnits: values['financial.supportedUnits']?.value || ['normal', 'thousands', 'millions'],
    loading,
    error,
    refetch
  };
}

export function usePeriodDefaults(options?: UseConfigurationOptions) {
  const { values, loading, error, refetch } = useCategoryConfiguration('period', options);
  
  return {
    validationYearMin: values['period.validationYearMin']?.value || 2000,
    validationYearMax: values['period.validationYearMax']?.value || 2100,
    defaultFiscalYearStart: values['period.defaultFiscalYearStart']?.value || 1,
    loading,
    error,
    refetch
  };
}

export function useLocalizationDefaults(options?: UseConfigurationOptions) {
  const { values, loading, error, refetch } = useCategoryConfiguration('localization', options);
  
  return {
    defaultLocale: values['localization.defaultLocale']?.value || 'en-US',
    defaultTimezone: values['localization.defaultTimezone']?.value || 'UTC',
    supportedLocales: values['localization.supportedLocales']?.value || ['en-US', 'es-MX'],
    defaultLanguage: values['ui.defaultLanguage']?.value || 'en',
    loading,
    error,
    refetch
  };
}

export function useProcessingDefaults(options?: UseConfigurationOptions) {
  const { values, loading, error, refetch } = useCategoryConfiguration('processing', options);
  
  return {
    defaultTimeout: values['processing.defaultTimeout']?.value || 120000,
    maxFileSize: values['processing.maxFileSize']?.value || 52428800,
    retryAttempts: values['processing.retryAttempts']?.value || 3,
    loading,
    error,
    refetch
  };
}