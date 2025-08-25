"use client";

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import '@/lib/utils/chartSetup'; // Register Chart.js components

interface DataPoint {
  x: number;
  y: number;
  month: string;
  isActual: boolean;
}

interface CashFlowForecastTrendsProps {
  historicalData: any[];
  forecastData: any[];
  currentTrendPercentage: number;
  sixMonthForecast: number;
  upperConfidence: number;
  lowerConfidence: number;
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
  // New props for period metadata
  periodMetadata?: { [periodLabel: string]: { isActual: boolean; isProjected: boolean } };
  isPeriodActual?: (periodLabel: string) => boolean;
  periods?: string[];
}

export function CashFlowForecastTrendsChartJS({  
  historicalData,
  forecastData,
  currentTrendPercentage,
  sixMonthForecast,
  upperConfidence,
  lowerConfidence,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false,
  periodMetadata,
  isPeriodActual,
  periods = []
}: CashFlowForecastTrendsProps) {
  
  const { chartData, forecastStats } = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { chartData: null, forecastStats: null };
    }

    // Use only first 12 months (Jan-Dec 2025) and determine actual vs forecast split
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data2025 = historicalData.slice(0, 12); // Only 2025 data
    
    // Calculate actual period count dynamically
    let actualPeriodCount = 8; // Fallback
    if (isPeriodActual && periods && periods.length > 0) {
      actualPeriodCount = 0;
      for (let i = 0; i < Math.min(periods.length, 12); i++) {
        if (isPeriodActual(periods[i])) {
          actualPeriodCount++;
        } else {
          break; // Stop counting when we hit first non-actual period
        }
      }
      actualPeriodCount = Math.max(actualPeriodCount, 1); // Ensure at least 1 actual period
    }
    
    const lastActualIndex = actualPeriodCount - 1;
    const forecastPeriodCount = 12 - actualPeriodCount;
    
    // Process all data points using period metadata to determine actual vs forecast
    const allPoints = data2025.map((item: any, index: number) => {
      // Use period metadata to determine if this period is actual
      const periodLabel = periods[index];
      const isActual = isPeriodActual && periodLabel ? isPeriodActual(periodLabel) : index <= 7; // Fallback to old logic
      
      return {
        x: index,
        y: item.finalBalance || 0, // Use Final Balance (Row 105) instead of netCashFlow
        month: monthNames[index],
        isActual
      };
    });

    // Separate actual and forecast points for different styling
    const actualData = allPoints.filter(point => point.isActual);
    const forecastPoints = allPoints.filter(point => !point.isActual);
    
    // Calculate linear regression for trend line using ALL data (actual + forecast)
    const { slope, intercept } = calculateLinearRegression(allPoints);
    
    // Calculate confidence bands using standard error
    const standardError = calculateStandardError(actualData, slope, intercept);
    const confidenceMultiplier = 1.96; // 95% confidence interval
    
    const upperBand = allPoints.map(point => 
      point.y + (standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - actualData.length/2, 2) / actualData.length))
    );
    const lowerBand = allPoints.map(point => 
      point.y - (standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - actualData.length/2, 2) / actualData.length))
    );

    // Prepare data for 2025 only (12 months)
    const inflowData = data2025.map((item: any) => item.totalInflows || 0);
    const outflowData = data2025.map((item: any) => -(item.totalOutflows || 0)); // Negative for visualization
    const netFlowData = [...actualData.map(d => d.y), ...forecastPoints.map(d => d.y)];

    const chartJSData = {
      labels: monthNames, // All 12 months of 2025
      datasets: [
        // Final Balance - Actual (solid line for actual periods)
        {
          label: locale?.startsWith('es') ? 'Balance Final Real' : 'Actual Final Balance',
          data: netFlowData.map((value, index) => index < actualPeriodCount ? value : null), // Only actual data
          borderColor: '#10B981',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          tension: 0.2,
          spanGaps: false
        },
        // Final Balance - Forecast (dashed line for forecast periods)
        {
          label: locale?.startsWith('es') ? 'Pronóstico Balance Final' : 'Final Balance Forecast',
          data: netFlowData.map((value, index) => index >= lastActualIndex ? value : null), // Forecast + bridge from last actual
          borderColor: '#3B82F6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 3,
          pointBackgroundColor: '#3B82F6',
          tension: 0.2,
          spanGaps: false
        },
        // Inflows (area chart)
        {
          label: locale?.startsWith('es') ? 'Entradas Totales' : 'Total Inflows',
          data: inflowData,
          borderColor: '#34D399',
          backgroundColor: inflowData.map((_, index) => index < actualPeriodCount ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.1)'),
          borderWidth: 1,
          pointRadius: 2,
          fill: 'origin',
          tension: 0.1
        },
        // Outflows (area chart - negative)
        {
          label: locale?.startsWith('es') ? 'Salidas Totales' : 'Total Outflows',
          data: outflowData,
          borderColor: '#EF4444',
          backgroundColor: outflowData.map((_, index) => index < actualPeriodCount ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
          borderWidth: 1,
          pointRadius: 2,
          fill: 'origin',
          tension: 0.1
        },
        // Trend line - extends through all 12 months
        {
          label: locale?.startsWith('es') ? 'Línea de Tendencia' : 'Trend Line',
          data: Array.from({ length: 12 }, (_, index) => slope * index + intercept), // All 12 months
          borderColor: '#6B7280',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    };

    // Calculate forecast statistics for 2025 only
    const lastActualValue = actualData[actualData.length - 1]?.y || 0;
    const lastForecastValue = forecastPoints[forecastPoints.length - 1]?.y || 0;
    
    // Calculate month-over-month change using last actual period - DYNAMIC CALCULATION
    const currentMonthValue = actualData[lastActualIndex]?.y || 0; // Last actual period
    const previousMonthValue = lastActualIndex > 0 ? actualData[lastActualIndex - 1]?.y || 0 : 0; // Previous actual period
    
    // Debug logging to verify Final Balance data
    console.log('CashFlowForecastTrends - Final Balance Analysis:', {
      actualPeriodCount,
      lastActualIndex,
      currentMonth: actualData[lastActualIndex]?.month || 'N/A',
      previousMonth: lastActualIndex > 0 ? actualData[lastActualIndex - 1]?.month || 'N/A' : 'N/A',
      currentMonthFinalBalance: currentMonthValue,
      previousMonthFinalBalance: previousMonthValue,
      decemberFinalBalance: data2025[11]?.finalBalance || 'missing',
      allActualBalances: actualData.map(d => ({ month: d.month, finalBalance: d.y })),
      allForecastBalances: forecastPoints.map(d => ({ month: d.month, finalBalance: d.y }))
    });
    
    let monthOverMonth = 0;
    let showAsPercentage = true;
    
    if (previousMonthValue !== 0) {
      const change = currentMonthValue - previousMonthValue;
      // For extreme swings, show absolute improvement in millions
      if ((previousMonthValue < 0 && currentMonthValue > 0) || Math.abs(change / Math.abs(previousMonthValue)) > 3) {
        monthOverMonth = change / 1000000; // Show in millions
        showAsPercentage = false;
      } else {
        // Normal percentage calculation
        monthOverMonth = (change / Math.abs(previousMonthValue)) * 100;
        // Cap at reasonable bounds
        monthOverMonth = Math.max(-300, Math.min(300, monthOverMonth));
        showAsPercentage = true;
      }
    }
    
    const avgGrowthRate = lastActualValue !== 0
      ? ((lastForecastValue - lastActualValue) / Math.abs(lastActualValue) * 100)
      : 0;

    // Calculate average burn rate from negative periods only (actual months)
    const negativePeriods = actualData.filter(d => d.y < 0);
    const avgBurnRate = negativePeriods.length > 0 
      ? negativePeriods.reduce((sum, d) => sum + Math.abs(d.y), 0) / negativePeriods.length
      : 0;
    
    console.log('CashFlowForecastTrends - Burn Rate Calculation:', {
      negativePeriods: negativePeriods.map(p => ({ month: p.month, value: p.y })),
      avgBurnRate,
      decemberForecast: lastForecastValue
    });

    // Calculate runway based on FINAL BALANCE trend, not monthly generation
    const lastActualFinalBalance = data2025[lastActualIndex]?.finalBalance || 0; // Last actual period final balance
    const decemberFinalBalance = data2025[11]?.finalBalance || 0; // December final balance
    const finalBalanceTrend = decemberFinalBalance - lastActualFinalBalance; // Balance growth from last actual→Dec
    
    let projectedRunway = 0;
    let runwayLabel = '';
    
    console.log('Runway Analysis - Final Balance Trend:', {
      lastActualFinalBalance,
      decemberFinalBalance,
      balanceGrowth: finalBalanceTrend,
      isGrowing: finalBalanceTrend > 0
    });
    
    if (lastActualFinalBalance > 0 && finalBalanceTrend > 0) {
      // Final balance is positive AND growing - no runway concern
      projectedRunway = -1; // Signal for "no concern"
      runwayLabel = locale?.startsWith('es') ? 'Balance creciente' : 'Growing balance';
    } else if (lastActualFinalBalance > 0 && finalBalanceTrend < 0 && decemberFinalBalance > 0) {
      // Balance decreasing but still positive in December
      projectedRunway = -2; // Signal for "declining but safe"
      runwayLabel = locale?.startsWith('es') ? 'Declining pero positivo' : 'Declining but positive';
    } else if (lastActualFinalBalance > 0 && decemberFinalBalance <= 0) {
      // Will run out of money before December
      projectedRunway = 4;
      runwayLabel = locale?.startsWith('es') ? 'riesgo en 4 meses' : 'risk in 4 months';
    } else {
      projectedRunway = 0;
      runwayLabel = locale?.startsWith('es') ? 'situación compleja' : 'complex situation';
    }

    const stats = {
      avgGrowthRate,
      sixMonthValue: lastForecastValue, // December 2025 forecast
      confidenceRange: upperBand[upperBand.length - 1] - lowerBand[lowerBand.length - 1],
      avgBurnRate,
      projectedRunway,
      runwayLabel,
      monthOverMonth,
      showAsPercentage,
      currentMonthValue,
      previousMonthValue,
      // Add variables needed for UI
      actualPeriodCount,
      forecastPeriodCount,
      lastActualIndex,
      actualData,
      currentMonthName: actualData[lastActualIndex]?.month || '',
      previousMonthName: lastActualIndex > 0 ? actualData[lastActualIndex - 1]?.month || '' : ''
    };

    return { chartData: chartJSData, forecastStats: stats };
  }, [historicalData, locale]);

  if (!chartData) {
    return <div>{locale?.startsWith('es') ? 'Cargando...' : 'Loading...'}</div>;
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatValue(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: '#F3F4F6',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: false, // Allow negative values
        ticks: {
          callback: (value) => formatValue(value as number),
          font: {
            size: 11
          },
          stepSize: undefined, // Let Chart.js auto-calculate for more granularity
          maxTicksLimit: 15 // More tick marks for finer granularity
        },
        grid: {
          display: true,
          color: (context) => {
            return context.tick.value === 0 ? '#374151' : '#E5E7EB';
          },
          lineWidth: (context) => {
            return context.tick.value === 0 ? 2 : 1;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {locale?.startsWith('es') ? 'Tendencias de Balance Final y Pronóstico' : 'Final Balance Trends & Forecast'}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${
              (forecastStats?.monthOverMonth || 0) >= 0 ? 'text-white' : 'text-red-200'
            }`}>
              {(forecastStats?.monthOverMonth || 0) >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <div className="flex flex-col items-end">
                <span className="font-bold text-sm">
                  {forecastStats?.showAsPercentage 
                    ? formatPercentage(forecastStats.monthOverMonth || 0)
                    : `${(forecastStats?.monthOverMonth || 0) >= 0 ? '+' : ''}${(forecastStats?.monthOverMonth || 0).toFixed(1)}M`
                  }
                </span>
                <span className="text-xs text-white/80">
                  {forecastStats?.lastActualIndex > 0 && forecastStats?.previousMonthValue !== 0 
                    ? `${locale?.startsWith('es') ? 'vs' : 'vs'} ${forecastStats?.previousMonthName} 2025`
                    : (locale?.startsWith('es') ? 'Sin comparación' : 'No comparison')
                  }
                </span>
              </div>
            </div>
            <HelpIcon 
              topic={helpTopics['dashboard.cashflow']} 
              size="sm" 
              className="text-white hover:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Chart */}
        <div className="h-[500px] flex-shrink-0">
          <Line data={chartData} options={options} />
        </div>
        
        {/* Forecast Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
          <div className="bg-cyan-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') 
                ? `Cambio ${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName}` 
                : `${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName} Change`}
            </p>
            <p className="text-lg font-semibold text-cyan-900">
              {(forecastStats?.monthOverMonth || 0) > 0 ? '↗' : (forecastStats?.monthOverMonth || 0) < 0 ? '↘' : '→'} {
                forecastStats?.showAsPercentage 
                  ? formatPercentage(Math.abs(forecastStats?.monthOverMonth || 0))
                  : `${Math.abs(forecastStats?.monthOverMonth || 0).toFixed(1)}M`
              }
            </p>
            <p className="text-xs text-gray-500">
              {locale?.startsWith('es') 
                ? `${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName} 2025`
                : `${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName} 2025`}
            </p>
          </div>
          
          <div className={`rounded-lg p-4 ${
            (forecastStats?.sixMonthValue || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Pronóstico Dic 2025' : 'Dec 2025 Forecast'}
            </p>
            <p className={`text-lg font-semibold ${
              (forecastStats?.sixMonthValue || 0) >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatValue(forecastStats?.sixMonthValue || 0)}
            </p>
            <p className="text-xs text-gray-500">
              {locale?.startsWith('es') ? 'flujo neto' : 'net flow'}
            </p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Saldo Final' : 'Final Balance'}
            </p>
            <p className={`text-lg font-semibold ${
              (forecastStats?.currentMonthValue || 0) >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatValue(forecastStats?.currentMonthValue || 0)}
            </p>
            <p className="text-xs text-gray-500">
              {locale?.startsWith('es') 
                ? `${forecastStats?.currentMonthName} 2025`
                : `${forecastStats?.currentMonthName} 2025`}
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Análisis Futuro' : 'Future Analysis'}
            </p>
            <p className={`text-lg font-semibold ${
              (forecastStats?.projectedRunway || 0) === -1 ? 'text-green-900' : 
              (forecastStats?.projectedRunway || 0) === -2 ? 'text-blue-900' :
              (forecastStats?.projectedRunway || 0) > 0 ? 'text-red-900' : 'text-orange-900'
            }`}>
              {(forecastStats?.projectedRunway || 0) === -1 
                ? '✓ ↗' 
                : (forecastStats?.projectedRunway || 0) === -2
                  ? '⚠ ↘'
                : (forecastStats?.projectedRunway || 0) === 0 
                  ? '?' 
                  : `⚠ ${forecastStats?.projectedRunway}`
              }
            </p>
            <p className="text-xs text-gray-500">
              {forecastStats?.runwayLabel || (locale?.startsWith('es') ? 'calculando...' : 'calculating...')}
            </p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">
            {locale?.startsWith('es') ? 'Insights Clave del Pronóstico' : 'Key Forecast Insights'}
          </h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>
              • {locale?.startsWith('es') 
                ? `${forecastStats?.actualPeriodCount} meses reales + ${forecastStats?.forecastPeriodCount} meses pronóstico`
                : `${forecastStats?.actualPeriodCount} actual months + ${forecastStats?.forecastPeriodCount} months forecast`
              }
            </li>
            <li>
              • {locale?.startsWith('es')
                ? `Proyección diciembre 2025: flujo ${(forecastStats?.sixMonthValue || 0) >= 0 ? 'positivo' : 'negativo'}`
                : `December 2025 projection: ${(forecastStats?.sixMonthValue || 0) >= 0 ? 'positive' : 'negative'} cash flow`
              }
            </li>
            <li>
              • {locale?.startsWith('es') 
                ? `Cambio ${(forecastStats?.monthOverMonth || 0) >= 0 ? 'positivo' : 'negativo'} ${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName} 2025: ${
                    forecastStats?.showAsPercentage 
                      ? `${Math.abs(forecastStats.monthOverMonth || 0).toFixed(1)}%`
                      : `${Math.abs(forecastStats?.monthOverMonth || 0).toFixed(1)}M ARS`
                  }`
                : `${(forecastStats?.monthOverMonth || 0) >= 0 ? 'Positive' : 'Negative'} change ${forecastStats?.currentMonthName} vs ${forecastStats?.previousMonthName} 2025: ${
                    forecastStats?.showAsPercentage 
                      ? `${Math.abs(forecastStats.monthOverMonth || 0).toFixed(1)}%`
                      : `${Math.abs(forecastStats?.monthOverMonth || 0).toFixed(1)}M ARS`
                  }`
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Linear regression calculation
function calculateLinearRegression(data: DataPoint[]): { slope: number; intercept: number } {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  data.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  });

  const denominator = (n * sumX2 - sumX * sumX);
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0;

  return { slope, intercept };
}

// Calculate standard error for confidence bands
function calculateStandardError(data: DataPoint[], slope: number, intercept: number): number {
  const n = data.length;
  let sumSquaredErrors = 0;

  data.forEach(point => {
    const predicted = slope * point.x + intercept;
    const error = point.y - predicted;
    sumSquaredErrors += error * error;
  });

  return n > 2 ? Math.sqrt(sumSquaredErrors / (n - 2)) : 0;
}