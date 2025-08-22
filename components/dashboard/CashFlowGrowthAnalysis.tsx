"use client";

import React, { useMemo } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { HelpIcon } from '@/components/HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { useTranslation } from '@/lib/translations';
import { Chart as ChartComponent } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

interface CashFlowGrowthProps {
  chartData: any[];
  currentMonth: any;
  previousMonth: any;
  currency: string;
  displayUnits: 'normal' | 'K' | 'M' | 'B';
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
  // New props for period metadata
  periodMetadata?: { [periodLabel: string]: { isActual: boolean; isProjected: boolean } };
  isPeriodActual?: (periodLabel: string) => boolean;
  periods?: string[];
}

export function CashFlowGrowthAnalysis({ 
  chartData, 
  currentMonth, 
  previousMonth, 
  currency,
  displayUnits,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false,
  periodMetadata,
  isPeriodActual,
  periods = []
}: CashFlowGrowthProps) {
  const { t } = useTranslation(locale);
  
  // Defensive check for required functions
  if (!formatPercentage || !formatValue || !currentMonth) {
    return <div>{locale?.startsWith('es') ? 'Cargando...' : 'Loading...'}</div>;
  }

  // Calculate actual vs forecast period counts dynamically
  const actualPeriodCount = useMemo(() => {
    if (!isPeriodActual || !periods || periods.length === 0) {
      return 8; // Fallback to hardcoded value
    }
    
    let count = 0;
    for (let i = 0; i < Math.min(periods.length, 12); i++) {
      if (isPeriodActual(periods[i])) {
        count++;
      } else {
        break; // Stop counting when we hit first non-actual period
      }
    }
    
    return Math.max(count, 1); // Ensure at least 1 actual period
  }, [isPeriodActual, periods]);
  
  const forecastPeriodCount = Math.max(12 - actualPeriodCount, 0);
  
  // Find the last actual period index for percentage calculations
  const lastActualIndex = useMemo(() => {
    if (!isPeriodActual || !periods || periods.length === 0) {
      return 7; // Fallback to August (index 7)
    }
    
    return Math.max(actualPeriodCount - 1, 0);
  }, [actualPeriodCount, isPeriodActual, periods]);

  // Generate 2025 data (Jan-Dec) using actual CSV data - SEPARATE BARS NOT STACKED
  const chartDataConfig = useMemo(() => {
    // Month names in Spanish/English
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Extract data for 12 months
    const labels = monthNames;
    const incomeData: number[] = [];
    const expenseData: number[] = [];
    const finalBalanceData: number[] = [];
    
    // Process first 12 months of chartData (Jan-Dec 2025)
    for (let i = 0; i < 12; i++) {
      const actualData = chartData[i]; // Direct access to CSV data
      // Use period metadata to determine if this period is actual
      const periodLabel = periods[i];
      const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : i <= 7; // Fallback to old logic if no metadata
      
      const inflows = actualData?.totalInflows || 0;
      const outflows = actualData?.totalOutflows || 0;
      const finalBalance = actualData?.finalBalance || 0;
      
      incomeData.push(inflows);
      expenseData.push(outflows);
      finalBalanceData.push(finalBalance);
    }
    
    return {
      labels,
      datasets: [
        // Income bars (lighter green - solid for actual, transparent for forecast)
        {
          label: locale?.startsWith('es') ? 'Ingresos' : 'Income',
          data: incomeData,
          backgroundColor: incomeData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? '#6EE7B7' : 'rgba(110, 231, 183, 0.4)';  // Light green
          }),
          borderColor: incomeData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? '#34D399' : '#6EE7B7';  // Medium green borders
          }),
          borderWidth: incomeData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? 1 : 2;
          }),
          barPercentage: 0.8,        // Wide bars
          categoryPercentage: 0.9,   // Tight spacing
          order: 2                   // Render bars behind line
        },
        // Expense bars (orange/red - solid for actual, transparent for forecast) 
        {
          label: locale?.startsWith('es') ? 'Gastos' : 'Expenses',
          data: expenseData,
          backgroundColor: expenseData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? '#F97316' : 'rgba(249, 115, 22, 0.4)';
          }),
          borderColor: expenseData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? '#EA580C' : '#F97316';
          }),
          borderWidth: expenseData.map((_, index) => {
            const periodLabel = periods[index];
            const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7;
            return isActual ? 1 : 2;
          }),
          barPercentage: 0.8,        
          categoryPercentage: 0.9,
          order: 2                   // Render bars behind line
        },
        // Final Balance line (dotted green line like warren-lightsail reference) - RENDER ON TOP
        {
          label: locale?.startsWith('es') ? 'Balance Final' : 'Final Balance',
          type: 'line' as const,
          data: finalBalanceData,
          borderColor: '#22C55E',
          backgroundColor: 'transparent',
          borderWidth: 4,              // Slightly thicker for visibility
          borderDash: [8, 4],
          pointBackgroundColor: '#22C55E',
          pointBorderColor: '#16A34A',
          pointBorderWidth: 2,
          pointRadius: 5,              // Slightly larger points
          pointHoverRadius: 7,
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',              // Use secondary Y-axis for final balance
          order: 1                    // CRITICAL: Render line on top of bars
        }
      ]
    };
  }, [chartData, locale]);

  // Calculate accurate cash flow growth from actual data using last actual period
  const currentMonthData = chartData[lastActualIndex];
  const previousMonthData = lastActualIndex > 0 ? chartData[lastActualIndex - 1] : null;
  
  // Calculate meaningful cash flow improvement (show absolute improvement instead of percentage)
  let cashFlowGrowth = 0;
  let showAsPercentage = true;
  
  if (currentMonthData && previousMonthData) {
    const currentFlow = currentMonthData.netCashFlow || 0;
    const previousFlow = previousMonthData.netCashFlow || 0;
    const improvement = currentFlow - previousFlow;
    
    // Debug log to verify values
    console.log('Cash Flow Analysis (Dynamic):', {
      lastActualIndex,
      currentMonthData,
      previousMonthData,
      currentNetFlow: currentFlow,
      previousNetFlow: previousFlow,
      improvement: improvement
    });
    
    // For negative-to-positive or large swings, show improvement in millions
    if ((previousFlow < 0 && currentFlow > 0) || Math.abs(improvement / Math.abs(previousFlow || 1)) > 3) {
      cashFlowGrowth = improvement / 1000000; // Show in millions
      showAsPercentage = false;
    } else if (previousFlow !== 0) {
      // Normal percentage calculation for reasonable changes
      cashFlowGrowth = (improvement / Math.abs(previousFlow)) * 100;
      // Cap at reasonable bounds
      cashFlowGrowth = Math.max(-300, Math.min(300, cashFlowGrowth));
      showAsPercentage = true;
    }
  }

  // YTD calculations using actual period count - matches Resumen Anual Acumulado
  const ytdNetFlow = chartData.slice(0, actualPeriodCount).reduce((sum, d) => sum + (d.netCashFlow || 0), 0);
  const ytdInflows = chartData.slice(0, actualPeriodCount).reduce((sum, d) => sum + (d.totalInflows || 0), 0);
  const ytdOutflows = chartData.slice(0, actualPeriodCount).reduce((sum, d) => sum + (d.totalOutflows || 0), 0);

  // Chart.js options - Mixed chart with bars and line for final balance
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: false,        // CRITICAL: No stacking
        grid: {
          display: false
        },
        ticks: {
          font: { size: 11 },
          maxRotation: 0,      // Keep labels horizontal
          minRotation: 0
        }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        stacked: false,        // CRITICAL: No stacking
        beginAtZero: true,     // Start from zero like reference
        ticks: {
          callback: (value: any) => {
            const numValue = Number(value);
            if (Math.abs(numValue) >= 1000000000) {
              return `${(numValue / 1000000000).toFixed(0)}B`;
            } else if (Math.abs(numValue) >= 1000000) {
              return `${(numValue / 1000000).toFixed(0)}M`;
            } else if (Math.abs(numValue) >= 1000) {
              return `${(numValue / 1000).toFixed(0)}K`;
            }
            return `${numValue.toFixed(0)}`;
          },
          font: { size: 10 }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        beginAtZero: false,
        ticks: {
          callback: (value: any) => {
            const numValue = Number(value);
            if (Math.abs(numValue) >= 1000000000) {
              return `${(numValue / 1000000000).toFixed(0)}B`;
            } else if (Math.abs(numValue) >= 1000000) {
              return `${(numValue / 1000000).toFixed(0)}M`;
            } else if (Math.abs(numValue) >= 1000) {
              return `${(numValue / 1000).toFixed(0)}K`;
            }
            return `${numValue.toFixed(0)}`;
          },
          font: { size: 10 },
          color: '#22C55E'  // Green color for final balance axis
        },
        grid: {
          display: false  // Don't show grid for secondary axis
        }
      }
    },
    plugins: {
      legend: {
        display: false        // Hide legend to match reference
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = formatValue(context.parsed.y);
            return `${label}: ${value}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }), [formatValue]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {locale?.startsWith('es') ? 'Análisis de Crecimiento del Cash Flow' : 'Cash Flow Growth Analysis'}
              </h3>
              <p className="text-sm text-white/80">
                {locale?.startsWith('es') 
                  ? `2025: ${actualPeriodCount} reales + ${forecastPeriodCount} pronóstico` 
                  : `2025: ${actualPeriodCount} actual + ${forecastPeriodCount} forecast`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${
              cashFlowGrowth >= 0 ? 'text-white' : 'text-red-200'
            }`}>
              {cashFlowGrowth >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <div className="flex flex-col items-end">
                <span className="font-bold text-lg">
                  {showAsPercentage ? formatPercentage(cashFlowGrowth) : `+${cashFlowGrowth.toFixed(1)}M`}
                </span>
                <span className="text-xs text-white/80 font-medium">
                  {previousMonthData && lastActualIndex > 0 ? 
                    `${locale?.startsWith('es') ? 'vs' : 'vs'} ${chartData[lastActualIndex - 1]?.month || ''} ${chartData[lastActualIndex - 1]?.year || ''}` : 
                    (locale?.startsWith('es') ? 'Sin comparación' : 'No comparison')
                  }
                </span>
              </div>
            </div>
            <HelpIcon topic={helpTopics['dashboard.cashflow']} size="sm" className="text-white hover:text-gray-200" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">

        {/* Chart */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {locale?.startsWith('es') ? 'Tendencias de Cash Flow (2025)' : 'Cash Flow Trends (2025)'}
            </h4>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
                <span className="text-gray-600">{locale?.startsWith('es') ? 'Ingresos' : 'Income'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-gray-600">{locale?.startsWith('es') ? 'Gastos' : 'Expenses'}</span>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <div className="w-4 h-0 border-t-2 border-green-500 border-dashed"></div>
                <span className="text-gray-600">{locale?.startsWith('es') ? 'Balance Final' : 'Final Balance'}</span>
              </div>
              <div className="flex items-center space-x-4 ml-4">
                <div className="flex items-center space-x-1">
                  <div className="flex items-center space-x-0.5">
                    <div className="w-2 h-3 bg-green-400 rounded-sm"></div>
                    <div className="w-2 h-3 bg-orange-500 rounded-sm"></div>
                  </div>
                  <span className="text-gray-600 text-xs">{locale?.startsWith('es') ? 'Datos Reales' : 'Actual Data'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="flex items-center space-x-0.5">
                    <div className="w-2 h-3 bg-green-200 rounded-sm opacity-60"></div>
                    <div className="w-2 h-3 bg-orange-300 rounded-sm opacity-60"></div>
                  </div>
                  <span className="text-gray-600 text-xs">{locale?.startsWith('es') ? 'Pronóstico' : 'Forecast'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className={fullWidth ? "h-[500px]" : "h-[450px]"}>
            <ChartComponent type="bar" data={chartDataConfig} options={chartOptions} />
          </div>
        </div>

        {/* Analysis Summary */}
        <div className={`grid gap-4 ${fullWidth ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">
              {locale?.startsWith('es') ? 'Fortalezas' : 'Strengths'}
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {cashFlowGrowth >= 0 
                ? (locale?.startsWith('es') ? 'Crecimiento positivo del flujo' : 'Positive flow growth')
                : (locale?.startsWith('es') ? 'Tendencia estable identificada' : 'Stable trend identified')
              }</li>
              <li>• {locale?.startsWith('es') 
                ? `Balance final: ${formatValue(currentMonth.finalBalance)}`
                : `Final balance: ${formatValue(currentMonth.finalBalance)}`
              }</li>
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">
              {locale?.startsWith('es') ? 'Proyección' : 'Forecast'}
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {locale?.startsWith('es') 
                ? `${forecastPeriodCount} meses de pronóstico`
                : `${forecastPeriodCount} months forecast`
              }</li>
              <li>• {locale?.startsWith('es') 
                ? `${actualPeriodCount} meses reales`
                : `${actualPeriodCount} actual months`
              }</li>
            </ul>
          </div>
          
          {fullWidth && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">
                {locale?.startsWith('es') ? 'Recomendaciones' : 'Recommendations'}
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• {locale?.startsWith('es') 
                  ? 'Monitorear tendencias mensuales'
                  : 'Monitor monthly trends'
                }</li>
                <li>• {locale?.startsWith('es') 
                  ? 'Revisar pronósticos regularmente'
                  : 'Review forecasts regularly'
                }</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}