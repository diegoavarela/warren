"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KPICard } from './KPICard';
import { MetricCard } from './MetricCard';
import { MetricKPICard } from './MetricKPICard';
import { SectionCard } from './SectionCard';
import { HorizontalStackedChart } from '../LazyComponents';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { formatCurrency } from '@/lib/utils/formatters';
import { useLocale } from '@/contexts/LocaleContext';
import { transformQuickBooksData } from '@/lib/utils/quickbooks-transformers';
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

    </div>
  );
}