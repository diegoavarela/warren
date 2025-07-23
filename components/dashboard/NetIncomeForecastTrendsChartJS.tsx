"use client";

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import '@/lib/utils/chartSetup'; // Register Chart.js components

interface DataPoint {
  x: number;
  y: number;
  month: string;
  isActual: boolean;
}

interface NetIncomeForecastTrendsProps {
  historicalData: any[];
  forecastData: any[];
  currentTrendPercentage: number;
  sixMonthForecast: number;
  upperConfidence: number;
  lowerConfidence: number;
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
}

export function NetIncomeForecastTrendsChartJS({ 
  historicalData,
  forecastData,
  currentTrendPercentage,
  sixMonthForecast,
  upperConfidence,
  lowerConfidence,
  formatValue,
  formatPercentage,
  locale = 'es-MX'
}: NetIncomeForecastTrendsProps) {
  
  const { chartData, forecastStats } = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { chartData: null, forecastStats: null };
    }

    // Extract actual data points
    const actualData = historicalData.map((item: any, index: number) => ({
      x: index,
      y: item.netIncome || 0,
      month: item.month,
      isActual: true
    }));

    // Calculate linear regression
    const { slope, intercept } = calculateLinearRegression(actualData);

    // Generate forecast months
    const lastIndex = actualData.length - 1;
    const forecastMonths = 6;
    const forecastPoints = [];

    for (let i = 1; i <= forecastMonths; i++) {
      const x = lastIndex + i;
      const y = slope * x + intercept;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = actualData[lastIndex].month;
      const currentMonthIndex = monthNames.findIndex(m => currentMonth.includes(m.substring(0, 3)));
      const forecastMonthIndex = (currentMonthIndex + i) % 12;
      
      forecastPoints.push({
        x,
        y: Math.max(0, y),
        month: monthNames[forecastMonthIndex],
        isActual: false
      });
    }

    // Calculate confidence bands
    const standardError = calculateStandardError(actualData, slope, intercept);
    const confidenceMultiplier = 1.96; // 95% confidence interval

    const allPoints = [...actualData, ...forecastPoints];
    const upperBand = allPoints.map(point => 
      point.y + (standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - lastIndex/2, 2) / actualData.length))
    );
    const lowerBand = allPoints.map(point => 
      Math.max(0, point.y - (standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - lastIndex/2, 2) / actualData.length)))
    );

    const chartJSData = {
      labels: [...actualData.map(d => d.month), ...forecastPoints.map(d => d.month)],
      datasets: [
        {
          label: 'Utilidad Neta Real',
          data: [...actualData.map(d => d.y), ...Array(forecastMonths).fill(null)],
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          tension: 0.1
        },
        {
          label: 'Pronóstico',
          data: [...Array(actualData.length - 1).fill(null), actualData[actualData.length - 1].y, ...forecastPoints.map(d => d.y)],
          borderColor: '#8B5CF6',
          backgroundColor: '#8B5CF620',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#8B5CF6',
          tension: 0.1
        },
        {
          label: 'Línea de Tendencia',
          data: allPoints.map(d => slope * d.x + intercept),
          borderColor: '#6B7280',
          borderWidth: 1,
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Confianza Superior (95%)',
          data: upperBand,
          borderColor: '#8B5CF650',
          backgroundColor: '#8B5CF610',
          borderWidth: 0,
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: 'Confianza Inferior (95%)',
          data: lowerBand,
          borderColor: '#8B5CF650',
          backgroundColor: '#8B5CF610',
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1'
        }
      ]
    };

    // Calculate forecast statistics
    const avgGrowthRate = forecastPoints.length > 0 
      ? ((forecastPoints[forecastPoints.length - 1].y - forecastPoints[0].y) / forecastPoints[0].y * 100 / forecastMonths)
      : 0;

    const stats = {
      avgGrowthRate,
      sixMonthValue: forecastPoints[forecastPoints.length - 1]?.y || 0,
      confidenceRange: upperBand[upperBand.length - 1] - lowerBand[lowerBand.length - 1]
    };

    return { chartData: chartJSData, forecastStats: stats };
  }, [historicalData]);

  if (!chartData) {
    return <div>Loading...</div>;
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
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
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatValue(value as number)
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
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Tendencia de Utilidad Neta y Pronóstico a 6 Meses
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${
              currentTrendPercentage >= 0 ? 'text-white' : 'text-red-200'
            }`}>
              {currentTrendPercentage >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <span className="font-bold text-sm">{formatPercentage(currentTrendPercentage)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Chart */}
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
        
        {/* Forecast Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Tendencia Actual</p>
            <p className="text-lg font-semibold text-emerald-900">
              {currentTrendPercentage > 0 ? '↑' : currentTrendPercentage < 0 ? '↓' : '→'} {formatPercentage(Math.abs(currentTrendPercentage))} mensual
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Pronóstico 6 Meses</p>
            <p className="text-lg font-semibold text-green-900">
              {formatValue(forecastStats?.sixMonthValue || 0)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Rango de Confianza</p>
            <p className="text-lg font-semibold text-purple-900">
              ±{formatPercentage((forecastStats?.confidenceRange || 0) / 2 / (forecastStats?.sixMonthValue || 1) * 100)}
            </p>
          </div>
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