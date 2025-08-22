"use client";

import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { WarrenChart, CHART_CONFIGS } from '../charts/WarrenChart';
import { MetricCard } from './MetricCard';
import { HeatmapChart } from './HeatmapChart';
import { HorizontalStackedChart } from './HorizontalStackedChart';
import { KeyInsights } from './KeyInsights';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { useTranslation } from '@/lib/translations';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  BanknotesIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CircleStackIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { CashFlowGrowthAnalysis } from './CashFlowGrowthAnalysis';
import { CashFlowForecastTrendsChartJS } from './CashFlowForecastTrendsChartJS';
import { CashFlowScenarioPlanning } from './CashFlowScenarioPlanning';
import { CashFlowRunwayAnalysis } from './CashFlowRunwayAnalysis';
import { CashFlowComposition } from './CashFlowComposition';
import { CashFlowHeatmap } from './CashFlowHeatmap';

interface CashFlowDashboardProps {
  companyId?: string;
  currency?: string;
  locale?: string;
  onPeriodChange?: (period: string, update: Date) => void;
}

interface CashFlowPeriodData {
  id: string;
  month: string;
  year: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  finalBalance: number;
  lowestBalance: number;
  monthlyGeneration: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  cashBurnRate?: number;
  runwayMonths?: number;
}

interface YTDMetrics {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  averageMonthlyGeneration: number;
  monthsIncluded: number;
  averageCashBurn: number;
  projectedRunway: number;
}

interface DirectCashFlowData {
  periods: Array<{
    id: string;
    companyId: string;
    periodStart: string;
    periodEnd: string;
    periodType: 'monthly';
    lineItems: any[];
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    currency: string;
    initialBalance: number;
    finalBalance: number;
    lowestBalance: number;
    monthlyGeneration: number;
  }>;
  summary: {
    totalPeriods: number;
    currency: string;
    periodRange: string;
    lastUpdated: string;
  };
  data: any;
}

interface CashFlowData {
  periods: CashFlowPeriodData[];
  currentPeriod: CashFlowPeriodData;
  previousPeriod?: CashFlowPeriodData;
  yearToDate: YTDMetrics;
  categories: {
    operating: { name: string; amount: number; percentage: number; subcategories?: { name: string; amount: number }[] }[];
    investing: { name: string; amount: number; percentage: number; subcategories?: { name: string; amount: number }[] }[];
    financing: { name: string; amount: number; percentage: number; subcategories?: { name: string; amount: number }[] }[];
  };
  forecasts?: {
    cashFlow: ForecastData;
    runway: ForecastData;
  };
}

interface ForecastData {
  trend: number[];
  optimistic: number[];
  pessimistic: number[];
  months: string[];
}

// Custom number formatter that ensures consistent formatting across all browsers/systems
function createConsistentFormatter(
  thousandsSeparator: string,
  decimalSeparator: string,
  currencySymbol: string
) {
  return function formatNumber(value: number, options: {
    style: 'currency' | 'decimal';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    currency?: string;
  }): string {
    if (!value || isNaN(value)) return '0';
    
    const { style, minimumFractionDigits = 0, maximumFractionDigits = 1 } = options;
    
    // Handle negative values
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    
    // Round to desired decimal places
    const factor = Math.pow(10, maximumFractionDigits);
    const rounded = Math.round(absValue * factor) / factor;
    
    // Split into integer and decimal parts
    const [integerPart, decimalPart = ''] = rounded.toString().split('.');
    
    // Add thousands separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // Handle decimal part
    let formattedDecimal = decimalPart.padEnd(minimumFractionDigits, '0');
    if (maximumFractionDigits === 0) {
      formattedDecimal = '';
    } else if (formattedDecimal.length > maximumFractionDigits) {
      formattedDecimal = formattedDecimal.substring(0, maximumFractionDigits);
    }
    
    // Combine parts
    let result = formattedInteger;
    if (formattedDecimal && (minimumFractionDigits > 0 || parseFloat('0.' + formattedDecimal) > 0)) {
      result += decimalSeparator + formattedDecimal;
    }
    
    // Add currency symbol for currency style
    if (style === 'currency') {
      result = currencySymbol + ' ' + result;
    }
    
    // Add negative sign
    if (isNegative) {
      result = '-' + result;
    }
    
    return result;
  };
}

// Inner content component that has access to Smart Units context
function CashFlowDashboardContent({ 
  companyId, 
  currency = '$', 
  locale = 'es-MX',
  onPeriodChange,
  liveData,
  directData,
  isDirectMode,
  regularData,
  loading,
  error
}: CashFlowDashboardProps & {
  liveData: any;
  directData: any;
  isDirectMode: boolean;
  regularData: any;
  loading: boolean;
  error: string | null;
}) {
  // Translation hook
  const { t } = useTranslation(locale);
  
  // Get consistent locale context for number formatting
  const { numberFormat: localeNumberFormat } = useLocale();
  
  // Original Warren V2 formatting (NO Smart components)
  const [displayUnits, setDisplayUnits] = useState<'normal' | 'K' | 'M'>('normal');
  
  // Validate currency code - if it's a symbol like '$', use USD as default
  const getValidCurrencyCode = (curr?: string): string => {
    if (!curr) return 'USD';
    // If it's a symbol or invalid code, default to USD
    if (curr === '$' || curr.length < 3) return 'USD';
    return curr;
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState(getValidCurrencyCode(currency));
  
  // Update currency when live data changes
  useEffect(() => {
    if (liveData?.data?.metadata?.currency) {
      console.log('🔄 Currency Update:', {
        from: selectedCurrency,
        to: liveData.data.metadata.currency,
        apiCurrency: liveData.data.metadata.currency
      });
      setSelectedCurrency(liveData.data.metadata.currency);
    }
  }, [liveData]);
  
  // Consistent cross-browser number formatter
  const formatValue = (value: number): string => {
    if (!value || isNaN(value)) return '0';
    
    let convertedValue = value;
    let suffix = '';
    
    if (displayUnits === 'K') {
      convertedValue = value / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      convertedValue = value / 1000000;
      suffix = 'M';
    }
    
    // Get locale-specific number format settings
    const { decimalSeparator, thousandsSeparator, currencySymbol } = localeNumberFormat;
    
    // Create consistent formatter using explicit locale rules
    const formatter = createConsistentFormatter(thousandsSeparator, decimalSeparator, currencySymbol);
    
    // Ensure we have a valid currency code
    const validCurrency = getValidCurrencyCode(selectedCurrency);
    
    // For ARS, use decimal format with "ARS" prefix
    if (validCurrency === 'ARS') {
      const numberFormatted = formatter(convertedValue, {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
      });
      
      return `ARS ${numberFormatted}${suffix ? ` ${suffix}` : ''}`;
    }
    
    // For other currencies, use currency format
    const formatted = formatter(convertedValue, {
      style: 'currency',
      minimumFractionDigits: 0,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1,
      currency: validCurrency
    });
    
    return formatted + (suffix ? ` ${suffix}` : '');
  };

  // Note: Data fetching now handled by parent component

  console.log('🔍 Cash Flow Dashboard: Live data:', { liveData, loading, error, companyId });
  
  // Extract period metadata for actual vs projected distinction
  const periodMetadata = liveData?.data?.periodMetadata || {};
  const lastActualPeriodLabel = liveData?.data?.metadata?.lastActualPeriodLabel;
  
  // Utility function to check if a period is actual based on metadata
  const isPeriodActual = (periodLabel: string): boolean => {
    return periodMetadata[periodLabel]?.isActual || false;
  };
  
  // Utility function to check if a period is projected based on metadata
  const isPeriodProjected = (periodLabel: string): boolean => {
    return periodMetadata[periodLabel]?.isProjected || false;
  };
  
  console.log('📅 Period Metadata:', {
    periodMetadata,
    lastActualPeriodLabel,
    totalPeriods: Object.keys(periodMetadata).length,
    actualPeriods: Object.entries(periodMetadata).filter(([_, meta]: [string, any]) => meta?.isActual).map(([label]) => label),
    projectedPeriods: Object.entries(periodMetadata).filter(([_, meta]: [string, any]) => meta?.isProjected).map(([label]) => label)
  });
  
  // Debug: Check which configuration is being used
  if (liveData) {
    console.log('🔧 Configuration Debug - Dashboard is using:');
    console.log('- Configuration Name:', liveData.data?.metadata?.configurationName);
    console.log('- Data Source:', 'live-api');
    console.log('- Processed At:', new Date().toISOString());
    console.log('- Data Structure:', {
      periodsCount: liveData.data?.periods?.length,
      periodsFirstFew: liveData.data?.periods?.slice(0, 3),
      hasDataRows: Object.keys(liveData.data?.data?.dataRows || {}).length > 0,
      hasCategories: Object.keys(liveData.data?.data?.categories || {}).length > 0,
      hasPeriodMetadata: Object.keys(periodMetadata).length > 0
    });
  }
  
  // Debug: Show the actual structure of liveData
  if (liveData) {
    console.log('📊 Cash Flow Debug - Full live data structure:', JSON.stringify(liveData, null, 2));
    console.log('📊 Cash Flow Debug - Data periods:', liveData.data?.periods);
    console.log('📊 Cash Flow Debug - Data rows keys:', Object.keys(liveData.data?.data?.dataRows || {}));
    
    // Configuration-based processing no longer exposes Excel structure
    console.log('📊 Cash Flow Debug - Using configuration-based processing');
    
    // Show current values being used
    const febIndex = 1; // February should be index 1
    console.log('📊 Cash Flow Debug - February values (index 1):');
    console.log('- totalInflows:', liveData.data?.data?.dataRows?.totalInflows?.values[febIndex]);
    console.log('- totalOutflows:', liveData.data?.data?.dataRows?.totalOutflows?.values[febIndex]);
    console.log('- finalBalance:', liveData.data?.data?.dataRows?.finalBalance?.values[febIndex]);
    console.log('- monthlyGeneration:', liveData.data?.data?.dataRows?.monthlyGeneration?.values[febIndex]);
  }

  // Use the directData passed as prop instead of creating a new one
  // const directData already passed as prop, no need to redefine
  
  // Use the isDirectMode passed as prop instead of creating a new one
  // const isDirectMode already passed as prop, no need to redefine
  
  console.log('🔍 Cash Flow Dashboard: isDirectMode =', isDirectMode, 'liveData exists =', !!liveData);
  
  // Dashboard state matching P&L exactly
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [comparisonPeriod, setComparisonPeriod] = useState<'lastMonth' | 'lastQuarter' | 'lastYear'>('lastMonth');
  const [viewMode, setViewMode] = useState<'current' | 'ytd'>('current');
  // Note: selectedCurrency and displayUnits now managed at component top
  const [originalCurrency, setOriginalCurrency] = useState<string>('ARS'); // Data is already in ARS
  const [originalUnits, setOriginalUnits] = useState<string>('units');
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Section collapse states
  const [isOverviewSectionCollapsed, setIsOverviewSectionCollapsed] = useState(false);
  const [isAnalysisSectionCollapsed, setIsAnalysisSectionCollapsed] = useState(false);
  const [isForecastSectionCollapsed, setIsForecastSectionCollapsed] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(true);

  // Set selectedPeriod to last actual period from configuration, fallback to current month
  useEffect(() => {
    if (isDirectMode && directData && !selectedPeriod) {
      const data = transformDirectDataToCashFlowData(directData, selectedPeriod);
      
      // First priority: Use lastActualPeriod from configuration
      if (lastActualPeriodLabel) {
        console.log('🎯 [PERIOD SELECTION] Using lastActualPeriod from config:', lastActualPeriodLabel);
        // Find period matching the last actual period label
        const actualPeriod = data.periods.find(p => {
          const periodLabel = `${p.month} ${p.year}`;
          return periodLabel.toLowerCase().includes(lastActualPeriodLabel.toLowerCase()) ||
                 lastActualPeriodLabel.toLowerCase().includes(p.month.toLowerCase());
        });
        
        if (actualPeriod?.id) {
          console.log('✅ [PERIOD SELECTION] Found matching period:', actualPeriod);
          setSelectedPeriod(actualPeriod.id);
          return;
        }
      }
      
      // Fallback: Find August 2025 period specifically  
      console.log('🔄 [PERIOD SELECTION] Fallback to August 2025');
      const augustPeriod = data.periods.find(p => p.month === 'Aug' && p.year === 2025);
      if (augustPeriod?.id) {
        setSelectedPeriod(augustPeriod.id);
      } else if (data.periods[7]) {
        // Final fallback to index 7 if month matching fails
        setSelectedPeriod(data.periods[7].id);
      }
    }
  }, [isDirectMode, directData, selectedPeriod, lastActualPeriodLabel]);

  // Note: Removed auto-detection logic since we default to 'M' for cash flow data

  // Handle period change callback when data is available
  useEffect(() => {
    if (isDirectMode && directData && onPeriodChange && directData.periods.length > 0) {
      const latestPeriod = directData.periods[directData.periods.length - 1];
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const periodName = `${monthNames[new Date(latestPeriod.periodEnd).getMonth()]} ${new Date(latestPeriod.periodEnd).getFullYear()}`;
      onPeriodChange(periodName, new Date());
    }
  }, [isDirectMode, directData, onPeriodChange]);

  // Note: Data loading now handled by parent component

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    const rates = await currencyService.fetchLatestRates('USD');
    setExchangeRates(rates);
    const editRates: Record<string, string> = {};
    Object.entries(rates).forEach(([currency, rate]) => {
      editRates[currency] = rate.toString();
    });
    setEditingRates(editRates);
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

  // Note: formatValue now handled by Smart Units system

  const formatPercentage = (value: number): string => {
    if (value % 1 === 0) {
      return `${value.toFixed(0)}%`;
    }
    return `${value.toFixed(1)}%`;
  };

  const calculateVariation = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const transformDirectDataToCashFlowData = (directData: DirectCashFlowData, targetPeriodId?: string): CashFlowData => {
    // Use actual data from the periods instead of hardcoded values
    const vortexData = {
      totalIncome: directData.periods.map((p: any) => p.totalInflows),
      totalExpense: directData.periods.map((p: any) => -p.totalOutflows), // Negative for consistency
      finalBalance: directData.periods.map((p: any) => p.finalBalance),
      lowestBalance: directData.periods.map((p: any) => p.lowestBalance),
      monthlyGeneration: directData.periods.map((p: any) => p.monthlyGeneration)
    };

    const periods: CashFlowPeriodData[] = directData.periods.map((period: any, index: number) => {
      const totalInflows = vortexData.totalIncome[index] || 0;
      const totalOutflows = Math.abs(vortexData.totalExpense[index]) || 0;
      const netCashFlow = totalInflows - totalOutflows; // Calculate Net Cash Flow correctly
      const finalBalance = vortexData.finalBalance[index] || 0;
      const lowestBalance = vortexData.lowestBalance[index] || 0;
      
      // Monthly Generation (Row 114) - can be positive (generating) or negative (burning)
      const monthlyGeneration = vortexData.monthlyGeneration[index] || 0;
      
      // Debug log for August 2025 (index 7)
      if (index === 7) {
        console.log('August 2025 Monthly Generation:', {
          index,
          monthlyGeneration,
          shouldShow: `ARS ${(monthlyGeneration/1000000).toFixed(1)} M`
        });
      }
      
      // Calculate runway months based on net cash flow (if burning cash, otherwise infinite)
      const monthlyCashBurn = netCashFlow < 0 ? Math.abs(netCashFlow) : 0;
      const runwayMonths = monthlyCashBurn > 0 ? finalBalance / monthlyCashBurn : (netCashFlow > 0 ? Number.POSITIVE_INFINITY : 0);

      return {
        id: period.id,
        month: new Date(period.periodEnd).toLocaleDateString('en-US', { month: 'short' }), // Force English month names
        year: new Date(period.periodEnd).getFullYear(),
        totalInflows,
        totalOutflows,
        netCashFlow,
        finalBalance,
        lowestBalance,
        monthlyGeneration: monthlyGeneration, // Row 114 - Monthly Cash Generation
        operatingCashFlow: (period.lineItems || []).filter((li: any) => li.category === 'operating_activities').reduce((sum: number, li: any) => sum + li.amount, 0),
        investingCashFlow: (period.lineItems || []).filter((li: any) => li.category === 'investing_activities').reduce((sum: number, li: any) => sum + li.amount, 0),
        financingCashFlow: (period.lineItems || []).filter((li: any) => li.category === 'financing_activities').reduce((sum: number, li: any) => sum + li.amount, 0),
        cashBurnRate: Math.abs(monthlyCashBurn), // For runway calculation
        runwayMonths
      };
    });

    // Find current period - use targetPeriodId if provided, otherwise August 2025 or most recent
    console.log('🔍 Looking for current period in periods:', periods.map(p => `${p.month} ${p.year}`));
    console.log('🎯 Target period ID:', targetPeriodId);
    
    let currentPeriodIndex = -1;
    
    if (targetPeriodId) {
      // Find by specific period ID
      currentPeriodIndex = periods.findIndex(p => p.id === targetPeriodId);
      console.log('🎯 Found target period at index:', currentPeriodIndex);
    }
    
    // Fallback to August 2025 if target not found
    if (currentPeriodIndex === -1) {
      currentPeriodIndex = periods.findIndex(p => p.month === 'Aug' && p.year === 2025);
    }
    
    // Final fallback to most recent period
    if (currentPeriodIndex === -1) {
      currentPeriodIndex = periods.length - 1; // Most recent period
      console.log('⚠️ Target period not found, using most recent period:', currentPeriodIndex);
    }
    
    const currentPeriod = currentPeriodIndex >= 0 ? periods[currentPeriodIndex] : periods[Math.min(0, periods.length - 1)]; // Safe fallback
    const previousPeriod = currentPeriodIndex > 0 ? periods[currentPeriodIndex - 1] : (periods.length > 1 ? periods[periods.length - 2] : undefined);
    
    console.log(`✅ Selected current period: ${currentPeriod?.month} ${currentPeriod?.year} (index: ${currentPeriodIndex})`);
    console.log(`📅 Selected previous period: ${previousPeriod?.month} ${previousPeriod?.year}`);

    // YTD calculation: January 2025 to August 2025 (current month) - Direct calculation
    const ytdTotalInflows = vortexData.totalIncome.slice(0, 8).reduce((sum, val) => sum + val, 0); // Jan-Aug 2025
    const ytdTotalExpenses = vortexData.totalExpense.slice(0, 8).reduce((sum, val) => sum + Math.abs(val), 0); // Jan-Aug 2025

    // Debug log to verify correct August 2025 values
    console.log('=== CASH FLOW DATA DEBUG ===');
    console.log('All periods array:', periods.map(p => ({ month: p.month, year: p.year, id: p.id, income: p.totalInflows, expense: p.totalOutflows })));
    console.log('August 2025 Raw Data (index 7):');
    console.log('- Income:', vortexData.totalIncome[7]); // Should be 60201807.32
    console.log('- Expense:', vortexData.totalExpense[7]); // Should be -54716848.36
    console.log('- Final Balance:', vortexData.finalBalance[7]); // Should be 13308616.55
    console.log('Current Period Index found:', currentPeriodIndex);
    console.log('Current Period Object:', currentPeriod);
    console.log('YTD Totals:');
    console.log('- YTD Income:', ytdTotalInflows); // Should be 513182457.72
    console.log('- YTD Expenses:', ytdTotalExpenses); // Should be 515216725.59
    console.log('================================');
    const ytdNetCashFlow = ytdTotalInflows - ytdTotalExpenses; // YTD Net Cash Flow = YTD Inflows - YTD Outflows
    
    const yearToDate: YTDMetrics = {
      totalInflows: ytdTotalInflows,
      totalOutflows: ytdTotalExpenses,
      netCashFlow: ytdNetCashFlow,
      averageMonthlyGeneration: ytdNetCashFlow / 8,
      monthsIncluded: 8,
      averageCashBurn: vortexData.monthlyGeneration.slice(0, 8).filter(val => val < 0).reduce((sum, val) => sum + Math.abs(val), 0) / 8,
      projectedRunway: currentPeriod?.runwayMonths || 0
    };

    const totalOperating = periods.reduce((sum, p) => sum + Math.abs(p.operatingCashFlow), 0);
    const totalInvesting = periods.reduce((sum, p) => sum + Math.abs(p.investingCashFlow), 0);
    const totalFinancing = periods.reduce((sum, p) => sum + Math.abs(p.financingCashFlow), 0);
    const total = totalOperating + totalInvesting + totalFinancing;

    const categories = {
      operating: [
        { 
          name: locale?.startsWith('es') ? 'Actividades Operativas' : 'Operating Activities', 
          amount: totalOperating, 
          percentage: total > 0 ? (totalOperating / total) * 100 : 0,
          subcategories: [
            { name: locale?.startsWith('es') ? 'Ventas' : 'Sales', amount: totalOperating * 0.7 },
            { name: locale?.startsWith('es') ? 'Servicios' : 'Services', amount: totalOperating * 0.3 }
          ]
        }
      ],
      investing: [
        { 
          name: locale?.startsWith('es') ? 'Actividades de Inversión' : 'Investing Activities', 
          amount: totalInvesting, 
          percentage: total > 0 ? (totalInvesting / total) * 100 : 0,
          subcategories: [
            { name: locale?.startsWith('es') ? 'Equipamiento' : 'Equipment', amount: totalInvesting * 0.6 },
            { name: locale?.startsWith('es') ? 'Inversiones' : 'Investments', amount: totalInvesting * 0.4 }
          ]
        }
      ],
      financing: [
        { 
          name: locale?.startsWith('es') ? 'Actividades de Financiamiento' : 'Financing Activities', 
          amount: totalFinancing, 
          percentage: total > 0 ? (totalFinancing / total) * 100 : 0,
          subcategories: [
            { name: locale?.startsWith('es') ? 'Préstamos' : 'Loans', amount: totalFinancing * 0.8 },
            { name: locale?.startsWith('es') ? 'Capital' : 'Capital', amount: totalFinancing * 0.2 }
          ]
        }
      ]
    };

    // Generate mock forecast data
    const forecasts = {
      cashFlow: {
        trend: periods.slice(-6).map(p => p.netCashFlow * 1.05),
        optimistic: periods.slice(-6).map(p => p.netCashFlow * 1.15),
        pessimistic: periods.slice(-6).map(p => p.netCashFlow * 0.95),
        months: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']
      },
      runway: {
        trend: periods.slice(-6).map((p, i) => (currentPeriod.runwayMonths || 12) - i),
        optimistic: periods.slice(-6).map((p, i) => (currentPeriod.runwayMonths || 12) + 3 - i),
        pessimistic: periods.slice(-6).map((p, i) => (currentPeriod.runwayMonths || 12) - 3 - i),
        months: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']
      }
    };

    return {
      periods,
      currentPeriod,
      previousPeriod,
      yearToDate,
      categories,
      forecasts
    };
  };

  const getCurrentPeriodDisplay = (): string => {
    if (!directData || !directData.periods.length) return '';
    const current = transformDirectDataToCashFlowData(directData, selectedPeriod).currentPeriod;
    return `${current.month} ${current.year}`;
  };

  // Note: Currency props now handled by Smart Units system

  // Show loading state if no companyId yet (waiting for hydration) or data loading
  if (!companyId || companyId === '' || loading || (!isDirectMode && !regularData)) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-xl"></div>
            <div className="h-64 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!isDirectMode && (!regularData || regularData.length === 0)) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center py-12">
          <BanknotesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {locale?.startsWith('es') ? 'Sin Datos de Cash Flow' : 'No Cash Flow Data'}
          </h3>
          <p className="text-gray-600 mb-4">
            {locale?.startsWith('es') 
              ? 'Sube archivos de cash flow para ver el análisis'
              : 'Upload cash flow files to see analysis'}
          </p>
        </div>
      </div>
    );
  }

  // Render comprehensive dashboard for direct mode
  if (isDirectMode && directData) {
    const data = transformDirectDataToCashFlowData(directData, selectedPeriod);
    const current = data.currentPeriod;
    const previous = data.previousPeriod;
    const ytd = data.yearToDate;

    // Debug the actual values being rendered
    console.log('=== DASHBOARD RENDER DEBUG - UPDATED VERSION ===');
    console.log('Current Period Values:', {
      totalInflows: current.totalInflows,
      totalOutflows: current.totalOutflows,
      netCashFlow: current.netCashFlow,
      finalBalance: current.finalBalance,
      runwayMonths: current.runwayMonths
    });
    console.log('Formatted values:', {
      inflowsFormatted: formatValue(current.totalInflows),
      outflowsFormatted: formatValue(current.totalOutflows),
      netCashFlowFormatted: formatValue(current.netCashFlow),
      finalBalanceFormatted: formatValue(current.finalBalance)
    });
    console.log('TEST - New formatValue working:', formatValue(60201807));
    console.log('================================');

    return (
      <div className="space-y-8">
        {/* Global Controls - Exact copy from P&L */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 lg:gap-6">
            {/* Left side - Period and Comparison */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedPeriod || ''}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[120px]"
                >
                  {data.periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.month} {period.year}
                    </option>
                  ))}
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

              {/* Original Warren V2 Units Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 font-medium">{t('dashboard.pnl.units')}:</span>
                <select
                  value={displayUnits}
                  onChange={(e) => setDisplayUnits(e.target.value as 'normal' | 'K' | 'M')}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="normal">{t('dashboard.pnl.normal')}</option>
                  <option value="K">{t('dashboard.pnl.thousands')}</option>
                  <option value="M">{t('dashboard.pnl.millions')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Overview Section - Matching P&L Revenue Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Colored Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {locale?.startsWith('es') ? 'Resumen de Cash Flow' : 'Cash Flow Overview'} - {getCurrentPeriodDisplay()}
                  </h3>
                </div>
                <HelpIcon topic={helpTopics['dashboard.cashflow']} size="sm" />
              </div>
            </div>
            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 w-full metric-cards-container">
                <MetricCard
                  title={locale?.startsWith('es') ? 'Entradas Totales' : 'Total Inflows'}
                  currentValue={current.totalInflows}
                  previousValue={previous?.totalInflows}
                  ytdValue={ytd.totalInflows}
                  originalCurrency={originalCurrency}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  currency={selectedCurrency}
                  locale={locale}
                  icon={<ArrowUpIcon className="h-5 w-5" />}
                  colorScheme="revenue"
                  helpTopic={helpTopics['metrics.totalInflows']}
                  comparisonPeriod={comparisonPeriod}
                  previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Salidas Totales' : 'Total Outflows'}
                  currentValue={current.totalOutflows}
                  previousValue={previous?.totalOutflows}
                  ytdValue={ytd.totalOutflows}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<ArrowDownIcon className="h-5 w-5" />}
                  colorScheme="cost"
                  helpTopic={helpTopics['metrics.totalOutflows']}
                  comparisonPeriod={comparisonPeriod}
                  previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Flujo Neto' : 'Net Cash Flow'}
                  currentValue={current.netCashFlow}
                  previousValue={previous?.netCashFlow}
                  ytdValue={ytd.netCashFlow}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<CurrencyDollarIcon className="h-5 w-5" />}
                  colorScheme={current.netCashFlow >= 0 ? "profit" : "cost"}
                  helpTopic={helpTopics['metrics.netCashFlow']}
                  comparisonPeriod={comparisonPeriod}
                  previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Balance Final' : 'Final Balance'}
                  currentValue={current.finalBalance}
                  previousValue={previous?.finalBalance}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<BuildingLibraryIcon className="h-5 w-5" />}
                  colorScheme={current.finalBalance >= 0 ? "profit" : "cost"}
                  helpTopic={helpTopics['metrics.finalBalance']}
                  comparisonPeriod={comparisonPeriod}
                  previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Generación Mensual' : 'Monthly Generation'}
                  currentValue={current.monthlyGeneration || 0}
                  previousValue={previous?.monthlyGeneration}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<CircleStackIcon className="h-5 w-5" />}
                  subtitle={`${locale?.startsWith('es') ? 'Runway' : 'Runway'}: ${
                    (current.runwayMonths || 0) === Number.POSITIVE_INFINITY 
                      ? (locale?.startsWith('es') ? 'Generando efectivo' : 'Generating cash')
                      : (current.runwayMonths || 0) > 0 
                        ? `${(current.runwayMonths || 0).toFixed(1)} ${locale?.startsWith('es') ? 'meses' : 'months'}`
                        : '0.0 ' + (locale?.startsWith('es') ? 'meses' : 'months')
                  }`}
                  colorScheme="cost"
                  helpTopic={helpTopics['metrics.cashBurn']}
                  comparisonPeriod={comparisonPeriod}
                  previousPeriodLabel={previous ? `${previous.month} ${previous.year}` : undefined}
                />
              </div>
            </div>
          </div>
        </div>

        {/* YTD Section - Only show when not viewing YTD */}
        {viewMode !== 'ytd' && (
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
                    {locale?.startsWith('es') ? 'Resumen Anual Acumulado' : 'Year to Date Summary'}
                  </h3>
                </div>
                <HelpIcon topic={helpTopics['dashboard.ytd']} size="sm" />
              </div>
            </div>
            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <MetricCard
                  title={locale?.startsWith('es') ? 'Entradas YTD' : 'YTD Inflows'}
                  currentValue={ytd.totalInflows}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<ArrowUpIcon className="h-5 w-5" />}
                  subtitle={`${ytd.monthsIncluded} ${locale?.startsWith('es') ? 'meses' : 'months'}`}
                  colorScheme="revenue"
                  helpTopic={helpTopics['metrics.ytdInflows']}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Salidas YTD' : 'YTD Outflows'}
                  currentValue={ytd.totalOutflows}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<ArrowDownIcon className="h-5 w-5" />}
                  subtitle={`${ytd.monthsIncluded} ${locale?.startsWith('es') ? 'meses' : 'months'}`}
                  colorScheme="cost"
                  helpTopic={helpTopics['metrics.ytdOutflows']}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Flujo Neto YTD' : 'YTD Net Flow'}
                  currentValue={ytd.netCashFlow}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<CurrencyDollarIcon className="h-5 w-5" />}
                  subtitle={`${ytd.monthsIncluded} ${locale?.startsWith('es') ? 'meses' : 'months'}`}
                  colorScheme={ytd.netCashFlow >= 0 ? "profit" : "cost"}
                  helpTopic={helpTopics['metrics.ytdNetFlow']}
                />
                <MetricCard
                  title={locale?.startsWith('es') ? 'Generación Prom. Mensual' : 'Avg Monthly Generation'}
                  currentValue={ytd.averageMonthlyGeneration}
                  format="currency"
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  originalCurrency={originalCurrency}
                  currency={selectedCurrency}
                  icon={<ChartBarIcon className="h-5 w-5" />}
                  subtitle={`${locale?.startsWith('es') ? 'Promedio de' : 'Average of'} ${ytd.monthsIncluded} ${locale?.startsWith('es') ? 'meses' : 'months'}`}
                  colorScheme={ytd.averageMonthlyGeneration >= 0 ? "profit" : "cost"}
                  helpTopic={helpTopics['metrics.monthlyAverage']}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Phase 2: Advanced Analytics Widgets */}
        
        {/* Advanced Cash Flow Analysis Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <span>{locale?.startsWith('es') ? 'Análisis Avanzado' : 'Advanced Analysis'}</span>
            </h3>
            <button
              onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>{showAdvancedAnalysis ? (locale?.startsWith('es') ? 'Ocultar' : 'Hide') : (locale?.startsWith('es') ? 'Mostrar' : 'Show')}</span>
              {showAdvancedAnalysis ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
          
          {showAdvancedAnalysis && (
            <div className="space-y-8">
              {/* Row 1: Cash Flow Growth Analysis - Full Width */}
              <div className="w-full">
                <CashFlowGrowthAnalysis
                  chartData={data.periods}
                  currentMonth={current}
                  previousMonth={previous}
                  currency={selectedCurrency}
                  displayUnits={displayUnits}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                  locale={locale}
                  fullWidth={true}
                  periodMetadata={periodMetadata}
                  isPeriodActual={isPeriodActual}
                  periods={liveData?.data?.periods || []}
                />
              </div>
              
              {/* Row 2: Cash Flow Forecast Trends - Full Width */}
              <div className="w-full">
                <CashFlowForecastTrendsChartJS
                  historicalData={data.periods}
                  forecastData={[]}
                  currentTrendPercentage={previous ? ((current.netCashFlow - previous.netCashFlow) / Math.abs(previous.netCashFlow || 1)) * 100 : 0}
                  sixMonthForecast={0}
                  upperConfidence={0}
                  lowerConfidence={0}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                  locale={locale}
                  fullWidth={true}
                  periodMetadata={periodMetadata}
                  isPeriodActual={isPeriodActual}
                  periods={liveData?.data?.periods || []}
                />
              </div>
              
              {/* Row 3: Planificación de Escenarios | Análisis de Runway */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <CashFlowScenarioPlanning
                  historicalData={data.periods}
                  currentBalance={current.finalBalance || current.netCashFlow}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                  locale={locale}
                  fullWidth={false}
                />
                <CashFlowRunwayAnalysis
                  historicalData={data.periods}
                  currentBalance={current.finalBalance || current.netCashFlow}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                  locale={locale}
                  fullWidth={false}
                />
              </div>
              
              {/* Row 4: Composición Cash Flow | Mapa de Calor Cash Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <CashFlowComposition
                  data={directData ? {
                    periods: liveData.data.periods,
                    categories: liveData.data.data.categories as any
                  } : null}
                  formatValue={formatValue}
                  formatPercentage={formatPercentage}
                  locale={locale}
                  fullWidth={false}
                  selectedPeriod={(() => {
                    if (!selectedPeriod || !isDirectMode || !directData) return 7; // Default to Aug 2025
                    
                    // Find the selected period in our transformed data
                    const selectedPeriodData = data.periods.find(p => p.id === selectedPeriod);
                    if (!selectedPeriodData) return 7;
                    
                    // Map the month/year to the live data periods array
                    const targetPeriodLabel = `${selectedPeriodData.month} ${selectedPeriodData.year}`;
                    const liveDataIndex = liveData?.data?.periods?.findIndex((period: string) => 
                      period.includes(selectedPeriodData.month) && period.includes(selectedPeriodData.year.toString())
                    );
                    
                    return liveDataIndex !== -1 ? liveDataIndex : 7;
                  })()}
                />
                <CashFlowHeatmap
                  historicalData={data.periods}
                  formatValue={formatValue}
                  locale={locale}
                  fullWidth={false}
                  periodMetadata={periodMetadata}
                  isPeriodActual={isPeriodActual}
                  periods={liveData?.data?.periods || []}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Key Insights */}
        <KeyInsights
          data={{
            revenue: current.totalInflows,
            expenses: current.totalOutflows,
            netIncome: current.netCashFlow,
            grossMargin: current.totalInflows > 0 ? ((current.totalInflows - current.totalOutflows) / current.totalInflows) * 100 : 0,
            operatingMargin: current.totalInflows > 0 ? (current.netCashFlow / current.totalInflows) * 100 : 0,
            cashFlow: current.netCashFlow,
            previousMonth: previous ? {
              revenue: previous.totalInflows,
              expenses: previous.totalOutflows,
              netIncome: previous.netCashFlow
            } : undefined
          }}
          locale={locale}
        />

        {/* Data Source Information */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-green-600" />
            <div className="text-sm text-green-800">
              <strong>{locale?.startsWith('es') ? 'Fuente de datos:' : 'Data source:'}</strong> 
              {' '}{locale?.startsWith('es') ? 'Sistema integrado Vortex' : 'Vortex integrated system'} • 
              {' '}{directData.summary.totalPeriods} {locale?.startsWith('es') ? 'períodos disponibles' : 'periods available'} •
              {' '}{locale?.startsWith('es') ? 'Última actualización:' : 'Last updated:'} {new Date().toLocaleDateString(locale)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular mode dashboard (placeholder)
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {locale?.startsWith('es') ? 'Dashboard Cash Flow' : 'Cash Flow Dashboard'}
      </h2>
      <p className="text-gray-600">
        {locale?.startsWith('es') 
          ? `Datos de cash flow cargados: ${regularData?.length || 0} períodos`
          : `Cash flow data loaded: ${regularData?.length || 0} periods`}
      </p>
    </div>
  );
}

// Main wrapper component that handles data fetching and Smart Units integration
export function CashFlowDashboard({ 
  companyId, 
  currency = '$', 
  locale = 'es-MX',
  onPeriodChange 
}: CashFlowDashboardProps) {
  // State for live API data
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regularData, setRegularData] = useState<any>(null);

  // Fetch live API data
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchLiveData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching live Cash Flow data for company:', companyId);
        
        const response = await fetch(`/api/cashflow-live/${companyId}?limit=12`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'API returned failure');
        }

        console.log('✅ Live Cash Flow data fetched successfully:', result);
        setLiveData(result);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live Cash Flow data';
        console.error('❌ Error fetching live Cash Flow data:', err);
        setError(errorMessage);
        setLiveData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
  }, [companyId]);

  // Transform live data to the format expected by the dashboard
  const directData = liveData ? {
    periods: liveData.data.periods.map((period: string, index: number) => {
      // Generate proper dates - assuming monthly periods starting from Jan 2025
      const year = 2025;
      const month = index + 1; // 1-based month
      const periodStart = new Date(year, month - 1, 1); // month is 0-based in Date constructor
      const periodEnd = new Date(year, month, 0); // Last day of the month
      
      const totalInflows = liveData.data.data.dataRows?.totalInflows?.values[index] || 0;
      const totalOutflows = Math.abs(liveData.data.data.dataRows?.totalOutflows?.values[index] || 0);
      const calculatedNetCashFlow = totalInflows - totalOutflows;
      const monthlyGeneration = liveData.data.data.dataRows?.monthlyGeneration?.values[index] || 0;
      
      // Debug logging for the issue
      if (index === 7) { // August 2025
        console.log('🐛 LIVE DATA DEBUG - August 2025 (index 7):', {
          totalInflows,
          totalOutflows,
          calculatedNetCashFlow,
          monthlyGeneration,
          rawInflows: liveData.data.data.dataRows?.totalInflows?.values[index],
          rawOutflows: liveData.data.data.dataRows?.totalOutflows?.values[index],
          netCashFlowFromAPI: liveData.data.data.dataRows?.netCashFlow?.values[index],
          finalBalance: liveData.data.data.dataRows?.finalBalance?.values[index],
          initialBalance: liveData.data.data.dataRows?.initialBalance?.values[index]
        });
      }

      return {
        id: `period-${index}`,
        companyId: companyId || '',
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        periodType: 'monthly' as const,
        lineItems: [], // Empty array to prevent filter errors
        totalInflows,
        totalOutflows,
        netCashFlow: calculatedNetCashFlow,
        currency: liveData.data.metadata.currency,
        initialBalance: liveData.data.data.dataRows?.initialBalance?.values[index] || 0,
        finalBalance: liveData.data.data.dataRows?.finalBalance?.values[index] || 0,
        lowestBalance: liveData.data.data.dataRows?.finalBalance?.values[index] || 0, // Use finalBalance as fallback
        monthlyGeneration
      };
    }),
    summary: {
      totalPeriods: liveData.data.periods.length,
      currency: liveData.data.metadata.currency,
      periodRange: `${liveData.data.periods[0]} - ${liveData.data.periods[liveData.data.periods.length - 1]}`,
      lastUpdated: new Date().toISOString()
    },
    // Add the nested data structure for CashFlowComposition
    data: {
      data: {
        categories: liveData.data.data.categories
      }
    }
  } : null;

  const isDirectMode = !!liveData;

  // Handle processed data loading
  useEffect(() => {
    if (isDirectMode && companyId && companyId !== '') {
      const loadRegularData = async () => {
        try {
          const response = await fetch(`/api/processed-data/cashflow/${companyId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // The new API returns transformed dashboard data directly
              console.log('🔍 Cash Flow Dashboard: Received data from API:', data);
              console.log('📊 Cash Flow Dashboard: Setting regularData to:', data.data);
              setRegularData(data.data);
            } else {
              setRegularData([]);
            }
          } else {
            setRegularData([]);
          }
        } catch (err) {
          console.error('Error loading regular cash flow data:', err);
          setRegularData([]);
        }
      };

      loadRegularData();
    }
  }, [isDirectMode, companyId]);

  // Return original Warren V2 Cash Flow Dashboard layout (NO Smart components)
  return (
    <CashFlowDashboardContent
      companyId={companyId}
      currency={liveData?.data?.metadata?.currency || currency}
      locale={locale}
      onPeriodChange={onPeriodChange}
      liveData={liveData}
      directData={directData}
      isDirectMode={isDirectMode}
      regularData={regularData}
      loading={loading}
      error={error}
    />
  );
}