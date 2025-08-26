"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { KPICard } from './KPICard';
import { WarrenChart, CHART_CONFIGS } from '../charts/WarrenChart';
import { MetricCard } from './MetricCard';
// Lazy load heavy components for better initial load performance
import { HeatmapChart, HorizontalStackedChart, ExpenseDetailModal } from '../LazyComponents';
import { KeyInsights } from './KeyInsights';
import { PersonnelCostsWidget } from './PersonnelCostsWidget';
import { RevenueGrowthAnalysis } from './RevenueGrowthAnalysis';
import { ProfitMarginTrendsChartJS } from './ProfitMarginTrendsChartJS';
import { RevenueForecastTrendsChartJS } from './RevenueForecastTrendsChartJS';
import { NetIncomeForecastTrendsChartJS } from './NetIncomeForecastTrendsChartJS';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { useLocale } from '@/contexts/LocaleContext';
// Removed legacy processed data hook - using Live API instead
import { transformToPnLData } from '@/lib/utils/financial-transformers';
import { filterValidPeriods, sortPeriods } from '@/lib/utils/period-utils';
import { PnLData as PnLDataType } from '@/types/financial';
import { HelpIcon } from '../HelpIcon';
import { SuperCoolHelpIcon, WidgetHelpButton } from '../SuperCoolHelpIcon';
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
    taxes?: TaxCategory[];
  };
  forecasts?: {
    revenue: ForecastData;
    netIncome: ForecastData;
  };
  metadata?: {
    numberFormat?: {
      decimalSeparator: '.' | ',';
      thousandsSeparator: ',' | '.' | ' ';
      decimalPlaces: number;
    };
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
  earningsBeforeTax: number;
  earningsBeforeTaxMargin: number;
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
  earningsBeforeTax: number;
  earningsBeforeTaxMargin: number;
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

interface TaxCategory {
  category: string;
  subcategory: string;
  amount: number;
  percentage: number;
  items?: { accountName: string; amount: number; percentage: number }[];
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

const PnLDashboardComponent = function PnLDashboard({ companyId, statementId, currency = '$', locale = 'es-MX', useMockData = false, hybridParserData, onPeriodChange }: PnLDashboardProps) {
  const { t } = useTranslation(locale);
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [comparisonPeriod, setComparisonPeriod] = useState<'lastMonth' | 'lastQuarter' | 'lastYear'>('lastMonth');
  const [activeBreakdown, setActiveBreakdown] = useState<'cogs' | 'opex' | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOpexSectionCollapsed, setIsOpexSectionCollapsed] = useState(false);
  const [isCogsSectionCollapsed, setIsCogsSectionCollapsed] = useState(false);
  
  // State for Live API data fetching
  const [apiData, setApiData] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Live P&L data - wrapped in useCallback to prevent unnecessary re-renders
  const fetchLivePnLData = useCallback(async () => {
    if (!companyId || useMockData) return;
    
    try {
      setApiLoading(true);
      setError(null);
      
      // Add timestamp to prevent caching and ensure fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/pnl-live/${companyId}?limit=12&t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store', // Disable caching to always get fresh configuration-based data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 404) {
          // No P&L configuration found
          setError(errorData.error || 'No P&L configuration found for this company');
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch P&L data`);
        }
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Validate data structure before setting
        
        if (!result.data.data || !result.data.periods) {
          throw new Error('Invalid data structure received from P&L API');
        }
        
        // Check if periods contain valid data (not just "23" values)
        const validPeriods = result.data.periods.filter((period: any) => 
          period && 
          typeof period === 'string' && 
          period !== '23' && 
          period.length > 0 &&
          !period.match(/^\d+$/) // Not just numbers
        );
        
        if (validPeriods.length === 0) {
          throw new Error('Invalid period data detected. The P&L configuration may have incorrect row mappings. Please check your configuration.');
        }
        setApiData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'No data received from P&L API');
      }
      
    } catch (err) {
      console.error('❌ Error fetching live P&L data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load P&L data');
      setApiData(null);
    } finally {
      setApiLoading(false);
    }
  }, [companyId, useMockData]);

  // Initial data fetch
  useEffect(() => {
    fetchLivePnLData();
  }, [fetchLivePnLData]);
  
  // Refetch data when selected period or comparison period changes
  useEffect(() => {
    if ((selectedPeriod && selectedPeriod !== 'current') || comparisonPeriod) {
      if (companyId) {
        fetchLivePnLData();
      }
    }
  }, [selectedPeriod, comparisonPeriod, companyId, fetchLivePnLData]);
  
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
      } else {
      }
    }
  }, [apiData]);

  // Transform API data to dashboard format or use mock data
  const [mockData, setMockData] = useState<PnLData | null>(null);
  
  // Transform API data to dashboard format - memoized for performance
  const transformedData = useMemo(() => {
    return apiData ? transformToPnLData(apiData) : null;
  }, [apiData]);
  if (apiData) {
  }
  if (transformedData) {
  } else {
  }
  
  const data = useMockData || !companyId ? mockData : transformedData;
  const loading = useMockData || !companyId ? !mockData : apiLoading;
  
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'ytd'>('current');
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ARS');
  const [displayUnits, setDisplayUnits] = useState<'normal' | 'K' | 'M'>('normal');
  const [userHasOverriddenUnits, setUserHasOverriddenUnits] = useState<boolean>(false);
  const [showUnitsNotification, setShowUnitsNotification] = useState<boolean>(false);
  const [suggestedUnit, setSuggestedUnit] = useState<'K' | 'M'>('K');
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

  // Smart Units Auto-Selection: Analyze data and set optimal units
  useEffect(() => {
    if (transformedData && originalUnits && !userHasOverriddenUnits) {
      const optimalUnits = analyzeOptimalDisplayUnits(transformedData, originalUnits);
      
      // Only update if the optimal units are different from current
      if (optimalUnits !== displayUnits) {
        setDisplayUnits(optimalUnits);
      }
    }
  }, [transformedData, originalUnits, userHasOverriddenUnits, displayUnits]);

  // Reset user override when data changes significantly (new company/period)
  useEffect(() => {
    if (apiData) {
      setUserHasOverriddenUnits(false); // Re-enable auto-selection for new data
    }
  }, [companyId, selectedPeriod]);

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
      earningsBeforeTax: 700000,
      earningsBeforeTaxMargin: 28,
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
        earningsBeforeTax: 3325000,
        earningsBeforeTaxMargin: 28,
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
        ],
        taxes: [
          { 
            category: 'taxes', 
            subcategory: 'Income Tax', 
            amount: 180000, 
            percentage: 75,
            items: [{ accountName: 'Federal Income Tax', amount: 180000, percentage: 100 }]
          },
          { 
            category: 'taxes', 
            subcategory: 'VAT/IVA', 
            amount: 60000, 
            percentage: 25,
            items: [{ accountName: 'IVA por Pagar', amount: 60000, percentage: 100 }]
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
        earningsBeforeTax: operatingIncome,
        earningsBeforeTaxMargin: (operatingIncome / baseRevenue) * 100,
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
        earningsBeforeTax: operatingIncome,
        earningsBeforeTaxMargin: (operatingIncome / baseRevenue) * 100,
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

  const formatValue = useCallback((value: number): string => {
    // 🔍 ULTRA-DEBUG: Log every formatting operation
    
    // Handle edge cases
    if (!value || isNaN(value)) {
      return '0';
    }
    
    let actualValue = value;
    let convertedValue = currencyService.convertValue(actualValue, originalCurrency, selectedCurrency);
    
    // First, normalize the value to base units based on what unit the data comes in (originalUnits)
    let normalizedValue = convertedValue;
    
    if (originalUnits === 'thousands') {
      normalizedValue = convertedValue * 1000; // Convert from thousands to normal
    } else if (originalUnits === 'millions') {
      normalizedValue = convertedValue * 1000000; // Convert from millions to normal
    }
    // If originalUnits is 'normal' or 'units', no conversion needed
    
    // Now apply the display units conversion from the normalized value
    let displayValue = normalizedValue;
    let suffix = '';
    
    if (displayUnits === 'K') {
      // Convert to thousands
      displayValue = normalizedValue / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      // Convert to millions
      displayValue = normalizedValue / 1000000;
      suffix = 'M';
    } else if (displayUnits === 'normal') {
      // Keep as normal (base units)
      displayValue = normalizedValue;
    }
    
    // NO AUTO-SCALING: Use only the centrally determined displayUnits for consistency
    // The Smart Units Analysis system determines the optimal unit for ALL components
    // This ensures perfect consistency across the entire dashboard
    
    // Use displayValue for the final formatting
    convertedValue = displayValue;
    
    // Get the currency symbol from our supported currencies
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency);
    const currencySymbol = currencyInfo?.symbol || selectedCurrency;
    
    // Format number with appropriate precision based on magnitude
    const magnitude = Math.abs(convertedValue);
    let maximumFractionDigits = 0;
    let minimumFractionDigits = 0;
    
    if (magnitude < 10) {
      maximumFractionDigits = 2;
      minimumFractionDigits = 1;
    } else if (magnitude < 100) {
      maximumFractionDigits = 1;
      minimumFractionDigits = 0;
    } else {
      maximumFractionDigits = 0;
      minimumFractionDigits = 0;
    }
    
    // Use compact notation for very large numbers
    const useCompactNotation = magnitude >= 1000000;
    
    // Get formatting settings - prioritize configuration over locale detection
    const configNumberFormat = data?.metadata?.numberFormat;
    let decimalSeparator, thousandsSeparator;
    
    if (configNumberFormat) {
      // Use configuration formatting (consistent for all users)
      decimalSeparator = configNumberFormat.decimalSeparator;
      thousandsSeparator = configNumberFormat.thousandsSeparator;
    } else {
      // Fallback to locale detection
      const { numberFormat: localeNumberFormat } = useLocale();
      decimalSeparator = localeNumberFormat.decimalSeparator;
      thousandsSeparator = localeNumberFormat.thousandsSeparator;
    }

    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
      ...(useCompactNotation && { notation: 'compact', compactDisplay: 'short' })
    });
    
    const formattedNumber = numberFormatter.format(convertedValue);
    
    // Add space before suffix if there is one and not using compact notation
    const suffixWithSpace = (suffix && !useCompactNotation) ? ` ${suffix}` : '';
    
    // Add space after currency symbol for multi-character currencies like ARS
    const currencyWithSpace = currencySymbol.length > 1 ? `${currencySymbol} ` : currencySymbol;
    
    return `${currencyWithSpace}${formattedNumber}${suffixWithSpace}`;
  }, [selectedCurrency, originalCurrency, displayUnits, originalUnits, data?.metadata?.numberFormat]);

  const formatPercentage = useCallback((value: number): string => {
    // For whole numbers, don't show decimal
    if (value % 1 === 0) {
      return `${value.toFixed(0)}%`;
    }
    return `${value.toFixed(1)}%`;
  }, []);

  // Smart Units Analysis: Determine optimal display unit for ALL dashboard values
  const analyzeOptimalDisplayUnits = (data: any, originalUnits: string): 'normal' | 'K' | 'M' => {
    
    if (!data || !data.currentPeriod) {
      return 'normal';
    }

    // Collect ALL financial values that will be displayed on the dashboard
    const allValues: number[] = [];
    
    // Current period values
    const current = data.currentPeriod;
    allValues.push(
      current.revenue,
      current.cogs,
      current.grossProfit,
      current.operatingExpenses,
      current.operatingIncome,
      current.earningsBeforeTax,
      current.taxes,
      current.netIncome,
      current.ebitda
    );

    // Previous period values (if available)
    if (data.previousPeriod) {
      const previous = data.previousPeriod;
      allValues.push(
        previous.revenue,
        previous.cogs,
        previous.grossProfit,
        previous.operatingExpenses,
        previous.operatingIncome,
        previous.earningsBeforeTax,
        previous.taxes,
        previous.netIncome,
        previous.ebitda
      );
    }

    // Year-to-date values
    const ytd = data.yearToDate;
    allValues.push(
      ytd.revenue,
      ytd.cogs,
      ytd.grossProfit,
      ytd.operatingExpenses,
      ytd.operatingIncome,
      ytd.earningsBeforeTax,
      ytd.taxes,
      ytd.netIncome,
      ytd.ebitda
    );

    // Category values (for charts and breakdowns)
    if (data.categories) {
      if (data.categories.revenue) {
        data.categories.revenue.forEach((cat: any) => allValues.push(cat.amount));
      }
      if (data.categories.cogs) {
        data.categories.cogs.forEach((cat: any) => allValues.push(cat.amount));
      }
      if (data.categories.operatingExpenses) {
        data.categories.operatingExpenses.forEach((cat: any) => allValues.push(cat.amount));
      }
      if (data.categories.taxes) {
        data.categories.taxes.forEach((cat: any) => allValues.push(cat.amount));
      }
    }

    // Filter out null, undefined, and zero values
    const validValues = allValues.filter(value => value && !isNaN(value) && Math.abs(value) > 0);
    
    if (validValues.length === 0) {
      return 'normal';
    }

    // Normalize values based on originalUnits (from configuration)
    const normalizedValues = validValues.map(value => {
      let normalizedValue = value;
      if (originalUnits === 'thousands') {
        normalizedValue = value * 1000; // Convert from thousands to base units
      } else if (originalUnits === 'millions') {
        normalizedValue = value * 1000000; // Convert from millions to base units
      }
      // If originalUnits is 'units' or 'normal', no conversion needed
      return Math.abs(normalizedValue);
    });

    // Find the maximum value to determine optimal unit
    const maxValue = Math.max(...normalizedValues);

    // Determine optimal unit based on comfort thresholds
    // These thresholds ensure values fit comfortably in cards
    let selectedUnit: 'normal' | 'K' | 'M';
    if (maxValue >= 100000000) {
      // 100M+ needs millions (fits as "999.9M")
      selectedUnit = 'M';
    } else if (maxValue >= 100000) {
      // 100K+ needs thousands (fits as "999.9K")  
      selectedUnit = 'K';
    } else {
      // < 100K can stay normal (fits as "99,999")
      selectedUnit = 'normal';
    }
    
    // 🚨 DETECT MIXED UNITS: Check if user chose 'normal' but system suggests different
    if (displayUnits === 'normal' && selectedUnit !== 'normal' && userHasOverriddenUnits) {
      setShowUnitsNotification(true);
      setSuggestedUnit(selectedUnit as 'K' | 'M');
    } else {
      setShowUnitsNotification(false);
    }
    
    return selectedUnit;
  };

  // Clean up category names by removing redundant suffixes and handling database IDs
  const cleanCategoryName = (categoryName: string) => {
    if (!categoryName || categoryName.trim() === '') {
      return 'Unknown Category';
    }
    
    const trimmedName = categoryName.trim();
    
    // More conservative database ID detection to avoid false positives with Spanish names
    // Only flag as database ID if it's clearly a hash (all hex chars, long, no spaces)
    const isDefinitelyHashId = /^[a-f0-9]{24,}$/i.test(trimmedName);
    
    // Check for UUID patterns (contains hyphens and is hex)
    const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmedName);
    
    // Check for very long alphanumeric strings without meaningful words (likely database IDs)
    const isLikelyId = trimmedName.length > 20 && 
                       !/\s/.test(trimmedName) && 
                       /^[a-zA-Z0-9_-]+$/.test(trimmedName) &&
                       !/^(servicios|productos|gastos|ingresos|costos|ventas|administr|profesional|marketing|personal|salarios|impuestos|intereses|depreciacion|amortizacion)/i.test(trimmedName);
    
    if (isDefinitelyHashId || isUUID || isLikelyId) {
      return 'Professional Services';
    }
    
    // Clean up common suffixes but preserve Spanish account names
    const cleaned = trimmedName
      .replace(/\s*\(CoR\)$/i, '') // Remove (CoR) suffix
      .replace(/\s*\(cor\)$/i, '') // Remove (cor) suffix
      .replace(/\s*\(total\)$/i, '') // Remove (total) suffix
      .trim();
    
    // Handle specific edge cases
    if (cleaned === '(cor)' || cleaned === 'cor' || cleaned === '') {
      return 'Contract Services';
    }
    
    // Preserve Spanish account names and improve readability
    const formatted = cleaned
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    
    return formatted || 'Professional Services';
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

  // Use comparison data if available (for lastQuarter, lastYear comparisons)
  if ((data as any).comparisonData && comparisonPeriod !== 'lastMonth') {
    previous = (data as any).comparisonData;
  } else if (comparisonPeriod !== 'lastMonth' && !(data as any).comparisonData) {
    // No comparison data available for the requested period
    previous = undefined;
  }
  
  // Handle period selection
  if (selectedPeriod && selectedPeriod !== 'current') {
    // When a specific month is selected, use that period's data
    const selectedPeriodData = data.periods.find(p => p.id === selectedPeriod);
    
    if (selectedPeriodData) {
      current = selectedPeriodData;
      
      // Work with sorted and deduplicated periods to find previous
      const validPeriods = filterValidPeriods(data.periods);
      const sortedPeriods = sortPeriods(validPeriods);
      
      // Find the current period in the sorted array
      const currentIndex = sortedPeriods.findIndex(p => 
        p.month === selectedPeriodData.month && p.year === selectedPeriodData.year
      );
      
      if (currentIndex >= 0 && currentIndex < sortedPeriods.length - 1) {
        // Only use sorted periods for lastMonth comparison, preserve comparison data for others
        if (comparisonPeriod === 'lastMonth') {
          previous = sortedPeriods[currentIndex + 1] as any; // periods are sorted newest to oldest, so previous (older) is at currentIndex + 1
        }
        // else: keep the comparison data that was set earlier for lastQuarter/lastYear
      } else {
        if (comparisonPeriod === 'lastMonth') {
          previous = undefined;
        }
        // else: keep the comparison data that was set earlier (could be null if no data available)
      }
    }
  }

  // Handle invalid configuration case
  if (error && error.includes('Invalid period data detected')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <InformationCircleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              P&L Configuration Issue
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/dashboard/company-admin/configurations'}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Fix Configuration
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/company-admin/configurations/new'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create New Configuration
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>
              This usually happens when the period headers (row mapping) in your configuration 
              don't match the actual Excel structure. Check your configuration's row and column mappings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle the case when no P&L configuration exists
  if (error && error.includes('No active P&L configuration found')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No P&L Configuration Found
            </h2>
            <p className="text-gray-600 mb-6">
              To view the P&L dashboard, you need to create a P&L configuration first. 
              This will define how your Excel data should be mapped and processed.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/dashboard/company-admin/configurations/new'}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create P&L Configuration
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/company-admin/configurations'}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View All Configurations
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>
              Need help? P&L configurations map your Excel columns to financial metrics 
              like revenue, costs, and profitability calculations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle other errors
  if (error && !apiLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <InformationCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Load P&L Data
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
          </div>
          
          <button
            onClick={fetchLivePnLData}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (apiLoading && !apiData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading P&L data...</p>
        </div>
      </div>
    );
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
                onChange={(e) => {
                  setSelectedCurrency(e.target.value);
                }}
                className="pl-3 pr-10 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[110px]"
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
                onChange={(e) => {
                  const newUnits = e.target.value as 'normal' | 'K' | 'M';
                  setDisplayUnits(newUnits);
                  setUserHasOverriddenUnits(true); // Mark as user override
                }}
                className="pl-3 pr-12 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
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
              <SuperCoolHelpIcon 
                topic="dashboard.revenue" 
                context={{ widget: 'revenue-analysis', page: 'pnl-dashboard' }}
                size="sm" 
                variant="enhanced"
                showQuickTip={true}
              />
            </div>
          </div>
          {/* Content */}
          <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full metric-cards-container">
          <MetricCard
            title={t('metrics.totalRevenue')}
            currentValue={current.revenue}
            previousValue={previous?.revenue}
            ytdValue={ytd.revenue}
            originalCurrency={originalCurrency}
            format="currency"
            {...currencyProps}
            formatValue={formatValue}
            locale={locale}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            showBreakdown={false}
            breakdownData={data.categories.revenue.map(cat => ({
              label: cat.category,
              value: cat.amount,
              percentage: cat.percentage,
              color: 'bg-purple-600'
            }))}
            colorScheme="revenue"
            helpTopic={helpTopics['metrics.totalRevenue']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.grossMargin)}`}
            colorScheme="profit"
            helpTopic={helpTopics['metrics.grossProfit']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.operatingMargin)}`}
            colorScheme={current.operatingIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.operatingIncome']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.netMargin)}`}
            colorScheme={current.netIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.netIncome']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(current.ebitdaMargin)}`}
            colorScheme={current.ebitda >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.ebitda']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          <div className="h-full" onDoubleClick={() => setActiveBreakdown(activeBreakdown === 'cogs' ? null : 'cogs')}>
            <MetricCard
              title={t('metrics.costOfGoodsSold')}
              currentValue={current.cogs}
              previousValue={previous?.cogs}
              ytdValue={ytd.cogs}
              format="currency"
              originalCurrency={originalCurrency}
              {...currencyProps}
              formatValue={formatValue}
              icon={<CalculatorIcon className="h-5 w-5" />}
              colorScheme="cost"
              helpTopic={helpTopics['metrics.cogs']}
              comparisonPeriod={comparisonPeriod}
              previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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

          <MetricCard
            title={t('metrics.cogsPercentage')}
            currentValue={(current.cogs / current.revenue) * 100}
            previousValue={previous ? (previous.cogs / previous.revenue) * 100 : undefined}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.cogs / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.cogsPercentage']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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

          <div className="h-full" onDoubleClick={() => setActiveBreakdown(activeBreakdown === 'opex' ? null : 'opex')}>
            <MetricCard
              title={t('metrics.operatingExpenses')}
              currentValue={current.operatingExpenses}
              previousValue={previous?.operatingExpenses}
              ytdValue={ytd.operatingExpenses}
              format="currency"
              originalCurrency={originalCurrency}
              {...currencyProps}
              formatValue={formatValue}
              icon={<DocumentTextIcon className="h-5 w-5" />}
              colorScheme="cost"
              helpTopic={helpTopics['metrics.operatingExpenses']}
              comparisonPeriod={comparisonPeriod}
              previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            title={t('metrics.opexPercentage')}
            currentValue={(current.operatingExpenses / current.revenue) * 100}
            previousValue={previous ? (previous.operatingExpenses / previous.revenue) * 100 : undefined}
            format="percentage"
            icon={<ChartBarIcon className="h-5 w-5" />}
            subtitle={`YTD: ${((ytd.operatingExpenses / ytd.revenue) * 100).toFixed(1)}%`}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.opexPercentage']}
            comparisonPeriod={comparisonPeriod}
            previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
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
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            subtitle={`${ytd.monthsIncluded} ${t('metrics.months')}`}
            colorScheme="revenue"
            helpTopic={helpTopics['metrics.ytdRevenue']}
          />
          <MetricCard
            title={t('metrics.ytdExpenses')}
            currentValue={ytd.cogs + ytd.operatingExpenses}
            format="currency"
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<CalculatorIcon className="h-5 w-5" />}
            colorScheme="cost"
            helpTopic={helpTopics['metrics.ytdExpenses']}
          />
          <MetricCard
            title={t('metrics.ytdNetIncome')}
            currentValue={ytd.netIncome}
            format="currency"
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
            icon={<BanknotesIcon className="h-5 w-5" />}
            subtitle={`${t('metrics.margin')}: ${formatPercentage(ytd.netMargin)}`}
            colorScheme={ytd.netIncome >= 0 ? "profit" : "cost"}
            helpTopic={helpTopics['metrics.ytdNetIncome']}
          />
          <MetricCard
            title={t('metrics.ytdEbitda')}
            currentValue={ytd.ebitda}
            format="currency"
            originalCurrency={originalCurrency}
            {...currencyProps}
            formatValue={formatValue}
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

      {/* Category Breakdown Section with Horizontal Stacked Chart */}
      {activeBreakdown && (
        <div className="mb-8">
          <HorizontalStackedChart
            data={activeBreakdown === 'cogs' ? data.categories.cogs : data.categories.operatingExpenses}
            title={activeBreakdown === 'cogs' ? t('metrics.cogsBreakdown') : t('metrics.opexBreakdown')}
            subtitle={activeBreakdown === 'cogs' ? t('heatmap.cogsSubtitle') : t('heatmap.opexSubtitle')}
            currency={selectedCurrency}
            originalCurrency={originalCurrency}
            displayUnits={displayUnits}
            locale={locale}
            formatValue={formatValue}
            onCategoryClick={(expense: { category: string; amount: number; percentage: number; subcategory?: string; items?: Array<{accountName: string; amount: number; percentage: number}> }) => {
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

      {/* COGS Analysis - Full Width (Top Priority) */}
      {data.categories.cogs && data.categories.cogs.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-2xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-gray-100 overflow-hidden">
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
              <div className="w-full">
                <HorizontalStackedChart
                    data={[...data.categories.cogs].sort((a, b) => b.amount - a.amount)}
                    currency={selectedCurrency}
                    originalCurrency={originalCurrency}
                    displayUnits={displayUnits}
                    locale={locale}
                    formatValue={formatValue}
                    title={t('metrics.cogsAnalysis')}
                    subtitle={t('heatmap.cogsSubtitle')}
                    onCategoryClick={(expense: { category: string; amount: number; percentage: number; subcategory?: string; items?: Array<{accountName: string; amount: number; percentage: number}> }) => {
                      setSelectedExpense(expense);
                      setIsExpenseModalOpen(true);
                    }}
                  />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operating Expenses Analysis - Full Width */}
      {data.categories.operatingExpenses && data.categories.operatingExpenses.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-2xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-gray-100 overflow-hidden">
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
              <div className="w-full">
                <HorizontalStackedChart
                    data={[...data.categories.operatingExpenses].sort((a, b) => b.amount - a.amount)}
                    currency={selectedCurrency}
                    originalCurrency={originalCurrency}
                    displayUnits={displayUnits}
                    locale={locale}
                    formatValue={formatValue}
                    title={t('metrics.opexAnalysis')}
                    subtitle={t('heatmap.opexSubtitle')}
                    onCategoryClick={(expense: { category: string; amount: number; percentage: number; subcategory?: string; items?: Array<{accountName: string; amount: number; percentage: number}> }) => {
                      setSelectedExpense(expense);
                      setIsExpenseModalOpen(true);
                    }}
                  />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revenue Growth Analysis */}
      <div className="mb-8">
        <RevenueGrowthAnalysis 
          chartData={data.periods.filter(p => 
            p.revenue > 0 && 
            p.month && 
            p.month !== 'undefined' && 
            p.month !== 'Unknown' &&
            p.year &&
            !isNaN(p.year)
          )} // Only show periods with actual data and valid month/year
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
              {/* Simple Tax Amount Card */}
              <div className="bg-white/70 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-600 mb-1">{t('tax.periodTaxes')}</div>
                    {/* Show tax categories if available */}
                    {'taxes' in data.categories && data.categories.taxes && data.categories.taxes.length > 0 && (
                      <div className="text-xs text-gray-500 mb-2">
                        {data.categories.taxes.map((tax: any) => cleanCategoryName(tax.label || tax.category)).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-700">
                      {(() => {
                        // Calculate total from tax categories if available
                        const taxTotal = 'taxes' in data.categories && data.categories.taxes && data.categories.taxes.length > 0
                          ? data.categories.taxes.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0)
                          : current.taxes;
                        return formatValue(taxTotal);
                      })()}
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      {(() => {
                        const taxTotal = 'taxes' in data.categories && data.categories.taxes && data.categories.taxes.length > 0
                          ? data.categories.taxes.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0)
                          : current.taxes;
                        return current.revenue > 0 ? `${formatPercentage((taxTotal / current.revenue) * 100)} of revenue` : '';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* YTD Tax Summary */}
              <div className="bg-white/70 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-600">{t('tax.ytdTaxes')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(() => {
                        // Use the actual YTD taxes from the transformer
                        const ytdTaxTotal = ytd.taxes || 0;
                        return ytd.revenue > 0 ? `${formatPercentage((ytdTaxTotal / ytd.revenue) * 100)} of YTD revenue` : '';
                      })()}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-700">
                    {(() => {
                      // YTD taxes should be the actual sum from the transformer
                      // The transformer already calculates YTD by summing all periods' taxes
                      // We just need to use that value directly
                      const ytdTaxTotal = ytd.taxes || 0;
                      
                      return formatValue(ytdTaxTotal);
                    })()}
                  </div>
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
              <HelpIcon topic={helpTopics['dashboard.costEfficiency']} size="sm" className="text-white hover:text-gray-200" />
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
                    {(() => {
                      const symbol = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || selectedCurrency;
                      const symbolWithSpace = symbol.length > 1 ? `${symbol} ` : symbol;
                      return `${symbolWithSpace}${((current.cogs + current.operatingExpenses) / current.revenue).toFixed(2)}`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{t('efficiency.optimal')}: &lt; {(() => {
                    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || selectedCurrency;
                    const symbolWithSpace = symbol.length > 1 ? `${symbol} ` : symbol;
                    return `${symbolWithSpace}0.70`;
                  })()}</span>
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
              data={data.periods.filter(p => 
                p.revenue > 0 && 
                p.month && 
                p.month !== 'undefined' && 
                p.month !== 'Unknown' &&
                p.year &&
                !isNaN(p.year)
              ).slice(-12).map(p => ({
                month: p.month,
                value: p.revenue,
                label: `${formatValue(p.revenue)}`
              }))}
              title=""
              subtitle=""
              colorScale="revenue"
              interactive={true}
              currency={selectedCurrency}
              originalCurrency={originalCurrency}
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
              data={data.periods.filter(p => 
                p.revenue > 0 && 
                p.month && 
                p.month !== 'undefined' && 
                p.month !== 'Unknown' &&
                p.year &&
                !isNaN(p.year)
              ).slice(-12).map(p => ({
                month: p.month,
                value: p.netMargin,
                label: `${formatPercentage(p.netMargin)}`
              }))}
              title=""
              subtitle=""
              colorScale="margin"
              interactive={true}
              currency={selectedCurrency}
              originalCurrency={originalCurrency}
              displayUnits={displayUnits}
              locale={locale}
            />
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Forecast Trends - Revenue & Net Income Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
        {/* Revenue Trend & 6-Month Forecast */}
        <div className="flex">
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
        <div className="flex">
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
                    ? (() => {
                        const symbol = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || selectedCurrency;
                        const symbolWithSpace = symbol.length > 1 ? `${symbol} ` : symbol;
                        return `${symbolWithSpace}${(((current.cogs + current.operatingExpenses) / current.revenue)).toFixed(2)}`;
                      })()
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-purple-600 font-medium mb-1">{t('efficiency.costPerRevenue')}</div>
                <div className="text-xs text-purple-500">
                  {current.revenue > 0 
                    ? (() => {
                        const symbol = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || selectedCurrency;
                        const symbolWithSpace = symbol.length > 1 ? `${symbol} ` : symbol;
                        return `${t('efficiency.forEvery')} ${symbolWithSpace}1 ${t('efficiency.ofRevenue')}, ${symbolWithSpace}${(((current.cogs + current.operatingExpenses) / current.revenue)).toFixed(2)} ${t('efficiency.inCosts')}`;
                      })()
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
                          <span className="text-sm font-medium text-gray-900 truncate">{cleanCategoryName(expense.category)}</span>
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
        />
      </div>
      
      {/* Units Formatting Notification */}
      {showUnitsNotification && (
        <div className="fixed top-4 right-4 bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-in slide-in-from-right-2 duration-300">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                {t('units.mixedFormattingTitle')}
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                {t('units.mixedFormattingMessage').replace('{suggestedUnit}', suggestedUnit)}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setDisplayUnits(suggestedUnit);
                    setUserHasOverriddenUnits(true);
                    setShowUnitsNotification(false);
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  {t('units.switchTo').replace('{unit}', suggestedUnit)}
                </button>
                <button
                  onClick={() => setShowUnitsNotification(false)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-3 w-3 mr-1" />
                  {t('units.dismiss')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        currency={selectedCurrency}
        displayUnits={displayUnits}
        locale={locale}
      />
    </div>
  );
};

// Memoized export for performance optimization
export const PnLDashboard = memo(PnLDashboardComponent);

// Also export as default for compatibility
export default PnLDashboard;