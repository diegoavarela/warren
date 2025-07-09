"use client";

import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { WarrenChart, CHART_CONFIGS } from '../charts/WarrenChart';
import { MetricCard } from './MetricCard';
import { HeatmapChart } from './HeatmapChart';
import { KeyInsights } from './KeyInsights';
import { PersonnelCostsWidget } from './PersonnelCostsWidget';
import { RevenueGrowthAnalysis } from './RevenueGrowthAnalysis';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { useFinancialData } from '@/lib/hooks/useFinancialData';
import { transformToPnLData } from '@/lib/utils/financial-transformers';
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
  currency?: string;
  locale?: string;
  useMockData?: boolean;
}

export function PnLDashboard({ companyId, statementId, currency = '$', locale = 'es-MX', useMockData = false }: PnLDashboardProps) {
  const { t } = useTranslation(locale);
  // Fetch real data using the hook
  const { data: apiData, loading: apiLoading, error, refetch } = useFinancialData({
    companyId: useMockData ? undefined : companyId,
    statementId,
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });

  // Transform API data to dashboard format or use mock data
  const [mockData, setMockData] = useState<PnLData | null>(null);
  const data = useMockData || !companyId ? mockData : transformToPnLData(apiData);
  const loading = useMockData || !companyId ? !mockData : apiLoading;
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('previous');
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'ytd'>('current');
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [displayUnits, setDisplayUnits] = useState<'normal' | 'K' | 'M'>('normal');
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
      id: '2024-12',
      month: 'Diciembre',
      year: 2024,
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
        id: '2024-11',
        month: 'Noviembre',
        revenue: 2300000,
        netIncome: 420000
      },
      yearToDate: {
        revenue: 28500000,
        cogs: 11400000,
        grossProfit: 17100000,
        grossMargin: 60,
        operatingExpenses: 9120000,
        operatingIncome: 7980000,
        operatingMargin: 28,
        taxes: 2394000,
        netIncome: 5586000,
        netMargin: 19.6,
        ebitda: 8550000,
        ebitdaMargin: 30,
        monthsIncluded: 12
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
          { category: 'Oficina', amount: 80000, percentage: 10 },
          { category: 'Otros', amount: 40000, percentage: 5 }
        ]
      },
      forecasts: {
        revenue: {
          trend: [2500000, 2600000, 2700000, 2800000, 2900000, 3000000],
          optimistic: [2500000, 2750000, 3000000, 3250000, 3500000, 3750000],
          pessimistic: [2500000, 2450000, 2400000, 2350000, 2300000, 2250000],
          months: ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May']
        },
        netIncome: {
          trend: [490000, 509600, 529200, 548800, 568400, 588000],
          optimistic: [490000, 539000, 588000, 637000, 686000, 735000],
          pessimistic: [490000, 480200, 470400, 460600, 450800, 441000],
          months: ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May']
        }
      }
    };
  };

  const generateHistoricalPeriods = (): Period[] => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const periods: Period[] = [];
    
    for (let i = 0; i < 12; i++) {
      const baseRevenue = 2000000 + Math.random() * 500000;
      const cogs = baseRevenue * 0.4;
      const grossProfit = baseRevenue - cogs;
      const operatingExpenses = baseRevenue * 0.32;
      const operatingIncome = grossProfit - operatingExpenses;
      const taxes = operatingIncome * 0.3;
      const netIncome = operatingIncome - taxes;
      
      periods.push({
        id: `2024-${(i + 1).toString().padStart(2, '0')}`,
        month: months[i],
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
    // Apply currency conversion from USD base
    let convertedValue = currencyService.convertValue(value, 'USD', selectedCurrency);
    
    // Apply units
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
    if (selectedPeriod === 'current') {
      return `${current.month} ${current.year}`;
    } else if (selectedPeriod === 'ytd') {
      return `YTD ${current.year}`;
    } else {
      // Find the selected period
      const period = data?.periods.find(p => p.id === selectedPeriod);
      return period ? `${period.month} ${period.year}` : `${current.month} ${current.year}`;
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

  const current = data.currentPeriod;
  const previous = data.previousPeriod;
  const ytd = data.yearToDate;

  // Calculate executive metrics
  const executiveMetrics = current && previous ? {
    currentCashPosition: current.revenue * 2.5, // Estimate based on revenue
    revenueGrowthYTD: ytd ? ((ytd.revenue - (previous.revenue * ytd.monthsIncluded)) / (previous.revenue * ytd.monthsIncluded)) * 100 : 0,
    cashRunwayMonths: current.revenue > (current.cogs + current.operatingExpenses) ? 999 : Math.floor((current.revenue * 2.5) / ((current.cogs + current.operatingExpenses) - current.revenue)),
    cashFlow: current.revenue - current.cogs - current.operatingExpenses
  } : null;

  const heroCards = executiveMetrics ? [
    {
      title: t('kpi.cashPosition'),
      value: formatValue(executiveMetrics.currentCashPosition),
      icon: <BanknotesIcon className="h-6 w-6" />,
      color: 'emerald' as const,
      subtitle: t('kpi.estimatedLiquidity'),
      trend: 'up' as const,
      changePercent: 5.2,
      sparkle: true
    },
    {
      title: t('kpi.revenueGrowth'),
      value: formatPercentage(executiveMetrics.revenueGrowthYTD),
      icon: <ArrowTrendingUpIcon className="h-6 w-6" />,
      color: 'blue' as const,
      subtitle: t('kpi.yearToDate'),
      trend: executiveMetrics.revenueGrowthYTD > 0 ? 'up' as const : 'down' as const,
      changePercent: Math.abs(executiveMetrics.revenueGrowthYTD),
      sparkle: true
    },
    {
      title: t('kpi.cashRunway'),
      value: `${executiveMetrics.cashRunwayMonths > 100 ? '∞' : executiveMetrics.cashRunwayMonths} Mo`,
      icon: <ClockIcon className="h-6 w-6" />,
      color: executiveMetrics.cashRunwayMonths > 6 ? 'emerald' as const : executiveMetrics.cashRunwayMonths > 3 ? 'orange' as const : 'rose' as const,
      subtitle: t('kpi.monthsRemaining'),
      trend: 'neutral' as const,
      sparkle: true
    },
    {
      title: t('kpi.cashFlow'),
      value: formatValue(executiveMetrics.cashFlow),
      icon: <ChartBarIcon className="h-6 w-6" />,
      color: executiveMetrics.cashFlow > 0 ? 'emerald' as const : 'rose' as const,
      subtitle: t('kpi.currentMonth'),
      trend: executiveMetrics.cashFlow > 0 ? 'up' as const : 'down' as const,
      changePercent: previous ? Math.abs(calculateVariation(executiveMetrics.cashFlow, previous.revenue - previous.cogs - previous.operatingExpenses)) : 0,
      sparkle: true
    }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Executive KPIs Section */}
      {heroCards.length > 0 && (
        <div className="mb-8">
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                {t('dashboard.pnl.executiveMetrics')}
              </h2>
              <HelpIcon topic={helpTopics['dashboard.profitability']} size="sm" />
            </div>
            <p className="text-gray-600 mt-1">{t('dashboard.pnl.executiveMetricsSubtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {heroCards.map((card, index) => (
              <KPICard
                key={index}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                subtitle={card.subtitle}
                trend={card.trend}
                changePercent={card.changePercent}
                sparkle={card.sparkle}
                large={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Global Controls */}
      <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-purple-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Period Selector */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <span>{t('dashboard.pnl.period')}</span>
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="current">{current.month} {current.year}</option>
              <option value="ytd">Año a la fecha (YTD)</option>
              {data.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.month} {period.year}
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Period */}
          {previous && (
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <ChartBarIcon className="h-4 w-4 text-purple-600" />
                <span>{t('dashboard.pnl.compareWith')}</span>
              </label>
              <select
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="previous">{t('dashboard.pnl.previousPeriod')}</option>
                <option value="year-ago">{t('dashboard.pnl.yearAgo')}</option>
                <option value="none">{t('dashboard.pnl.noComparison')}</option>
              </select>
            </div>
          )}

          {/* Currency Selector */}
          <div className="space-y-2 relative">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <CurrencyDollarIcon className="h-4 w-4 text-purple-600" />
              <span>{t('dashboard.pnl.currency')}</span>
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                {SUPPORTED_CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.code} ({curr.symbol})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowRateEditor(!showRateEditor)}
                className="p-2.5 bg-white border border-gray-300 rounded-lg text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-all flex items-center justify-center flex-shrink-0 w-10 h-10"
                title={t('dashboard.pnl.exchangeRatesEditor')}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>

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
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
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
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {t('dashboard.pnl.resetAllRates')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Units Selector */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <ChartBarIcon className="h-4 w-4 text-purple-600" />
              <span>{t('dashboard.pnl.units')}</span>
            </label>
            <select
              value={displayUnits}
              onChange={(e) => setDisplayUnits(e.target.value as 'normal' | 'K' | 'M')}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            >
              <option value="normal">{t('dashboard.pnl.normal')}</option>
              <option value="K">{t('dashboard.pnl.thousands')}</option>
              <option value="M">{t('dashboard.pnl.millions')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* YTD Summary Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{t('dashboard.pnl.ytdSummary')}</h3>
            <HelpIcon topic={helpTopics['dashboard.ytd']} size="sm" className="text-white/80 hover:text-white" />
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Financial Summary */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm text-gray-600">{t('ytd.revenueYtd')}</span>
                  <span className="text-xl font-bold text-purple-600">{formatValue(ytd.revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm text-gray-600">{t('ytd.expensesYtd')}</span>
                  <span className="text-xl font-bold text-rose-600">{formatValue(ytd.cogs + ytd.operatingExpenses)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-rose-600 h-1.5 rounded-full" style={{ width: `${((ytd.cogs + ytd.operatingExpenses) / ytd.revenue) * 100}%` }}></div>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm text-gray-600">{t('ytd.netIncomeYtd')}</span>
                  <span className="text-xl font-bold text-emerald-600">{formatValue(ytd.netIncome)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${(ytd.netIncome / ytd.revenue) * 100}%` }}></div>
                </div>
              </div>
            </div>
            
            {/* Margins Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{formatPercentage(ytd.grossMargin)}</div>
                <div className="text-xs text-gray-600 mt-1">{t('ytd.grossMargin')}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{formatPercentage(ytd.operatingMargin)}</div>
                <div className="text-xs text-gray-600 mt-1">{t('ytd.operatingMargin')}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{formatPercentage(ytd.ebitdaMargin)}</div>
                <div className="text-xs text-gray-600 mt-1">{t('ytd.ebitdaMargin')}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{formatPercentage(ytd.netMargin)}</div>
                <div className="text-xs text-gray-600 mt-1">{t('ytd.netMargin')}</div>
              </div>
            </div>
            
            {/* Period Info */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700">{ytd.monthsIncluded}</div>
                <div className="text-sm text-gray-600 mt-2">{t('ytd.monthsIncluded')}</div>
                <div className="text-xs text-gray-500 mt-1">Enero - Diciembre 2024</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.revenueSection')} - {getCurrentPeriodDisplay()}</h3>
          <HelpIcon topic={helpTopics['dashboard.revenue']} size="sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          />

          <MetricCard
            title={t('metrics.growthVsPrevious')}
            currentValue={calculateVariation(current.revenue, previous?.revenue || 0)}
            format="percentage"
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            trend={calculateVariation(current.revenue, previous?.revenue || 0) > 0 ? 'up' : 'down'}
            colorScheme="revenue"
          />

          <MetricCard
            title={t('metrics.monthlyProjection')}
            currentValue={current.revenue * 1.05}
            format="currency"
            {...currencyProps}
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={t('metrics.basedOnTrend')}
            colorScheme="revenue"
          />

          <MetricCard
            title={t('metrics.percentageOfTarget')}
            currentValue={87.5}
            format="percentage"
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            trend="up"
            subtitle={`${t('metrics.target')}: $2.86M`}
            colorScheme="revenue"
          />
        </div>
      </div>

      {/* Revenue Growth Analysis */}
      <RevenueGrowthAnalysis
        chartData={data.periods}
        currentMonth={current}
        previousMonth={previous}
        currency={selectedCurrency}
        displayUnits={displayUnits}
        formatValue={formatValue}
        formatPercentage={formatPercentage}
        locale={locale}
      />

      {/* Cost Structure Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.costsSection')} - {getCurrentPeriodDisplay()}</h3>
          <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('metrics.costOfGoodsSold')}
            currentValue={current.cogs}
            previousValue={previous?.cogs}
            ytdValue={ytd.cogs}
            format="currency"
            {...currencyProps}
            icon={<CalculatorIcon className="h-5 w-5" />}
            showBreakdown={data.categories.cogs.length > 0}
            breakdownData={data.categories.cogs.map(cat => ({
              label: cat.category,
              value: cat.amount,
              percentage: cat.percentage,
              color: 'bg-rose-600'
            }))}
            colorScheme="cost"
          />

          <MetricCard
            title={t('metrics.operatingExpenses')}
            currentValue={current.operatingExpenses}
            previousValue={previous?.operatingExpenses}
            ytdValue={ytd.operatingExpenses}
            format="currency"
            {...currencyProps}
            icon={<DocumentTextIcon className="h-5 w-5" />}
            showBreakdown={true}
            expandedContent={
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{t('metrics.opexBreakdown')}</h4>
                {data.categories.operatingExpenses.map((expense, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">{expense.category}</span>
                      <span className="font-medium">{formatValue(expense.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-rose-400 h-2 rounded-full"
                        style={{ width: `${expense.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            }
            colorScheme="cost"
          />

          <MetricCard
            title={t('metrics.cogsPercentage')}
            currentValue={(current.cogs / current.revenue) * 100}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.cogs / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
          />

          <MetricCard
            title={t('metrics.opexPercentage')}
            currentValue={(current.operatingExpenses / current.revenue) * 100}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.operatingExpenses / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
          />
        </div>
      </div>

      {/* Profitability Metrics */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.profitabilitySection')} - {getCurrentPeriodDisplay()}</h3>
          <HelpIcon topic={helpTopics['dashboard.profitability']} size="sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            colorScheme="profit"
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
            colorScheme="profit"
          />

          <MetricCard
            title={t('metrics.netIncome')}
            currentValue={current.netIncome}
            previousValue={previous?.netIncome}
            ytdValue={ytd.netIncome}
            format="currency"
            {...currencyProps}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.netMargin)}`}
            colorScheme="profit"
          />
        </div>
      </div>

      {/* Operating Expenses Analysis */}
      {data.categories.operatingExpenses && data.categories.operatingExpenses.length > 0 && (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <div className="p-2 bg-rose-100 rounded-lg">
            <DocumentTextIcon className="h-5 w-5 text-rose-600" />
          </div>
          <span>{t('dashboard.pnl.operatingExpensesAnalysis')}</span>
          <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
        </h3>
        <div className="space-y-4">
          {data.categories.operatingExpenses.map((expense, index) => {
            const percentage = expense.percentage;
            const isExpanded = expandedExpenseCategory === expense.category;
            const getIcon = () => {
              switch(expense.category) {
                case 'Salarios Admin': return <BanknotesIcon className="h-5 w-5" />;
                case 'Marketing': return <ChartBarIcon className="h-5 w-5" />;
                case 'Tecnología': return <CurrencyDollarIcon className="h-5 w-5" />;
                case 'Oficina': return <BuildingLibraryIcon className="h-5 w-5" />;
                default: return <DocumentTextIcon className="h-5 w-5" />;
              }
            };
            
            return (
              <div key={index} className={`
                border rounded-xl overflow-hidden transition-all duration-300
                ${isExpanded ? 'border-rose-300 shadow-md' : 'border-gray-200 hover:border-rose-200 hover:shadow-sm'}
              `}>
                <div 
                  className="p-4 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedExpenseCategory(isExpanded ? null : expense.category)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        percentage >= 30 ? 'bg-rose-100 text-rose-600' :
                        percentage >= 20 ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {getIcon()}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{expense.category}</span>
                        <span className="text-sm text-gray-500 ml-2">({formatPercentage(percentage)} del total)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-lg text-gray-900">{formatValue(expense.amount)}</span>
                      {expense.subcategories && (
                        isExpanded ? 
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" /> :
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        percentage >= 30 ? 'bg-rose-500' :
                        percentage >= 20 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                
                {isExpanded && expense.subcategories && (
                  <div className="bg-gray-50 p-4 border-t border-gray-200">
                    <div className="space-y-3">
                      {expense.subcategories.map((sub, subIndex) => (
                        <div key={subIndex} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            <span className="text-sm text-gray-700">{sub.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{formatValue(sub.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Personnel Costs Widget */}
      <PersonnelCostsWidget 
        data={{
          currentMonth: {
            salaries: 400000,
            benefits: 80000,
            bonuses: 40000,
            total: 520000
          },
          previousMonth: {
            total: 495000
          },
          ytd: {
            salaries: 4400000,
            benefits: 880000,
            bonuses: 440000,
            total: 5720000
          },
          headcount: {
            current: 150,
            previous: 145
          }
        }}
        currency={selectedCurrency}
        displayUnits={displayUnits}
        locale={locale}
      />

      {/* Revenue Growth Analysis */}
      <div className="mb-8">
        <RevenueGrowthAnalysis 
          chartData={data.periods}
          currentMonth={current}
          previousMonth={previous}
          currency={selectedCurrency}
          displayUnits={displayUnits}
          formatValue={formatValue}
          formatPercentage={formatPercentage}
          locale="es-MX"
        />
      </div>

      {/* Tax Overview and Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tax Overview Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg overflow-hidden border border-amber-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-amber-100 rounded-xl">
                <CalculatorIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Resumen de Impuestos</h3>
              <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
            </div>
            
            <div className="space-y-6">
              {/* Impuestos del período */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Impuestos del período</span>
                  <span className="font-bold text-lg text-amber-700">{formatValue(current.taxes)}</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              
              {/* Tasa efectiva */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Tasa efectiva</span>
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
                          strokeDashoffset={`${2 * Math.PI * 18 * (1 - (current.taxes / current.operatingIncome))}`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-700">
                        {formatPercentage((current.taxes / current.operatingIncome) * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Impuestos YTD */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Impuestos YTD</span>
                  <span className="font-bold text-lg text-amber-700">{formatValue(ytd.taxes)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Efficiency Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg overflow-hidden border border-emerald-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Eficiencia de Costos</h3>
              <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
            </div>
            
            <div className="space-y-6">
              {/* Costo por peso */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Costo por peso de ingreso</span>
                  <span className="font-bold text-lg text-emerald-700">
                    {selectedCurrency} {((current.cogs + current.operatingExpenses) / current.revenue).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Óptimo: &lt; {selectedCurrency} 0.70</span>
                </div>
              </div>
              
              {/* ROI Operacional */}
              <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">ROI Operacional</span>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Forecast */}
        {data.forecasts && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">{t('charts.revenueForecast')}</h4>
            <p className="text-sm text-gray-600 mb-4">{t('charts.nextSixMonths')}</p>
            <WarrenChart
              data={data.forecasts.revenue.months.map((month, i) => ({
                month,
                tendencia: data.forecasts!.revenue.trend[i],
                optimista: data.forecasts!.revenue.optimistic[i],
                pesimista: data.forecasts!.revenue.pessimistic[i]
              }))}
              config={{
                xKey: 'month',
                yKeys: ['pesimista', 'optimista', 'tendencia'],
                type: 'area',
                colors: ['#FEE2E2', '#D1FAE5', '#3B82F6'],
                height: 300,
                stacked: false,
                gradient: true
              }}
              formatValue={(value) => formatValue(value)}
            />
          </div>
        )}

        {/* Net Income Forecast */}
        {data.forecasts && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-2">{t('charts.netIncomeForecast')}</h4>
            <p className="text-sm text-gray-600 mb-4">{t('charts.nextSixMonths')}</p>
            <WarrenChart
              data={data.forecasts.netIncome.months.map((month, i) => ({
                month,
                tendencia: data.forecasts!.netIncome.trend[i],
                optimista: data.forecasts!.netIncome.optimistic[i],
                pesimista: data.forecasts!.netIncome.pessimistic[i]
              }))}
              config={{
                xKey: 'month',
                yKeys: ['pesimista', 'optimista', 'tendencia'],
                type: 'area',
                colors: ['#FEE2E2', '#D1FAE5', '#3B82F6'],
                height: 300,
                stacked: false,
                gradient: true
              }}
              formatValue={(value) => formatValue(value)}
            />
          </div>
        )}
      </div>

      {/* Charts and Heatmaps Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-8">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.trendsAnalysis')} - {getCurrentPeriodDisplay()}</h3>
          <HelpIcon topic={helpTopics['dashboard.heatmap']} size="sm" />
        </div>
        
        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <WarrenChart
            data={data.periods.map(p => ({
              month: p.month,
              'Margen Bruto': p.grossMargin,
              'Margen Operacional': p.operatingMargin,
              'Margen Neto': p.netMargin
            }))}
            config={{
              xKey: 'month',
              yKeys: ['Margen Bruto', 'Margen Operacional', 'Margen Neto'],
              type: 'line',
              height: 250
            }}
            title={t('charts.marginTrend')}
            subtitle={t('charts.lastTwelveMonths')}
            formatValue={(value) => formatPercentage(value)}
          />

          <WarrenChart
            data={data.periods.slice(-6).map(p => ({
              month: p.month,
              Ingresos: p.revenue,
              Gastos: p.cogs + p.operatingExpenses,
              'Utilidad Neta': p.netIncome
            }))}
            config={{
              xKey: 'month',
              yKeys: ['Ingresos', 'Gastos', 'Utilidad Neta'],
              type: 'bar',
              height: 250,
              colors: ['#8B5CF6', '#EF4444', '#10B981']
            }}
            title={t('charts.financialSummary')}
            subtitle={t('charts.lastSixMonths')}
            formatValue={(value) => formatValue(value)}
          />
        </div>

        {/* Heatmaps in compact layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeatmapChart
            data={data.periods.map(p => ({
              month: p.month,
              value: p.revenue,
              label: formatPercentage(calculateVariation(p.revenue, 2000000))
            }))}
            title={t('heatmap.revenue')}
            subtitle={t('heatmap.monthlyPerformance')}
            colorScale="revenue"
            interactive={true}
            currency={selectedCurrency}
            displayUnits={displayUnits}
            locale={locale}
          />

          <HeatmapChart
            data={data.periods.map(p => ({
              month: p.month,
              value: p.netMargin,
              label: `${formatValue(p.netIncome)}`
            }))}
            title={t('heatmap.netMargin')}
            subtitle={t('heatmap.clickToExclude')}
            colorScale="margin"
            interactive={true}
            currency={selectedCurrency}
            displayUnits={displayUnits}
            locale={locale}
            onExclude={(excludedMonths) => {
              console.log('Meses excluidos:', excludedMonths);
            }}
          />
        </div>
      </div>

      {/* Additional Sections */}
      
      {/* Bank Overview & Investment Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BuildingLibraryIcon className="h-5 w-5 mr-2 text-purple-600" />
              {t('dashboard.pnl.bankSummary')}
            </h3>
            <HelpIcon topic={helpTopics['dashboard.profitability']} size="sm" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('bank.mainAccount')}</span>
              <span className="font-semibold">{formatValue(1200000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('bank.savingsAccount')}</span>
              <span className="font-semibold">{formatValue(800000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{t('bank.investments')}</span>
              <span className="font-semibold">{formatValue(400000)}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{t('bank.totalAvailable')}</span>
                <span className="font-bold text-lg">{formatValue(2400000)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.investmentPortfolio')}</h3>
            <HelpIcon topic={helpTopics['dashboard.profitability']} size="sm" />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-emerald-900">{t('investments.governmentBonds')}</span>
                <span className="text-emerald-700 font-semibold">+4.2%</span>
              </div>
              <div className="text-xl font-bold text-emerald-900">{formatValue(180000)}</div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-900">{t('investments.mutualFunds')}</span>
                <span className="text-blue-700 font-semibold">+8.5%</span>
              </div>
              <div className="text-xl font-bold text-blue-900">{formatValue(150000)}</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-purple-900">{t('investments.stocks')}</span>
                <span className="text-purple-700 font-semibold">+12.3%</span>
              </div>
              <div className="text-xl font-bold text-purple-900">{formatValue(70000)}</div>
            </div>
          </div>
        </div>
      </div>


      {/* Cost Efficiency Analysis */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.pnl.costEfficiencyAnalysis')}</h3>
          <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 mb-2">
              {formatValue(current.revenue / (current.cogs + current.operatingExpenses))}
            </div>
            <div className="text-sm text-gray-600">{t('efficiency.revenuePerDollarCost')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-600 mb-2">
              {formatPercentage((current.revenue - current.cogs - current.operatingExpenses) / current.revenue * 100)}
            </div>
            <div className="text-sm text-gray-600">{t('efficiency.efficiencyMargin')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600 mb-2">
              {formatValue(current.revenue / 150)} {/* Assuming 150 employees */}
            </div>
            <div className="text-sm text-gray-600">{t('efficiency.revenuePerEmployee')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-rose-600 mb-2">
              {formatPercentage(calculateVariation(current.operatingExpenses, previous?.operatingExpenses || 0))}
            </div>
            <div className="text-sm text-gray-600">{t('efficiency.opexVariation')}</div>
          </div>
        </div>
      </div>

      {/* AI-Powered Insights */}
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
      />
    </div>
  );
}