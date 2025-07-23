"use client";

import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { WarrenChart, CHART_CONFIGS } from '../charts/WarrenChart';
import { MetricCard } from './MetricCard';
import { HeatmapChart } from './HeatmapChart';
import { ExpenseHeatmapChart } from './ExpenseHeatmapChart';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { KeyInsights } from './KeyInsights';
import { PersonnelCostsWidget } from './PersonnelCostsWidget';
import { RevenueGrowthAnalysis } from './RevenueGrowthAnalysis';
import { ProfitMarginTrendsChartJS } from './ProfitMarginTrendsChartJS';
import { RevenueForecastTrendsChartJS } from './RevenueForecastTrendsChartJS';
import { NetIncomeForecastTrendsChartJS } from './NetIncomeForecastTrendsChartJS';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { useFinancialData } from '@/lib/hooks/useFinancialData';
import { transformToPnLData } from '@/lib/utils/financial-transformers';
import { filterValidPeriods, sortPeriods } from '@/lib/utils/period-utils';
import { PnLData as PnLDataType } from '@/types/financial';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { useTranslation } from '@/lib/translations';
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  BanknotesIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface PnLData {
  periods: Period[];
  currentPeriod: Period;
  previousPeriod?: Period;
  yearToDate: YTDMetrics;
  categories: {
    revenue: RevenueCategory[];
    cogs: COGSCategory[];
    operatingExpenses: ExpenseCategory[];
  };
  forecasts?: {
    revenue: ForecastData;
    netIncome: ForecastData;
  };
}

interface Period {
  id: string;
  month: string;
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  taxes: number;
  netIncome: number;
  netMargin: number;
  ebitda: number;
  ebitdaMargin: number;
}

interface YTDMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  taxes: number;
  netIncome: number;
  netMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  monthsIncluded: number;
}

interface RevenueCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface COGSCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  subcategories?: { name: string; amount: number }[];
}

interface ForecastData {
  trend: number[];
  optimistic: number[];
  pessimistic: number[];
  months: string[];
}

interface PnLDashboardProps {
  companyId?: string;
  statementId?: string;
  currency?: string; // Deprecated - will use from API
  locale?: string;
  useMockData?: boolean;
  hybridParserData?: any; // Data from hybrid parser testing
  onPeriodChange?: (period: string, lastUpdate: Date | null) => void;
}

export function PnLDashboard({ companyId, statementId, currency = '$', locale = 'es-MX', useMockData = false, hybridParserData, onPeriodChange }: PnLDashboardProps) {
  const { t } = useTranslation(locale);
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [comparisonPeriod, setComparisonPeriod] = useState<'lastMonth' | 'lastQuarter' | 'lastYear'>('lastMonth');
  const [activeBreakdown, setActiveBreakdown] = useState<'cogs' | 'opex' | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOpexSectionCollapsed, setIsOpexSectionCollapsed] = useState(false);
  const [isCogsSectionCollapsed, setIsCogsSectionCollapsed] = useState(false);
  
  // Fetch real data using the hook
  const { data: apiData, loading: apiLoading, error, refetch } = useFinancialData({
    companyId: useMockData ? undefined : companyId,
    statementId,
    autoRefresh: false, // Disable auto-refresh to prevent constant page updates
    selectedPeriod: selectedPeriod || undefined,
    comparisonPeriod
  });
  
  // Refetch data when selected period or comparison period changes
  useEffect(() => {
    if ((selectedPeriod && selectedPeriod !== 'current') || comparisonPeriod) {
      if (companyId) {
        refetch();
      }
    }
  }, [selectedPeriod, comparisonPeriod, companyId, refetch]);
  
  // Update currency and units from API response
  useEffect(() => {
    if (apiData) {
      // Set original currency from API
      if ((apiData as any).currency) {
        setOriginalCurrency((apiData as any).currency);
        setSelectedCurrency((apiData as any).currency);
      }
      
      // Set display units from API
      if ((apiData as any).displayUnits) {
        setOriginalUnits((apiData as any).displayUnits);
        // Convert displayUnits to the format used in the UI
        if ((apiData as any).displayUnits === 'thousands') {
          setDisplayUnits('K');
        } else if ((apiData as any).displayUnits === 'millions') {
          setDisplayUnits('M');
        } else {
          setDisplayUnits('normal');
        }
      }
    }
  }, [apiData]);

  // Transform API data to dashboard format or use mock data
  const [mockData, setMockData] = useState<PnLData | null>(null);
  const data = useMockData || !companyId ? mockData : transformToPnLData(apiData);
  const loading = useMockData || !companyId ? !mockData : apiLoading;
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'ytd'>('current');
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [displayUnits, setDisplayUnits] = useState<'normal' | 'K' | 'M'>('normal');
  const [originalCurrency, setOriginalCurrency] = useState<string>('USD');
  const [originalUnits, setOriginalUnits] = useState<string>('units');
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (useMockData || !companyId) {
      // Use mock data for development
      setMockData(getMockPnLData());
    }
  }, [companyId, useMockData]);

  useEffect(() => {
    // Fetch exchange rates on mount and when base currency changes
    fetchExchangeRates();
  }, []);

  // Track if we've already notified the parent about the period
  const [hasNotifiedPeriod, setHasNotifiedPeriod] = useState(false);

  // Determine the latest period from data and notify parent component
  useEffect(() => {
    if (data && data.periods.length > 0) {
      // Filter only periods with actual data (revenue > 0)
      const periodsWithData = data.periods.filter(p => p.revenue > 0);
      
      if (periodsWithData.length > 0) {
        // Find the latest period based on year and month
        const sortedPeriods = [...periodsWithData].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          
          // Convert month names to numbers for comparison (support both Spanish and English)
          const monthOrderEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const monthOrderEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          let monthA = monthOrderEs.indexOf(a.month);
          let monthB = monthOrderEs.indexOf(b.month);
          
          // Try English if Spanish didn't match
          if (monthA === -1) monthA = monthOrderEn.indexOf(a.month);
          if (monthB === -1) monthB = monthOrderEn.indexOf(b.month);
          return monthB - monthA;
        });

        const latestPeriod = sortedPeriods[0];
        if (latestPeriod) {
          // Set the selected period to the latest period's ID if not already set
          if (!selectedPeriod) {
            setSelectedPeriod(latestPeriod.id);
          }
          
          // Notify parent about the period
          if (onPeriodChange && !hasNotifiedPeriod) {
            const periodDisplay = `${latestPeriod.month} ${latestPeriod.year}`;
            const lastUpdate = new Date();
            onPeriodChange(periodDisplay, lastUpdate);
            setHasNotifiedPeriod(true);
          }
        }
      }
    }
  }, [data, onPeriodChange, hasNotifiedPeriod, selectedPeriod]);

  const fetchExchangeRates = async () => {
    const rates = await currencyService.fetchLatestRates('USD');
    setExchangeRates(rates);
    // Initialize editing rates
    const editRates: Record<string, string> = {};
    Object.entries(rates).forEach(([currency, rate]) => {
      editRates[currency] = rate.toString();
    });
    setEditingRates(editRates);
  };


  const getMockPnLData = (): PnLData => {
    const currentMonth = {
      id: '2025-05',
      month: 'Mayo',
      year: 2025,
      revenue: 2500000,
      cogs: 1000000,
      grossProfit: 1500000,
      grossMargin: 60,
      operatingExpenses: 800000,
      operatingIncome: 700000,
      operatingMargin: 28,
      taxes: 210000,
      netIncome: 490000,
      netMargin: 19.6,
      ebitda: 750000,
      ebitdaMargin: 30
    };

    return {
      periods: generateHistoricalPeriods(),
      currentPeriod: currentMonth,
      previousPeriod: {
        ...currentMonth,
        id: '2025-04',
        month: 'Abril',
        revenue: 2300000,
        netIncome: 420000
      },
      yearToDate: {
        revenue: 11875000,  // 5 months worth
        cogs: 4750000,
        grossProfit: 7125000,
        grossMargin: 60,
        operatingExpenses: 3800000,
        operatingIncome: 3325000,
        operatingMargin: 28,
        taxes: 997500,
        netIncome: 2327500,
        netMargin: 19.6,
        ebitda: 3562500,
        ebitdaMargin: 30,
        monthsIncluded: 5
      },
      categories: {
        revenue: [
          { category: 'Servicios Profesionales', amount: 1500000, percentage: 60 },
          { category: 'Productos', amount: 750000, percentage: 30 },
          { category: 'Licencias', amount: 250000, percentage: 10 }
        ],
        cogs: [
          { category: 'Salarios Directos', amount: 600000, percentage: 60 },
          { category: 'Materiales', amount: 300000, percentage: 30 },
          { category: 'Otros Costos', amount: 100000, percentage: 10 }
        ],
        operatingExpenses: [
          { 
            category: 'Salarios Admin', 
            amount: 400000, 
            percentage: 50,
            subcategories: [
              { name: 'Ejecutivos', amount: 150000 },
              { name: 'Administración', amount: 100000 },
              { name: 'Ventas', amount: 150000 }
            ]
          },
          { 
            category: 'Marketing', 
            amount: 160000, 
            percentage: 20,
            subcategories: [
              { name: 'Digital', amount: 80000 },
              { name: 'Eventos', amount: 50000 },
              { name: 'Contenido', amount: 30000 }
            ]
          },
          { category: 'Tecnología', amount: 120000, percentage: 15 },
          { 
            category: 'Otros', 
            amount: 120000, 
            percentage: 15,
            subcategories: [
              { name: 'Oficina', amount: 80000 },
              { name: 'Gastos Generales', amount: 40000 }
            ]
          }
        ]
      },
      forecasts: {
        revenue: {
          trend: [2500000, 2600000, 2700000, 2800000, 2900000, 3000000],
          optimistic: [2500000, 2750000, 3000000, 3250000, 3500000, 3750000],
          pessimistic: [2500000, 2450000, 2400000, 2350000, 2300000, 2250000],
          months: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']
        },
        netIncome: {
          trend: [490000, 509600, 529200, 548800, 568400, 588000],
          optimistic: [490000, 539000, 588000, 637000, 686000, 735000],
          pessimistic: [490000, 480200, 470400, 460600, 450800, 441000],
          months: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']
        }
      }
    };
  };

  const generateHistoricalPeriods = (): Period[] => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May'];
    const periods: Period[] = [];
    
    // Generate periods for Jan-May 2025
    for (let i = 0; i < 5; i++) {
      const baseRevenue = 2200000 + i * 100000 + Math.random() * 200000;
      const cogs = baseRevenue * 0.4;
      const grossProfit = baseRevenue - cogs;
      const operatingExpenses = baseRevenue * 0.32;
      const operatingIncome = grossProfit - operatingExpenses;
      const taxes = operatingIncome * 0.3;
      const netIncome = operatingIncome - taxes;
      
      periods.push({
        id: `2025-${(i + 1).toString().padStart(2, '0')}`,
        month: months[i],
        year: 2025,
        revenue: baseRevenue,
        cogs,
        grossProfit,
        grossMargin: (grossProfit / baseRevenue) * 100,
        operatingExpenses,
        operatingIncome,
        operatingMargin: (operatingIncome / baseRevenue) * 100,
        taxes,
        netIncome,
        netMargin: (netIncome / baseRevenue) * 100,
        ebitda: operatingIncome + 50000,
        ebitdaMargin: ((operatingIncome + 50000) / baseRevenue) * 100
      });
    }
    
    // Also add some 2024 historical data for comparison
    const months2024 = ['Oct', 'Nov', 'Dic'];
    for (let i = 0; i < 3; i++) {
      const baseRevenue = 2000000 + Math.random() * 300000;
      const cogs = baseRevenue * 0.4;
      const grossProfit = baseRevenue - cogs;
      const operatingExpenses = baseRevenue * 0.32;
      const operatingIncome = grossProfit - operatingExpenses;
      const taxes = operatingIncome * 0.3;
      const netIncome = operatingIncome - taxes;
      
      periods.push({
        id: `2024-${(10 + i).toString().padStart(2, '0')}`,
        month: months2024[i],
        year: 2024,
        revenue: baseRevenue,
        cogs,
        grossProfit,
        grossMargin: (grossProfit / baseRevenue) * 100,
        operatingExpenses,
        operatingIncome,
        operatingMargin: (operatingIncome / baseRevenue) * 100,
        taxes,
        netIncome,
        netMargin: (netIncome / baseRevenue) * 100,
        ebitda: operatingIncome + 50000,
        ebitdaMargin: ((operatingIncome + 50000) / baseRevenue) * 100
      });
    }
    
    return periods;
  };

  const calculateVariation = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getCurrencyRate = (currency: string): number => {
    const rates = currencyService.getRates();
    return rates[currency] || 1;
  };

  const handleRateChange = (currency: string, value: string) => {
    setEditingRates(prev => ({ ...prev, [currency]: value }));
  };

  const saveCustomRate = (currency: string) => {
    const rate = parseFloat(editingRates[currency]);
    if (!isNaN(rate) && rate > 0) {
      currencyService.setCustomRate(currency, rate);
      setExchangeRates(currencyService.getRates());
    }
  };

  const resetToMarketRate = (currency: string) => {
    currencyService.clearCustomRate(currency);
    const rates = currencyService.getRates();
    setExchangeRates(rates);
    setEditingRates(prev => ({ ...prev, [currency]: rates[currency].toString() }));
  };

  const formatValue = (value: number): string => {
    // First, convert the value based on original units to actual value
    let actualValue = value;
    if (originalUnits === 'thousands') {
      actualValue = value * 1000;
    } else if (originalUnits === 'millions') {
      actualValue = value * 1000000;
    }
    
    // Apply currency conversion from original currency to selected currency
    let convertedValue = currencyService.convertValue(actualValue, originalCurrency, selectedCurrency);
    
    // Apply display units
    let suffix = '';
    if (displayUnits === 'K') {
      convertedValue = convertedValue / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      convertedValue = convertedValue / 1000000;
      suffix = 'M';
    }
    
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    }).format(convertedValue);
    
    return formatted + suffix;
  };

  const formatPercentage = (value: number): string => {
    // For whole numbers, don't show decimal
    if (value % 1 === 0) {
      return `${value.toFixed(0)}%`;
    }
    return `${value.toFixed(1)}%`;
  };

  const getCurrentPeriodDisplay = (): string => {
    if (selectedPeriod === 'ytd') {
      return `YTD ${current.year}`;
    } else if (selectedPeriod) {
      // Find the selected period
      const period = data?.periods.find(p => p.id === selectedPeriod);
      return period ? `${period.month} ${period.year}` : `${current.month} ${current.year}`;
    } else {
      return `${current.month} ${current.year}`;
    }
  };

  // Helper to add common currency props
  const currencyProps = {
    currency: selectedCurrency,
    displayUnits: displayUnits
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Use selected period data or fall back to current period
  let current = data.currentPeriod;
  let previous = data.previousPeriod;
  const ytd = data.yearToDate;
  
  // Handle period selection
  if (selectedPeriod && selectedPeriod !== 'current') {
    // When a specific month is selected, use that period's data
    const selectedPeriodData = data.periods.find(p => p.id === selectedPeriod);
    if (selectedPeriodData) {
      current = selectedPeriodData;
      // Find the previous period
      const currentIndex = data.periods.findIndex(p => p.id === selectedPeriod);
      if (currentIndex > 0 && currentIndex < data.periods.length - 1) {
        previous = data.periods[currentIndex + 1]; // periods are sorted newest to oldest
      } else {
        previous = undefined;
      }
    }
  }

  return (
    <div className="space-y-8">

      {/* Global Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          {/* Left side - Period and Comparison */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <select
                value={selectedPeriod || ''}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
              >
                {data.periods.length > 0 && (() => {
                  const validPeriods = filterValidPeriods(data.periods);
                  const sortedPeriods = sortPeriods(validPeriods);
                  
                  return sortedPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.month} {period.year}
                    </option>
                  ));
                })()}
              </select>
            </div>

            <div className="text-gray-400 hidden lg:block">|</div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600 whitespace-nowrap">{t('comparison.title')}:</span>
              <select
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value as 'lastMonth' | 'lastQuarter' | 'lastYear')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[130px]"
              >
                <option value="lastMonth">{t('comparison.lastMonth')}</option>
                <option value="lastQuarter">{t('comparison.lastQuarter')}</option>
                <option value="lastYear">{t('comparison.lastYear')}</option>
              </select>
            </div>
          </div>

          {/* Right side - Currency and Units */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 relative">
              <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[100px]"
              >
                {SUPPORTED_CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.code}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowRateEditor(!showRateEditor)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('dashboard.pnl.exchangeRatesEditor')}
              >
                <PencilIcon className="h-3 w-3" />
              </button>

              {/* Exchange Rate Editor Dropdown */}
              {showRateEditor && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900">{t('dashboard.pnl.exchangeRatesTitle')}</h4>
                    <button
                      onClick={() => setShowRateEditor(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {SUPPORTED_CURRENCIES.filter(curr => curr.code !== 'USD').map(curr => (
                      <div key={curr.code} className="flex items-center space-x-2">
                        <span className="text-sm font-medium w-12">{curr.code}</span>
                        <input
                          type="number"
                          value={editingRates[curr.code] || ''}
                          onChange={(e) => handleRateChange(curr.code, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                        <button
                          onClick={() => saveCustomRate(curr.code)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title={t('dashboard.pnl.save')}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        {currencyService.hasCustomRate(curr.code) && (
                          <button
                            onClick={() => resetToMarketRate(curr.code)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title={t('dashboard.pnl.resetToMarket')}
                          >
                            <ArrowTrendingUpIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => {
                        currencyService.clearAllCustomRates();
                        fetchExchangeRates();
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('dashboard.pnl.resetAllRates')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-gray-400 hidden lg:block">|</div>

            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-gray-500" />
              <select
                value={displayUnits}
                onChange={(e) => setDisplayUnits(e.target.value as 'normal' | 'K' | 'M')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[90px]"
              >
                <option value="normal">{t('dashboard.pnl.normal')}</option>
                <option value="K">{t('dashboard.pnl.thousands')}</option>
                <option value="M">{t('dashboard.pnl.millions')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue and Profitability Section */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Colored Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('dashboard.pnl.revenueSection')} - {getCurrentPeriodDisplay()}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.revenue']} size="sm" />
            </div>
          </div>
          {/* Content */}
          <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 w-full metric-cards-container">
          <MetricCard
            title={t('metrics.totalRevenue')}
            currentValue={current.revenue}
            previousValue={previous?.revenue}
            ytdValue={ytd.revenue}
            format="currency"
            {...currencyProps}
            locale={locale}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            showBreakdown={data.categories.revenue.length > 0}
            breakdownData={data.categories.revenue.map(cat => ({
              label: cat.category,
              value: cat.amount,
              percentage: cat.percentage,
              color: 'bg-purple-600'
            }))}
            colorScheme="revenue"
            helpTopic={helpTopics['metrics.totalRevenue']}
            helpContext={{
              currentValue: current.revenue,
              previousValue: previous?.revenue,
              ytdValue: ytd.revenue,
              changePercent: calculateVariation(current.revenue, previous?.revenue || 0),
              benchmarks: {
                industry: current.revenue * 1.1,
                topPerformers: current.revenue * 1.3,
                average: current.revenue * 0.9
              }
            }}
          />
          <MetricCard
            title={t('metrics.grossProfit')}
            currentValue={current.grossProfit}
            previousValue={previous?.grossProfit}
            ytdValue={ytd.grossProfit}
            format="currency"
            {...currencyProps}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.grossMargin)}`}
            colorScheme="profit"
            helpTopic={helpTopics['metrics.grossProfit']}
            helpContext={{
              currentValue: current.grossProfit,
              previousValue: previous?.grossProfit,
              ytdValue: ytd.grossProfit,
              changePercent: calculateVariation(current.grossProfit, previous?.grossProfit || 0),
              margin: current.grossMargin,
              benchmarks: {
                industry: current.revenue * 0.65,
                target: current.revenue * 0.7,
                bestInClass: current.revenue * 0.75
              }
            }}
          />
          <MetricCard
            title={t('metrics.operatingIncome')}
            currentValue={current.operatingIncome}
            previousValue={previous?.operatingIncome}
            ytdValue={ytd.operatingIncome}
            format="currency"
            {...currencyProps}
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.operatingMargin)}`}
            colorScheme={current.operatingIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.operatingIncome']}
            helpContext={{
              currentValue: current.operatingIncome,
              previousValue: previous?.operatingIncome,
              ytdValue: ytd.operatingIncome,
              changePercent: calculateVariation(current.operatingIncome, previous?.operatingIncome || 0),
              margin: current.operatingMargin,
              benchmarks: {
                industry: current.revenue * 0.15,
                target: current.revenue * 0.2,
                bestInClass: current.revenue * 0.25
              }
            }}
          />
          <MetricCard
            title={t('metrics.netIncome')}
            currentValue={current.netIncome}
            previousValue={previous?.netIncome}
            ytdValue={ytd.netIncome}
            format="currency"
            {...currencyProps}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.netMargin)}`}
            colorScheme={current.netIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.netIncome']}
            helpContext={{
              currentValue: current.netIncome,
              previousValue: previous?.netIncome,
              ytdValue: ytd.netIncome,
              changePercent: calculateVariation(current.netIncome, previous?.netIncome || 0),
              margin: current.netMargin,
              benchmarks: {
                industry: current.revenue * 0.1,
                target: current.revenue * 0.15,
                bestInClass: current.revenue * 0.2
              }
            }}
          />
          <MetricCard
            title={t('metrics.ebitda')}
            currentValue={current.ebitda}
            previousValue={previous?.ebitda}
            ytdValue={ytd.ebitda}
            format="currency"
            {...currencyProps}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.ebitdaMargin)}`}
            colorScheme={current.ebitda >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.ebitda']}
            helpContext={{
              currentValue: current.ebitda,
              previousValue: previous?.ebitda,
              ytdValue: ytd.ebitda,
              changePercent: calculateVariation(current.ebitda, previous?.ebitda || 0),
              margin: current.ebitdaMargin,
              benchmarks: {
                industry: current.revenue * 0.2,
                target: current.revenue * 0.25,
                bestInClass: current.revenue * 0.3
              }
            }}
          />
        </div>
          </div>
        </div>
      </div>

      {/* Cost Structure Section */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Colored Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CalculatorIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('dashboard.pnl.costsSection')} - {getCurrentPeriodDisplay()}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
            </div>
          </div>
          {/* Content */}
          <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div onDoubleClick={() => setActiveBreakdown(activeBreakdown === 'cogs' ? null : 'cogs')}>
            <MetricCard
              title={t('metrics.costOfGoodsSold')}
              currentValue={current.cogs}
              previousValue={previous?.cogs}
              ytdValue={ytd.cogs}
              format="currency"
              {...currencyProps}
              icon={<CalculatorIcon className="h-5 w-5" />}
              colorScheme="cost"
              helpTopic={helpTopics['metrics.cogs']}
              helpContext={{
                currentValue: current.cogs,
                previousValue: previous?.cogs,
                ytdValue: ytd.cogs,
                changePercent: calculateVariation(current.cogs, previous?.cogs || 0),
                benchmarks: {
                  industry: current.revenue * 0.35,
                  efficient: current.revenue * 0.30,
                  target: current.revenue * 0.40
                }
              }}
            />
          </div>

          <div onDoubleClick={() => setActiveBreakdown(activeBreakdown === 'opex' ? null : 'opex')}>
            <MetricCard
              title={t('metrics.operatingExpenses')}
              currentValue={current.operatingExpenses}
              previousValue={previous?.operatingExpenses}
              ytdValue={ytd.operatingExpenses}
              format="currency"
              {...currencyProps}
              icon={<DocumentTextIcon className="h-5 w-5" />}
              colorScheme="cost"
              helpTopic={helpTopics['metrics.operatingExpenses']}
              helpContext={{
                currentValue: current.operatingExpenses,
                previousValue: previous?.operatingExpenses,
                ytdValue: ytd.operatingExpenses,
                changePercent: calculateVariation(current.operatingExpenses, previous?.operatingExpenses || 0),
                benchmarks: {
                  industry: current.revenue * 0.20,
                  efficient: current.revenue * 0.15,
                  target: current.revenue * 0.25
                }
              }}
            />
          </div>

          <MetricCard
            title={t('metrics.cogsPercentage')}
            currentValue={(current.cogs / current.revenue) * 100}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.cogs / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.cogsPercentage']}
            helpContext={{
              currentValue: (current.cogs / current.revenue) * 100,
              previousValue: previous ? (previous.cogs / previous.revenue) * 100 : undefined,
              ytdValue: (ytd.cogs / ytd.revenue) * 100,
              benchmarks: {
                excellent: 30,
                good: 35,
                average: 40,
                poor: 45
              }
            }}
          />

          <MetricCard
            title={t('metrics.opexPercentage')}
            currentValue={(current.operatingExpenses / current.revenue) * 100}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.operatingExpenses / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.opexPercentage']}
            helpContext={{
              currentValue: (current.operatingExpenses / current.revenue) * 100,
              previousValue: previous ? (previous.operatingExpenses / previous.revenue) * 100 : undefined,
              ytdValue: (ytd.operatingExpenses / ytd.revenue) * 100,
              benchmarks: {
                excellent: 15,
                good: 20,
                average: 25,
                poor: 30
              }
            }}
          />
        </div>
          </div>
        </div>
      </div>

      {/* YTD Section - Only show when not viewing YTD */}
      {selectedPeriod !== 'ytd' && (
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Colored Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('dashboard.pnl.ytdSection')}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.ytd']} size="sm" />
            </div>
          </div>
          {/* Content */}
          <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('metrics.ytdRevenue')}
            currentValue={ytd.revenue}
            format="currency"
            {...currencyProps}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            subtitle={`${ytd.monthsIncluded} ${t('metrics.months')}`}
            colorScheme="revenue"
            helpTopic={helpTopics['metrics.ytdRevenue']}
          />
          <MetricCard
            title={t('metrics.ytdExpenses')}
            currentValue={ytd.cogs + ytd.operatingExpenses}
            format="currency"
            {...currencyProps}
            icon={<CalculatorIcon className="h-5 w-5" />}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.ytdExpenses']}
          />
          <MetricCard
            title={t('metrics.ytdNetIncome')}
            currentValue={ytd.netIncome}
            format="currency"
            {...currencyProps}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(ytd.netMargin)}`}
            colorScheme={ytd.netIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.ytdNetIncome']}
          />
          <MetricCard
            title={t('metrics.ytdEbitda')}
            currentValue={ytd.ebitda}
            format="currency"
            {...currencyProps}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(ytd.ebitdaMargin)}`}
            colorScheme={ytd.ebitda >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.ytdEbitda']}
          />
        </div>
          </div>
        </div>
      </div>
      )}

      {/* Category Breakdown Section with Heatmap */}
      {activeBreakdown && (
        <div className="mb-8">
          <ExpenseHeatmapChart
            data={activeBreakdown === 'cogs' ? data.categories.cogs : data.categories.operatingExpenses}
            title={activeBreakdown === 'cogs' ? t('metrics.cogsBreakdown') : t('metrics.opexBreakdown')}
            subtitle={activeBreakdown === 'cogs' ? t('heatmap.cogsSubtitle') : t('heatmap.opexSubtitle')}
            type={activeBreakdown}
            currency={currency}
            displayUnits={displayUnits}
            locale={locale}
            onCategoryClick={(expense) => {
              setSelectedExpense(expense);
              setIsExpenseModalOpen(true);
            }}
          />
          
          {/* Close Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setActiveBreakdown(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>{t('common.close')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cost Analysis - Operating Expenses & COGS Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Operating Expenses Analysis - Collapsible Heatmap */}
        {data.categories.operatingExpenses && data.categories.operatingExpenses.length > 0 && (
          <div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Colored Header with collapse/expand controls */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('dashboard.pnl.operatingExpensesAnalysis')}
                    </h3>
                    <p className="text-sm text-white/80 mt-1">
                      {t('heatmap.opexSubtitle')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Fold/Unfold section */}
                  <button
                    onClick={() => setIsOpexSectionCollapsed(!isOpexSectionCollapsed)}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    title={isOpexSectionCollapsed ? t('common.expand') : t('common.collapse')}
                  >
                    {isOpexSectionCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Collapsible content */}
            {!isOpexSectionCollapsed && (
              <div className="p-6">
                <ExpenseHeatmapChart
                    data={data.categories.operatingExpenses}
                    title=""
                    subtitle=""
                    type="opex"
                    currency={currency}
                    displayUnits={displayUnits}
                    locale={locale}
                    onCategoryClick={(expense) => {
                      console.log('PnL Dashboard - OpEx expense clicked:', expense);
                      setSelectedExpense(expense);
                      setIsExpenseModalOpen(true);
                      console.log('PnL Dashboard - modal state set to true');
                    }}
                  />
              </div>
            )}
          </div>
        </div>
        )}

        {/* COGS Analysis - Collapsible Heatmap */}
        {data.categories.cogs && data.categories.cogs.length > 0 && (
          <div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Colored Header with collapse/expand controls */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CalculatorIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('dashboard.pnl.cogsAnalysis')}
                    </h3>
                    <p className="text-sm text-white/80 mt-1">
                      {t('heatmap.cogsSubtitle')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Fold/Unfold section */}
                  <button
                    onClick={() => setIsCogsSectionCollapsed(!isCogsSectionCollapsed)}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    title={isCogsSectionCollapsed ? t('common.expand') : t('common.collapse')}
                  >
                    {isCogsSectionCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Collapsible content */}
            {!isCogsSectionCollapsed && (
              <div className="p-6">
                <ExpenseHeatmapChart
                    data={data.categories.cogs}
                    title=""
                    subtitle=""
                    type="cogs"
                    currency={currency}
                    displayUnits={displayUnits}
                    locale={locale}
                    onCategoryClick={(expense) => {
                      console.log('PnL Dashboard - COGS expense clicked:', expense);
                      setSelectedExpense(expense);
                      setIsExpenseModalOpen(true);
                    }}
                  />
              </div>
            )}
          </div>
        </div>
        )}
      </div>


      {/* Revenue Growth Analysis */}
      <div className="mb-8">
        <RevenueGrowthAnalysis 
          chartData={data.periods.filter(p => p.revenue > 0)} // Only show periods with actual data
          currentMonth={current}
          previousMonth={previous}
          currency={selectedCurrency}
          displayUnits={displayUnits}
          formatValue={formatValue}
          formatPercentage={formatPercentage}
          locale={locale}
        />
      </div>

      {/* Tax Overview and Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tax Overview Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CalculatorIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('tax.summary')}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" className="text-white hover:text-gray-200" />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            
            <div className="space-y-6">
              {/* Impuestos del período */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">{t('tax.periodTaxes')}</span>
                  <span className="font-bold text-lg text-amber-700">{formatValue(current.taxes)}</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              
              {/* Tasa efectiva */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{t('tax.effectiveRate')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 relative">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="18" stroke="#FEF3C7" strokeWidth="4" fill="none" />
                        <circle 
                          cx="24" cy="24" r="18" 
                          stroke="#F59E0B" 
                          strokeWidth="4" 
                          fill="none" 
                          strokeDasharray={`${2 * Math.PI * 18}`}
                          strokeDashoffset={`${2 * Math.PI * 18 * (1 - (current.operatingIncome > 0 ? Math.min(current.taxes / current.operatingIncome, 1) : 0))}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-700">
                        {current.operatingIncome > 0 ? formatPercentage((current.taxes / current.operatingIncome) * 100) : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Impuestos YTD */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{t('tax.ytdTaxes')}</span>
                  <span className="font-bold text-lg text-amber-700">{formatValue(ytd.taxes)}</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Efficiency Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('efficiency.title')}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" className="text-white hover:text-gray-200" />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            
            <div className="space-y-6">
              {/* Costo por peso */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">{t('efficiency.costPerRevenue')}</span>
                  <span className="font-bold text-lg text-emerald-700">
                    {selectedCurrency} {((current.cogs + current.operatingExpenses) / current.revenue).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{t('efficiency.optimal')}: &lt; {selectedCurrency} 0.70</span>
                </div>
              </div>
              
              {/* ROI Operacional */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{t('efficiency.operationalRoi')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xl text-emerald-700">
                      {formatPercentage((current.operatingIncome / (current.cogs + current.operatingExpenses)) * 100)}
                    </span>
                    <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-emerald-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (current.operatingIncome / (current.cogs + current.operatingExpenses)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Additional Sections */}
      



      {/* Performance Overview */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Colored Header */}
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('dashboard.pnl.performanceOverview')}
                </h3>
              </div>
              <HelpIcon topic={helpTopics['dashboard.performance']} size="sm" />
            </div>
          </div>
          {/* Content */}
          <div className="p-6">
        
        {/* Side-by-side heatmaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Card: Monthly Revenue Performance */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">{t('performance.monthlyRevenueTitle')}</h4>
              <p className="text-sm text-gray-600">{t('performance.revenueSubtitle')}</p>
            </div>
            <HeatmapChart
              data={data.periods.filter(p => p.revenue > 0).slice(-12).map(p => ({
                month: p.month,
                value: p.revenue,
                label: `${formatValue(p.revenue)}`
              }))}
              title=""
              subtitle=""
              colorScale="revenue"
              interactive={true}
              currency={selectedCurrency}
              displayUnits={displayUnits}
              locale={locale}
            />
          </div>

          {/* Right Card: Monthly Net Margin Performance */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">{t('performance.monthlyMarginTitle')}</h4>
              <p className="text-sm text-gray-600">{t('performance.marginSubtitle')}</p>
            </div>
            <HeatmapChart
              data={data.periods.filter(p => p.revenue > 0).slice(-12).map(p => ({
                month: p.month,
                value: p.netMargin,
                label: `${formatPercentage(p.netMargin)}`
              }))}
              title=""
              subtitle=""
              colorScale="margin"
              interactive={true}
              currency={selectedCurrency}
              displayUnits={displayUnits}
              locale={locale}
            />
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Forecast Trends - Revenue & Net Income Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend & 6-Month Forecast */}
        <div>
          <RevenueForecastTrendsChartJS
            historicalData={data.periods}
            forecastData={data.forecasts?.revenue ? data.forecasts.revenue.months.map((month, idx) => ({
              month,
              revenue: data.forecasts?.revenue?.trend?.[idx] || 0,
              upperBound: data.forecasts?.revenue?.optimistic?.[idx] || 0,
              lowerBound: data.forecasts?.revenue?.pessimistic?.[idx] || 0
            })) : []}
            currentTrendPercentage={previous ? calculateVariation(current.revenue, previous.revenue) : 0}
            sixMonthForecast={data.forecasts?.revenue?.trend[5] || 0}
            upperConfidence={data.forecasts?.revenue?.optimistic[5] || 0}
            lowerConfidence={data.forecasts?.revenue?.pessimistic[5] || 0}
            formatValue={formatValue}
            formatPercentage={formatPercentage}
            locale={locale}
          />
        </div>

        {/* Net Income Trend & 6-Month Forecast */}
        <div>
          <NetIncomeForecastTrendsChartJS
            historicalData={data.periods}
            forecastData={data.forecasts?.netIncome ? data.forecasts.netIncome.months.map((month, idx) => ({
              month,
              netIncome: data.forecasts?.netIncome?.trend?.[idx] || 0,
              upperBound: data.forecasts?.netIncome?.optimistic?.[idx] || 0,
              lowerBound: data.forecasts?.netIncome?.pessimistic?.[idx] || 0
            })) : []}
            currentTrendPercentage={previous ? calculateVariation(current.netIncome, previous.netIncome) : 0}
            sixMonthForecast={data.forecasts?.netIncome?.trend[5] || 0}
            upperConfidence={data.forecasts?.netIncome?.optimistic[5] || 0}
            lowerConfidence={data.forecasts?.netIncome?.pessimistic[5] || 0}
            formatValue={formatValue}
            formatPercentage={formatPercentage}
            locale={locale}
          />
        </div>
      </div>

      {/* Profit Margin Trends & Cost Efficiency Analysis Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Profit Margin Trends */}
        <div className="h-full">
          <ProfitMarginTrendsChartJS
            chartData={data.periods}
            formatPercentage={formatPercentage}
            locale={locale}
          />
        </div>

        {/* Cost Efficiency Analysis */}
        <div className="h-full">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {t('dashboard.pnl.costEfficiencyAnalysis')}
                  </h3>
                </div>
                <HelpIcon topic={helpTopics['dashboard.costEfficiency']} size="sm" className="text-white hover:text-gray-200" />
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Cost Per Revenue */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="text-2xl font-bold text-purple-700 mb-2">
                  {current.revenue > 0 
                    ? `${selectedCurrency} ${(((current.cogs + current.operatingExpenses) / current.revenue)).toFixed(2)}`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-purple-600 font-medium mb-1">{t('efficiency.costPerRevenue')}</div>
                <div className="text-xs text-purple-500">
                  {current.revenue > 0 
                    ? `${t('efficiency.forEvery')} ${selectedCurrency}1 ${t('efficiency.ofRevenue')}, ${selectedCurrency}${(((current.cogs + current.operatingExpenses) / current.revenue)).toFixed(2)} ${t('efficiency.inCosts')}`
                    : ''
                  }
                </div>
              </div>
              
              {/* % Cost of Revenue */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl">
                <div className="text-2xl font-bold text-amber-700 mb-2">
                  {current.revenue > 0 
                    ? `${(((current.revenue - current.grossProfit) / current.revenue) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-amber-600 font-medium mb-1">{t('efficiency.costOfRevenuePercent')}</div>
                <div className="text-xs text-amber-500">
                  {current.revenue > 0 
                    ? `${formatValue(current.revenue - current.grossProfit)} ${t('efficiency.ofTotalRevenue')}`
                    : ''
                  }
                </div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-amber-200 rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((current.revenue - current.grossProfit) / current.revenue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* % OpEx */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  {current.revenue > 0 
                    ? `${((current.operatingExpenses / current.revenue) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-blue-600 font-medium mb-1">{t('efficiency.opexPercent')}</div>
                <div className="text-xs text-blue-500">
                  {current.revenue > 0 
                    ? `${formatValue(current.operatingExpenses)} ${t('efficiency.ofTotalRevenue')}`
                    : ''
                  }
                </div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (current.operatingExpenses / current.revenue) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-blue-600 ml-2">{t('efficiency.target')}: &lt;25%</span>
                </div>
              </div>
            </div>
            
            {/* Cost Breakdown Chart - Top 3 + Others */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('efficiency.costBreakdown')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  // Sort categories by amount (biggest first)
                  const sortedExpenses = [...data.categories.operatingExpenses].sort((a, b) => b.amount - a.amount);
                  const top3 = sortedExpenses.slice(0, 3);
                  const others = sortedExpenses.slice(3);
                  const othersTotal = others.reduce((sum, exp) => sum + exp.amount, 0);
                  
                  // Create display items: top 3 + others
                  const displayItems = [
                    ...top3,
                    ...(othersTotal > 0 ? [{
                      category: t('costs.others'),
                      amount: othersTotal,
                      percentage: (othersTotal / current.operatingExpenses) * 100
                    }] : [])
                  ];
                  
                  return displayItems.map((expense, idx) => {
                    const percentage = (expense.amount / current.operatingExpenses) * 100;
                    return (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{expense.category}</span>
                          <span className="text-lg font-bold text-gray-800">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-3">
                          {formatValue(expense.amount)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              idx < 3 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Powered Insights - Key Summary at Bottom */}
      <div className="mb-8">
        <KeyInsights
          data={{
            revenue: current.revenue,
            expenses: current.cogs + current.operatingExpenses,
            netIncome: current.netIncome,
            grossMargin: current.grossMargin,
            operatingMargin: current.operatingMargin,
            cashFlow: current.revenue - current.operatingExpenses,
            previousMonth: previous ? {
              revenue: previous.revenue,
              expenses: previous.cogs + previous.operatingExpenses,
              netIncome: previous.netIncome
            } : undefined
          }}
          locale={locale}
        />
      </div>
      
      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        type="opex" // Default to opex since this is for the operating expenses heatmap
        totalRevenue={current.revenue}
        totalCategoryAmount={current.operatingExpenses}
        currency={currency}
        displayUnits={displayUnits}
        locale={locale}
      />
    </div>
  );
}