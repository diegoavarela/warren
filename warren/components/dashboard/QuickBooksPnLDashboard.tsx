"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KPICard } from './KPICard';
import { MetricCard } from './MetricCard';
import { MetricKPICard } from './MetricKPICard';
import { SectionCard } from './SectionCard';
import { HorizontalStackedChart } from '../LazyComponents';
import { COGSAnalysisChart } from './COGSAnalysisChart';
import { COGSDetailModal } from './COGSDetailModal';
import { OperatingExpensesAnalysisChart } from './OperatingExpensesAnalysisChart';
import { OperatingExpensesDetailModal } from './OperatingExpensesDetailModal';
import { PerformanceOverviewHeatmaps } from './PerformanceOverviewHeatmaps';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { formatCurrency } from '@/lib/utils/formatters';
import { useLocale } from '@/contexts/LocaleContext';
import { transformQuickBooksData } from '@/lib/utils/quickbooks-transformers';
import { groupExpensesByCategory } from '@/lib/utils/expense-categorization';
import { PnLData, Period } from '@/types/financial';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { useTranslation } from '@/lib/translations';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalculatorIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  LinkIcon,
  CloudArrowUpIcon,
  PresentationChartLineIcon,
  CogIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface QuickBooksPnLDashboardProps {
  companyId?: string;
  quickbooksRealmId?: string;
  locale?: string;
  currency?: string;
  onPeriodChange?: (period: string, lastUpdate: Date | null) => void;
  onSyncStatusChange?: (status: 'syncing' | 'synced' | 'error', lastSync?: Date) => void;
}

export function QuickBooksPnLDashboard({
  companyId,
  quickbooksRealmId,
  locale = 'es-MX',
  currency = '$',
  onPeriodChange,
  onSyncStatusChange
}: QuickBooksPnLDashboardProps) {
  const [transformedData, setTransformedData] = useState<PnLData | null>(null);
  const [ytdData, setYtdData] = useState<PnLData | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: string;
    end: string;
    label: string;
  } | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<Array<{
    start: string;
    end: string;
    label: string;
  }>>([]);
  const [actualCurrency, setActualCurrency] = useState<string>('USD'); // Currency from API

  // New state for comparison and controls
  const [comparisonPeriod, setComparisonPeriod] = useState<'last_month' | 'last_quarter' | 'last_year'>('last_month');
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [selectedUnits, setSelectedUnits] = useState<'units' | 'thousands' | 'millions'>('units');
  const [accountingMode, setAccountingMode] = useState<'Accrual' | 'Cash'>('Accrual');
  const [showCurrencyEdit, setShowCurrencyEdit] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [rawApiData, setRawApiData] = useState<any>(null); // Store raw API response for COGS analysis
  const [selectedCogsCategory, setSelectedCogsCategory] = useState<any>(null);
  const [showCogsModal, setShowCogsModal] = useState(false);

  // Operating Expenses Modal state
  const [selectedOpexCategory, setSelectedOpexCategory] = useState<any>(null);
  const [showOpexModal, setShowOpexModal] = useState(false);

  // Monthly Performance Heatmap data
  const [monthlyHeatmapData, setMonthlyHeatmapData] = useState<Array<{
    month: string;
    revenue: number;
    netMargin: number;
    periodLabel: string;
  }>>([]);

  // Locale and translation setup
  const { locale: currentLocale } = useLocale();
  const { t } = useTranslation(currentLocale);

  // Get current period display
  const getCurrentPeriodDisplay = () => {
    return selectedPeriod?.label || 'Current Period';
  };

  // Get currency info based on currency code
  const getCurrencyInfo = (currencyCode: string) => {
    const currencyMap: Record<string, { symbol: string; flag: string }> = {
      'USD': { symbol: '$', flag: '🇺🇸' },
      'EUR': { symbol: '€', flag: '🇪🇺' },
      'GBP': { symbol: '£', flag: '🇬🇧' },
      'ARS': { symbol: '$', flag: '🇦🇷' },
      'MXN': { symbol: '$', flag: '🇲🇽' },
      'CAD': { symbol: '$', flag: '🇨🇦' },
      'AUD': { symbol: '$', flag: '🇦🇺' },
      'JPY': { symbol: '¥', flag: '🇯🇵' },
    };

    return currencyMap[currencyCode] || { symbol: currencyCode, flag: '💰' };
  };

  // Convert values based on selected units
  const convertValue = (value: number): number => {
    switch (selectedUnits) {
      case 'thousands':
        return value / 1000;
      case 'millions':
        return value / 1000000;
      case 'units':
      default:
        return value;
    }
  };

  // Get unit suffix based on selected units
  const getUnitSuffix = (): string => {
    switch (selectedUnits) {
      case 'thousands':
        return 'K';
      case 'millions':
        return 'M';
      case 'units':
      default:
        return '';
    }
  };

  // Format value for COGS chart display that respects selectedUnits
  const formatCogsValue = (value: number): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }

    const convertedValue = convertValue(value);
    const suffix = getUnitSuffix();

    if (selectedUnits === 'units') {
      // Show full numbers when units is selected
      return convertedValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
      // Apply K/M formatting for thousands/millions
      if (Math.abs(convertedValue) >= 1000000) {
        return `${(convertedValue / 1000000).toFixed(1)}M`;
      } else if (Math.abs(convertedValue) >= 1000) {
        return `${(convertedValue / 1000).toFixed(0)}K`;
      } else {
        return `${convertedValue.toLocaleString()}${suffix ? ` ${suffix}` : ''}`;
      }
    }
  };

  // Transform COGS data for the chart
  const transformCogsData = useMemo(() => {
    console.log('🔍 [COGS Transform] Raw API Data:', rawApiData);

    if (!rawApiData?.categories?.['Cost of Goods Sold']) {
      console.log('❌ [COGS Transform] No Cost of Goods Sold category found');
      return [];
    }

    const cogsCategory = rawApiData.categories['Cost of Goods Sold'];
    const totalCogs = cogsCategory.total;

    console.log('📊 [COGS Transform] COGS Category:', cogsCategory);
    console.log('💰 [COGS Transform] Total COGS:', totalCogs);

    // Group subcategories
    const subcategoriesMap = new Map<string, { accounts: any[], total: number }>();

    if (cogsCategory.subcategories) {
      console.log('📋 [COGS Transform] Subcategories:', cogsCategory.subcategories);

      for (const [subcategoryName, accounts] of Object.entries(cogsCategory.subcategories)) {
        const accountsArray = accounts as any[];
        const subcategoryTotal = accountsArray.reduce((sum, account) => {
          return sum + Math.abs(account.amount || 0); // Use absolute value for COGS
        }, 0);

        console.log(`💸 [COGS Transform] ${subcategoryName}: $${subcategoryTotal} from ${accountsArray.length} accounts`);

        console.log(`🔍 [COGS Transform] Processing ${subcategoryName} with total $${subcategoryTotal}`);

        if (subcategoryTotal > 0) { // Only include subcategories with positive amounts
          const validAccounts = accountsArray.filter(account => Math.abs(account.amount || 0) > 0);
          console.log(`✅ [COGS Transform] Valid accounts for ${subcategoryName}:`, validAccounts);

          subcategoriesMap.set(subcategoryName, {
            accounts: validAccounts,
            total: subcategoryTotal
          });
        } else {
          console.log(`❌ [COGS Transform] Skipping ${subcategoryName} - zero total`);
        }
      }
    }

    console.log('🗂️ [COGS Transform] Subcategories Map:', subcategoriesMap);

    // Convert subcategories to chart format
    const chartData = Array.from(subcategoriesMap.entries()).map(([subcategoryName, data]) => {
      const percentage = totalCogs > 0 ? (data.total / totalCogs) * 100 : 0;

      return {
        category: subcategoryName,
        amount: data.total,
        percentage: percentage,
        items: data.accounts.map(account => ({
          accountName: account.accountName,
          amount: Math.abs(account.amount || 0), // Use absolute value
          percentage: totalCogs > 0 ? ((Math.abs(account.amount || 0) / totalCogs) * 100) : 0
        }))
      };
    });

    console.log('📈 [COGS Transform] Final Chart Data:', chartData);

    // Sort by amount (largest first)
    return chartData.sort((a, b) => b.amount - a.amount);
  }, [rawApiData]);

  // Calculate derived values
  const hasCogsData = transformCogsData.length > 0;
  const totalCogs = rawApiData?.categories?.['Cost of Goods Sold']?.total || 0;

  // Transform Operating Expenses data for the chart with hierarchical grouping
  const transformOpexData = useMemo(() => {
    console.log('🔍 [OpEx Transform] Raw API Data:', rawApiData);

    if (!rawApiData?.categories?.['Operating Expenses']) {
      console.log('❌ [OpEx Transform] No Operating Expenses category found');
      return [];
    }

    const opexCategory = rawApiData.categories['Operating Expenses'];
    const totalOpex = opexCategory.total;

    console.log('📊 [OpEx Transform] OpEx Category:', opexCategory);
    console.log('💰 [OpEx Transform] Total OpEx:', totalOpex);

    // Collect all expense accounts
    const allExpenseAccounts: Array<{
      accountName: string;
      amount: number;
      subcategory: string;
    }> = [];

    if (opexCategory.subcategories) {
      for (const [subcategoryName, accounts] of Object.entries(opexCategory.subcategories)) {
        const accountsArray = accounts as any[];
        accountsArray.forEach(account => {
          if (Math.abs(account.amount || 0) > 0) {
            allExpenseAccounts.push({
              accountName: account.accountName,
              amount: Math.abs(account.amount || 0),
              subcategory: subcategoryName
            });
          }
        });
      }
    }

    console.log('📋 [OpEx Transform] All Expense Accounts:', allExpenseAccounts);

    // Group by parent categories using our categorization logic
    const groupedExpenses = groupExpensesByCategory(allExpenseAccounts);

    console.log('🗂️ [OpEx Transform] Grouped Expenses:', groupedExpenses);

    // Convert to chart format
    const chartData = groupedExpenses.map(group => ({
      category: group.displayName,
      parentCategory: group.parentCategory,
      amount: group.totalAmount,
      percentage: group.percentage,
      items: group.accounts.map(account => ({
        accountName: account.accountName,
        amount: account.amount,
        percentage: group.totalAmount > 0 ? ((account.amount / group.totalAmount) * 100) : 0,
        subcategory: account.subcategory
      }))
    }));

    console.log('📈 [OpEx Transform] Final Hierarchical Chart Data:', chartData);

    return chartData;
  }, [rawApiData]);

  // Calculate derived values for OpEx
  const hasOpexData = transformOpexData.length > 0;
  const totalOpex = rawApiData?.categories?.['Operating Expenses']?.total || 0;

  // Fetch available periods
  const fetchAvailablePeriods = useCallback(async () => {
    if (!companyId) return;

    try {
      const response = await fetch(`/api/quickbooks/dashboard/pnl/${companyId}/periods`);
      const result = await response.json();

      if (result.success && result.data.periods) {
        // Map API response to dashboard format
        const mappedPeriods = result.data.periods.map((period: any) => ({
          start: period.periodStart,
          end: period.periodEnd,
          label: period.periodLabel
        }));

        setAvailablePeriods(mappedPeriods);

        // Set the latest period as default if no period is selected
        if (!selectedPeriod && mappedPeriods.length > 0) {
          const latest = mappedPeriods[0];
          setSelectedPeriod({
            start: latest.start,
            end: latest.end,
            label: latest.label
          });
        }
      }
    } catch (error) {
      console.error('❌ [QB Dashboard] Error fetching periods:', error);
    }
  }, [companyId, selectedPeriod]);

  // Fetch QuickBooks data
  const fetchQuickBooksData = useCallback(async () => {
    if (!companyId) return;

    setApiLoading(true);
    setError(null);

    try {
      // Build API URL
      const apiUrl = `/api/quickbooks/dashboard/pnl/${companyId}`;
      const params = new URLSearchParams();

      if (selectedPeriod) {
        params.append('periodStart', selectedPeriod.start);
        params.append('periodEnd', selectedPeriod.end);
      }

      params.append('includeAccumulative', 'true');
      params.append('accountingMode', accountingMode);
      params.append('comparisonPeriod', comparisonPeriod);

      const fullUrl = `${apiUrl}?${params.toString()}`;
      console.log('🔍 [QB Dashboard] Fetching data from:', fullUrl);

      const response = await fetch(fullUrl);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch QuickBooks data');
      }

      console.log('📊 [QB Dashboard] API Response:', result.data);

      // Store raw API data for COGS analysis
      setRawApiData(result.data);

      // Transform the data using our transformer
      const transformed = transformQuickBooksData(result);
      console.log('🎯 [QB Dashboard] Transformed data:', transformed);

      setTransformedData(transformed);
      setError(null);

      // Extract comparison data from API response
      if (result.data?.comparison) {
        setComparisonData(result.data.comparison);
        console.log('📈 [QB Dashboard] Comparison data:', result.data.comparison);
      }

      // Extract currency from API response
      if (result.data?.currency) {
        setActualCurrency(result.data.currency);
        console.log('💰 [QB Dashboard] Currency from API:', result.data.currency);
      }

      // Also fetch heatmap data after successful main data fetch
      if (availablePeriods.length > 0) {
        console.log('🎯 [QB Dashboard] Triggering heatmap data fetch after successful P&L fetch');
        fetchMonthlyHeatmapData().catch(error =>
          console.error('❌ [QB Dashboard] Error fetching heatmap data:', error)
        );
      }

    } catch (error) {
      console.error('❌ [QB Dashboard] Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setApiLoading(false);
    }
  }, [companyId, selectedPeriod, accountingMode, comparisonPeriod]);

  // Fetch YTD data separately
  const fetchYTDData = useCallback(async () => {
    if (!companyId || !selectedPeriod) return null;

    try {
      const apiUrl = `/api/quickbooks/dashboard/pnl/${companyId}`;
      const params = new URLSearchParams();

      // Calculate year start dynamically based on selected period's year
      const selectedDate = new Date(selectedPeriod.end);
      const yearStart = `${selectedDate.getFullYear()}-01-01`;

      console.log('📅 [QB Dashboard] YTD period calculation:', {
        selectedPeriodEnd: selectedPeriod.end,
        calculatedYearStart: yearStart,
        selectedYear: selectedDate.getFullYear()
      });

      params.append('periodStart', yearStart);
      params.append('periodEnd', selectedPeriod.end);
      params.append('periodType', 'ytd');
      params.append('accountingMode', accountingMode);
      params.append('comparisonPeriod', comparisonPeriod);

      const fullUrl = `${apiUrl}?${params.toString()}`;
      console.log('🔍 [QB Dashboard] Fetching YTD data from:', fullUrl);

      const response = await fetch(fullUrl);
      const result = await response.json();

      if (result.success) {
        return transformQuickBooksData(result);
      }
    } catch (error) {
      console.error('❌ [QB Dashboard] Error fetching YTD data:', error);
    }
    return null;
  }, [companyId, selectedPeriod, accountingMode, comparisonPeriod]);

  // Fetch monthly data for heatmaps (last 12 months)
  const fetchMonthlyHeatmapData = useCallback(async () => {
    console.log('🌟🌟🌟 [HEATMAP FUNC] fetchMonthlyHeatmapData called at:', new Date().toISOString(), {
      companyId: !!companyId,
      availablePeriodsCount: availablePeriods.length,
      accountingMode
    });

    if (!companyId || !availablePeriods.length) {
      console.log('🎯 [Debug] Skipping monthly fetch - missing companyId or periods');
      return;
    }

    try {
      console.log('📊 [QB Dashboard] Fetching monthly heatmap data...');
      console.log('📊 Available periods:', availablePeriods.slice(0, 5).map(p => ({
        label: p.periodLabel,
        start: p.periodStart,
        end: p.periodEnd
      })));

      // Get the last 12 periods (or all available if less than 12)
      const periodsToFetch = availablePeriods.slice(0, Math.min(12, availablePeriods.length));
      console.log('📊 Fetching data for periods:', periodsToFetch.map(p => p.periodLabel));

      const monthlyPromises = periodsToFetch.map(async (period, index) => {
        try {
          console.log(`📊 [${index + 1}/${periodsToFetch.length}] Fetching ${period.label}...`);

          const apiUrl = `/api/quickbooks/dashboard/pnl/${companyId}`;
          const params = new URLSearchParams({
            periodStart: period.start,
            periodEnd: period.end,
            accountingMode: accountingMode,
            // Exclude accumulative data to avoid database errors
            includeAccumulative: 'false'
          });

          const response = await fetch(`${apiUrl}?${params.toString()}`);
          const result = await response.json();

          console.log(`📊 API response for ${period.label}:`, {
            success: result.success,
            hasData: !!result.data,
            hasCategories: !!result.data?.categories,
            categories: result.data?.categories ? Object.keys(result.data.categories) : []
          });

          if (result.success && result.data?.categories) {
            const revenue = result.data.categories['Revenue']?.total || 0;
            const cogs = result.data.categories['Cost of Goods Sold']?.total || 0;
            const operatingExpenses = result.data.categories['Operating Expenses']?.total || 0;
            const otherExpenses = result.data.categories['Other Expenses']?.total || 0;

            const netIncome = revenue - cogs - operatingExpenses - otherExpenses;
            const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

            // Extract month abbreviation from period label
            const monthMatch = period.label.match(/^([A-Za-z]{3})/);
            const monthAbbr = monthMatch ? monthMatch[1] : period.label.substring(0, 3);

            const processedData = {
              month: monthAbbr,
              revenue: Math.abs(revenue),
              netMargin: netMargin,
              periodLabel: period.label
            };

            console.log(`✅ [${period.label}] Processed:`, processedData);
            return processedData;
          } else {
            console.log(`❌ [${period.label}] No valid data:`, result);
          }
        } catch (error) {
          console.warn(`❌ [QB Dashboard] Error fetching data for ${period.label}:`, error);
        }
        return null;
      });

      const results = await Promise.all(monthlyPromises);
      const validResults = results.filter(result => result !== null);

      console.log('📈 [QB Dashboard] Monthly heatmap data loaded:', validResults.length, 'months out of', periodsToFetch.length, 'requested');
      console.log('📈 Final results:', validResults);

      setMonthlyHeatmapData(validResults);

    } catch (error) {
      console.error('❌ [QB Dashboard] Error fetching monthly heatmap data:', error);
    }
  }, [companyId, availablePeriods, accountingMode]);

  // Initial periods fetch
  useEffect(() => {
    fetchAvailablePeriods();
  }, [fetchAvailablePeriods]);

  // Data fetch when period is selected
  useEffect(() => {
    if (selectedPeriod) {
      fetchQuickBooksData();
      // Also fetch YTD data
      fetchYTDData().then(ytdResult => {
        if (ytdResult) {
          setYtdData(ytdResult);
        }
      });
    }
  }, [selectedPeriod, fetchQuickBooksData, fetchYTDData]);

  // Fetch monthly heatmap data when periods are available
  useEffect(() => {
    console.log('🌟 [HEATMAP DEBUG] useEffect for monthly heatmap triggered:', {
      availablePeriodsLength: availablePeriods.length,
      companyId: !!companyId,
      accountingMode,
      funcDefined: typeof fetchMonthlyHeatmapData === 'function'
    });

    if (companyId && availablePeriods.length > 0) {
      console.log('🌟 [HEATMAP DEBUG] Calling fetchMonthlyHeatmapData from useEffect NOW!');
      fetchMonthlyHeatmapData()
        .then(() => console.log('🌟 [HEATMAP DEBUG] fetchMonthlyHeatmapData completed successfully'))
        .catch(error => {
          console.error('🌟 [HEATMAP DEBUG] fetchMonthlyHeatmapData ERROR:', error);
        });
    } else {
      console.log('🌟 [HEATMAP DEBUG] Conditions not met:', {
        hasCompanyId: !!companyId,
        periodsCount: availablePeriods.length
      });
    }
  }, [availablePeriods, companyId, accountingMode, fetchMonthlyHeatmapData]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchQuickBooksData();
  };

  // Period change handler
  const handlePeriodChange = (periodStart: string, periodEnd: string, periodLabel: string) => {
    setSelectedPeriod({ start: periodStart, end: periodEnd, label: periodLabel });
  };

  // Calculate real previous period metrics from comparison data (must be before early returns)
  const comparisonMetrics = useMemo(() => {
    if (!comparisonData) return null;

    const revenue = comparisonData['Revenue']?.total || 0;
    const cogs = comparisonData['Cost of Goods Sold']?.total || 0;
    const operatingExpenses = comparisonData['Operating Expenses']?.total || 0;
    const otherExpenses = comparisonData['Other Expenses']?.total || 0;

    return {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      operatingIncome: revenue - cogs - operatingExpenses,
      netIncome: revenue - cogs - operatingExpenses - otherExpenses,
      ebitda: revenue - cogs - operatingExpenses, // Simplified EBITDA
      operatingExpenses
    };
  }, [comparisonData]);

  // Extract comparison period label from comparison data
  const comparisonPeriodLabel = useMemo(() => {
    if (!comparisonData) return 'Previous Period';

    // Try to find period label from any category's first account
    for (const categoryName in comparisonData) {
      const category = comparisonData[categoryName];
      if (category.accounts && category.accounts.length > 0) {
        const firstAccount = category.accounts[0];
        if (firstAccount.periodLabel) {
          return firstAccount.periodLabel;
        }
      }
    }

    return 'Previous Period';
  }, [comparisonData]);

  // Error state
  if (error && !apiLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <InformationCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Load QuickBooks P&L Data
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (apiLoading && !transformedData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading QuickBooks P&L data...</p>
        </div>
      </div>
    );
  }

  if (!transformedData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <p className="text-gray-600">No QuickBooks P&L data available</p>
        </div>
      </div>
    );
  }

  const { periods, currentPeriod, yearToDate, categories } = transformedData || {};
  const ytdCurrentPeriod = ytdData?.currentPeriod;

  // Extract growth data from transformed data
  const growthData = transformedData?.metadata?.financials?.growth || {
    revenueGrowth: 0,
    grossProfitGrowth: 0,
    operatingIncomeGrowth: 0,
    netIncomeGrowth: 0,
    ebitdaGrowth: 0
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left side - Period selector and comparison */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Period selector */}
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
              <div className="relative">
                {availablePeriods.length > 0 ? (
                  <select
                    value={selectedPeriod ? `${selectedPeriod.start}|${selectedPeriod.end}` : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [start, end] = e.target.value.split('|');
                        const period = availablePeriods.find(p => p.start === start && p.end === end);
                        if (period) {
                          setSelectedPeriod({
                            start: period.start,
                            end: period.end,
                            label: period.label
                          });
                          if (onPeriodChange) {
                            onPeriodChange(period.label, new Date());
                          }
                        }
                      }
                    }}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-gray-900 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer min-w-[140px]"
                  >
                    {availablePeriods.map((period) => (
                      <option key={`${period.start}-${period.end}`} value={`${period.start}|${period.end}`}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 min-w-[140px] inline-block">
                    {getCurrentPeriodDisplay()}
                  </span>
                )}
                <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Compare with dropdown */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600">Compare with:</span>
              <div className="relative">
                <select
                  value={comparisonPeriod}
                  onChange={(e) => setComparisonPeriod(e.target.value as typeof comparisonPeriod)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-900 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer min-w-[120px]"
                >
                  <option value="last_month">Last month</option>
                  <option value="last_quarter">Last quarter</option>
                  <option value="last_year">Last year</option>
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right side - Currency and Units controls */}
          <div className="flex items-center space-x-4">
            {/* Currency controls */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-lg">{getCurrencyInfo(actualCurrency).flag}</span>
              <span className="text-sm font-semibold text-gray-900">{actualCurrency}</span>
              <button
                onClick={() => setShowCurrencyEdit(!showCurrencyEdit)}
                className="p-1 text-gray-400 hover:text-purple-600 transition-colors rounded hover:bg-white"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Accounting Mode dropdown */}
            <div className="relative">
              <select
                value={accountingMode}
                onChange={(e) => setAccountingMode(e.target.value as typeof accountingMode)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-gray-900 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer min-w-[100px]"
              >
                <option value="Accrual">Accrual</option>
                <option value="Cash">Cash</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Units dropdown */}
            <div className="relative">
              <select
                value={selectedUnits}
                onChange={(e) => setSelectedUnits(e.target.value as typeof selectedUnits)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-gray-900 hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer min-w-[120px]"
              >
                <option value="units">Units</option>
                <option value="thousands">Thousands (K)</option>
                <option value="millions">Millions (M)</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard content - New structured layout */}
      {currentPeriod && (
        <div className="space-y-6">
          {/* Revenue Section - Green */}
          <SectionCard
            title={`Revenue - ${selectedPeriod?.label || 'Current Period'}`}
            icon={PresentationChartLineIcon}
            backgroundColor="green"
            helpTopic={helpTopics.revenueSection}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Revenue */}
              <MetricKPICard
                title="TOTAL REVENUE"
                value={convertValue(currentPeriod.revenue || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                previousValue={convertValue(comparisonMetrics?.revenue || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={growthData.revenueGrowth}
                suffix={getUnitSuffix()}
              />

              {/* Gross Profit */}
              <MetricKPICard
                title="GROSS PROFIT"
                value={convertValue(currentPeriod.grossProfit || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={currentPeriod.grossMargin || 0}
                previousValue={convertValue(comparisonMetrics?.grossProfit || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={growthData.grossProfitGrowth}
                suffix={getUnitSuffix()}
              />

              {/* Operating Income */}
              <MetricKPICard
                title="OPERATING INCOME"
                value={convertValue(currentPeriod.operatingIncome || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={currentPeriod.operatingMargin || 0}
                previousValue={convertValue(comparisonMetrics?.operatingIncome || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={growthData.operatingIncomeGrowth}
                suffix={getUnitSuffix()}
              />

              {/* Net Income */}
              <MetricKPICard
                title="NET INCOME"
                value={convertValue(currentPeriod.netIncome || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={currentPeriod.netMargin || 0}
                previousValue={convertValue(comparisonMetrics?.netIncome || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={growthData.netIncomeGrowth}
                suffix={getUnitSuffix()}
              />

              {/* EBITDA */}
              <MetricKPICard
                title="EBITDA"
                value={convertValue(currentPeriod.ebitda || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={currentPeriod.ebitdaMargin || 0}
                previousValue={convertValue(comparisonMetrics?.ebitda || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={growthData.ebitdaGrowth}
                suffix={getUnitSuffix()}
              />
            </div>
          </SectionCard>

          {/* Cost Structure Section - Red */}
          <SectionCard
            title={`Cost Structure - ${selectedPeriod?.label || 'Current Period'}`}
            icon={CogIcon}
            backgroundColor="red"
            helpTopic={helpTopics.expensesSection}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cost of Goods Sold */}
              <MetricKPICard
                title="COST OF GOODS SOLD (COGS)"
                value={convertValue(currentPeriod.cogs || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                previousValue={convertValue(comparisonMetrics?.cogs || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={-2.5}
                suffix={getUnitSuffix()}
              />

              {/* % COGS of Revenue */}
              <MetricKPICard
                title="% COGS OF REVENUE"
                value={((currentPeriod.cogs || 0) / (currentPeriod.revenue || 1)) * 100}
                isPercentage={true}
                locale={currentLocale}
                previousValue={comparisonMetrics ? ((comparisonMetrics.cogs / Math.max(comparisonMetrics.revenue, 1)) * 100) : 0}
                previousPeriod="YTD"
                growthPercent={-18.1}
                suffix={getUnitSuffix()}
              />

              {/* Operating Expenses */}
              <MetricKPICard
                title="OPERATING EXPENSES"
                value={convertValue(currentPeriod.operatingExpenses || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                previousValue={convertValue(comparisonMetrics?.operatingExpenses || 0)}
                previousPeriod={comparisonPeriodLabel}
                growthPercent={-2.3}
                suffix={getUnitSuffix()}
              />

              {/* % OPEX of Revenue */}
              <MetricKPICard
                title="% OPEX OF REVENUE"
                value={((currentPeriod.operatingExpenses || 0) / (currentPeriod.revenue || 1)) * 100}
                isPercentage={true}
                locale={currentLocale}
                previousValue={comparisonMetrics ? ((comparisonMetrics.operatingExpenses / Math.max(comparisonMetrics.revenue, 1)) * 100) : 0}
                previousPeriod="YTD"
                growthPercent={-21.8}
                suffix={getUnitSuffix()}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Year to Date Summary - Blue */}
      {ytdCurrentPeriod && selectedPeriod && (
        <div className="space-y-6">
          <SectionCard
            title={`Year to Date (YTD) Summary - ${(() => {
              const endDate = new Date(selectedPeriod.end);
              return endDate.getMonth() + 1; // +1 because getMonth() returns 0-based index
            })()} months`}
            icon={BuildingOfficeIcon}
            backgroundColor="blue"
            helpTopic={helpTopics.ytdSection}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* YTD Revenue */}
              <MetricKPICard
                title="YTD REVENUE"
                value={convertValue(ytdCurrentPeriod.revenue || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                suffix={getUnitSuffix()}
              />

              {/* YTD Expenses */}
              <MetricKPICard
                title="YTD EXPENSES"
                value={convertValue((ytdCurrentPeriod.cogs || 0) + (ytdCurrentPeriod.operatingExpenses || 0) + (ytdCurrentPeriod.otherExpenses || 0))}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                breakdown={[
                  { label: 'COGS', value: convertValue(ytdCurrentPeriod.cogs || 0) },
                  { label: 'OPEX', value: convertValue(ytdCurrentPeriod.operatingExpenses || 0) },
                  { label: 'Other', value: convertValue(ytdCurrentPeriod.otherExpenses || 0) }
                ]}
                suffix={getUnitSuffix()}
              />

              {/* YTD Net Operating Income */}
              <MetricKPICard
                title="YTD NET OPERATING INCOME"
                value={convertValue(ytdCurrentPeriod.operatingIncome || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={ytdCurrentPeriod.operatingMargin || 0}
                suffix={getUnitSuffix()}
              />

              {/* YTD Net Income */}
              <MetricKPICard
                title="YTD NET INCOME"
                value={convertValue(ytdCurrentPeriod.netIncome || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={ytdCurrentPeriod.netMargin || 0}
                suffix={getUnitSuffix()}
              />

              {/* YTD EBITDA */}
              <MetricKPICard
                title="YTD EBITDA"
                value={convertValue(ytdCurrentPeriod.ebitda || 0)}
                currency={getCurrencyInfo(actualCurrency).symbol}
                locale={currentLocale}
                margin={ytdCurrentPeriod.ebitdaMargin || 0}
                suffix={getUnitSuffix()}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* COGS Analysis Section */}
      {hasCogsData && (
        <div className="mb-8">
          <SectionCard
            title="Cost of Goods Sold Analysis"
            icon={ChartBarIcon}
            backgroundColor="red"
          >
            <div className="space-y-6">
              {/* COGS Analysis Chart */}
              <COGSAnalysisChart
                data={transformCogsData}
                totalCogs={totalCogs}
                currency={getCurrencyInfo(actualCurrency).symbol}
                formatValue={formatCogsValue}
                onCategoryClick={(categoryData) => {
                  setSelectedCogsCategory(categoryData);
                  setShowCogsModal(true);
                }}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Operating Expenses Analysis Section */}
      {hasOpexData && (
        <div className="mb-8">
          <SectionCard
            title="Operating Expenses Analysis"
            icon={CalculatorIcon}
            backgroundColor="blue"
          >
            <div className="space-y-6">
              {/* Operating Expenses Analysis Chart */}
              <OperatingExpensesAnalysisChart
                data={transformOpexData}
                totalOpex={totalOpex}
                currency={getCurrencyInfo(actualCurrency).symbol}
                formatValue={formatCogsValue}
                onCategoryClick={(categoryData) => {
                  setSelectedOpexCategory(categoryData);
                  setShowOpexModal(true);
                }}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Performance Overview Heatmaps */}
      {console.log('🎯 [Debug] monthlyHeatmapData:', monthlyHeatmapData.length, 'items - rendering now')}
      {monthlyHeatmapData.length > 0 ? (
        <PerformanceOverviewHeatmaps
          monthlyData={monthlyHeatmapData}
          currency={getCurrencyInfo(actualCurrency).symbol}
          formatValue={formatCogsValue}
        />
      ) : (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-2xl px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="text-xl font-bold text-white">Performance Overview</div>
            </div>
          </div>
          <div className="bg-white rounded-b-2xl shadow-lg p-6">
            <div className="text-center text-gray-500 py-8">
              Loading monthly performance data... ({availablePeriods.length} periods available)
              <br />
              <div className="text-xs mt-2">
                Debug: companyId={companyId}, accountingMode={accountingMode}
              </div>
              <button
                onClick={() => {
                  console.log('🌟🌟🌟 [MANUAL TRIGGER] Manual trigger - fetchMonthlyHeatmapData');
                  fetchMonthlyHeatmapData()
                    .then(() => console.log('🌟🌟🌟 [MANUAL TRIGGER] Manual trigger completed successfully'))
                    .catch(error => console.error('🌟🌟🌟 [MANUAL TRIGGER] Manual trigger ERROR:', error));
                }}
                className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shadow-lg"
              >
                🔄 Manual Load Heatmap Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COGS Detail Modal */}
      <COGSDetailModal
        isOpen={showCogsModal}
        onClose={() => {
          setShowCogsModal(false);
          setSelectedCogsCategory(null);
        }}
        categoryData={selectedCogsCategory}
        currency={getCurrencyInfo(actualCurrency).symbol}
        formatValue={formatCogsValue}
      />

      {/* Operating Expenses Detail Modal */}
      <OperatingExpensesDetailModal
        isOpen={showOpexModal}
        onClose={() => {
          setShowOpexModal(false);
          setSelectedOpexCategory(null);
        }}
        categoryData={selectedOpexCategory}
        currency={getCurrencyInfo(actualCurrency).symbol}
        formatValue={formatCogsValue}
      />

    </div>
  );
}