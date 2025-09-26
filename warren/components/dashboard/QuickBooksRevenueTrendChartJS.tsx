"use client";

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import '@/lib/utils/chartSetup'; // Register Chart.js components

interface TrendDataPoint {
  month: string;
  value: number;
  isActual: boolean;
}

interface QuickBooksRevenueTrendChartProps {
  data: TrendDataPoint[];
  title: string;
  currency: string;
  formatValue: (value: number) => string;
}

export function QuickBooksRevenueTrendChartJS({
  data,
  title,
  currency,
  formatValue
}: QuickBooksRevenueTrendChartProps) {

  const { chartData, forecastStats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: null, forecastStats: null };
    }

    // Split actual and forecast data
    const actualData = data.filter(item => item.isActual).map((item, index) => ({
      x: index,
      y: item.value || 0,
      month: item.month,
      isActual: true
    }));

    const forecastData = data.filter(item => !item.isActual).map((item, index) => ({
      x: actualData.length + index,
      y: item.value || 0,
      month: item.month,
      isActual: false
    }));

    // Calculate linear regression for trend line
    const { slope, intercept } = calculateLinearRegression(actualData);

    // Calculate confidence bands
    const standardError = calculateStandardError(actualData, slope, intercept);
    const confidenceMultiplier = 1.96; // 95% confidence interval

    const allPoints = [...actualData, ...forecastData];
    const upperBand = allPoints.map((point, index) => {
      const variance = standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - actualData.length/2, 2) / actualData.length);
      return point.y + variance;
    });

    const lowerBand = allPoints.map((point, index) => {
      const variance = standardError * confidenceMultiplier * Math.sqrt(1 + Math.pow(point.x - actualData.length/2, 2) / actualData.length);
      return Math.max(0, point.y - variance);
    });

    const labels = [...actualData.map(d => d.month), ...forecastData.map(d => d.month)];

    const chartJSData = {
      labels,
      datasets: [
        {
          label: 'Actual Revenue',
          data: [...actualData.map(d => d.y), ...Array(forecastData.length).fill(null)],
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Forecast',
          data: [...Array(actualData.length - 1).fill(null), actualData[actualData.length - 1]?.y, ...forecastData.map(d => d.y)],
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#3B82F6',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Trend Line',
          data: allPoints.map((d, i) => slope * i + intercept),
          borderColor: '#6B7280',
          borderWidth: 1,
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Upper Confidence',
          data: upperBand,
          borderColor: '#3B82F650',
          backgroundColor: '#3B82F610',
          borderWidth: 0,
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: 'Lower Confidence',
          data: lowerBand,
          borderColor: '#3B82F650',
          backgroundColor: '#3B82F610',
          borderWidth: 0,
          pointRadius: 0,
          fill: '-1'
        }
      ]
    };

    // Calculate forecast statistics
    const currentTrend = actualData.length > 1
      ? ((actualData[actualData.length - 1].y - actualData[actualData.length - 2].y) / actualData[actualData.length - 2].y * 100)
      : 0;

    const stats = {
      currentTrend,
      sixMonthForecast: forecastData[forecastData.length - 1]?.y || 0,
      confidenceRange: upperBand[upperBand.length - 1] - lowerBand[lowerBand.length - 1]
    };

    return { chartData: chartJSData, forecastStats: stats };
  }, [data]);

  if (!chartData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
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
          },
          filter: (item) => {
            // Hide confidence band labels from legend
            return !item.text?.includes('Confidence');
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
            return `${label}: ${currency}${formatValue(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        position: 'left',
        ticks: {
          callback: (value) => `${currency}${formatValue(value as number)}`,
          font: {
            size: 11
          }
        },
        grid: {
          color: '#E5E7EB'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${
              (forecastStats?.currentTrend || 0) >= 0 ? 'text-white' : 'text-red-200'
            }`}>
              {(forecastStats?.currentTrend || 0) >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <span className="font-bold text-sm">
                {Math.abs(forecastStats?.currentTrend || 0).toFixed(1)}% vs Previous Month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Chart */}
        <div className="h-80 flex-shrink-0">
          <Line data={chartData} options={options} />
        </div>

        {/* Forecast Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Current Trend</p>
            <p className="text-lg font-semibold text-blue-900">
              {(forecastStats?.currentTrend || 0) > 0 ? '↑' : (forecastStats?.currentTrend || 0) < 0 ? '↓' : '→'} {Math.abs(forecastStats?.currentTrend || 0).toFixed(1)}% Monthly
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">6-Month Forecast</p>
            <p className="text-lg font-semibold text-green-900">
              {currency}{formatValue(forecastStats?.sixMonthForecast || 0)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Confidence Range</p>
            <p className="text-lg font-semibold text-purple-900">
              ±{((forecastStats?.confidenceRange || 0) / 2 / (forecastStats?.sixMonthForecast || 1) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Linear regression calculation
function calculateLinearRegression(data: {x: number, y: number}[]): { slope: number; intercept: number } {
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
function calculateStandardError(data: {x: number, y: number}[], slope: number, intercept: number): number {
  const n = data.length;
  let sumSquaredErrors = 0;

  data.forEach(point => {
    const predicted = slope * point.x + intercept;
    const error = point.y - predicted;
    sumSquaredErrors += error * error;
  });

  return n > 2 ? Math.sqrt(sumSquaredErrors / (n - 2)) : 0;
}