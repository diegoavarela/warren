"use client";

import React, { useMemo, useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../ui/Tooltip';
// Fixed icon imports

interface TrendDataPoint {
  month: string;
  value: number;
  isActual: boolean;
  periodLabel: string;
}

interface TrendAnalysisProps {
  data: TrendDataPoint[];
  title: string;
  currency: string;
  formatValue: (value: number) => string;
  color: 'blue' | 'emerald';
  icon: 'revenue' | 'income';
}

export function TrendAnalysisChart({
  data,
  title,
  currency,
  formatValue,
  color,
  icon
}: TrendAnalysisProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Debug logging to verify data is being passed correctly
    console.log(`📊 [${title}] Chart rendering with ${data.length} data points`);

    const sortedData = [...data].sort((a, b) => new Date(a.periodLabel).getTime() - new Date(b.periodLabel).getTime());
    const actualData = sortedData.filter(d => d.isActual);
    const forecastData = sortedData.filter(d => !d.isActual);

    // Calculate trend metrics
    const currentValue = actualData.length > 0 ? actualData[actualData.length - 1].value : 0;
    const previousValue = actualData.length > 1 ? actualData[actualData.length - 2].value : currentValue;
    const trendPercentage = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : 0;

    // Calculate 6-month projection
    const sixMonthProjection = forecastData.length > 0 ? forecastData[forecastData.length - 1].value : currentValue;

    // Calculate confidence range (±15% of the forecasted value)
    const confidenceRange = Math.abs(sixMonthProjection * 0.15);

    return {
      actualData,
      forecastData,
      currentValue,
      trendPercentage,
      sixMonthProjection,
      confidenceRange,
      allData: sortedData
    };
  }, [data]);

  if (!chartData || chartData.allData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center text-gray-500 py-8">
          No {title.toLowerCase()} data available
        </div>
      </div>
    );
  }

  const { actualData, forecastData, currentValue, trendPercentage, sixMonthProjection, confidenceRange, allData } = chartData;

  // Chart styling based on color theme
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      textLight: 'text-blue-600',
      actualColor: '#10B981', // emerald-500
      forecastColor: '#3B82F6', // blue-500
      trendColor: '#6B7280', // gray-500
      confidenceColor: '#E5E7EB' // gray-200
    },
    emerald: {
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      textLight: 'text-emerald-600',
      actualColor: '#10B981', // emerald-500
      forecastColor: '#8B5CF6', // violet-500
      trendColor: '#6B7280', // gray-500
      confidenceColor: '#F3E8FF' // violet-100
    }
  };

  const theme = colorClasses[color];
  const IconComponent = icon === 'revenue' ? ArrowTrendingUpIcon : CurrencyDollarIcon;

  // Calculate chart dimensions and scaling
  const chartWidth = 480;
  const chartHeight = 200;
  const leftMargin = 80; // More space for Y-axis labels on the left
  const rightPadding = 20;
  const topBottomPadding = 20;
  const plotWidth = chartWidth - leftMargin - rightPadding;
  const plotHeight = chartHeight - (topBottomPadding * 2);

  const dataValues = allData.map(d => d.value);
  const dataMin = Math.min(...dataValues);
  const dataMax = Math.max(...dataValues);

  // Handle case where all values are the same or very close
  let minValue, maxValue, valueRange;
  if (Math.abs(dataMax - dataMin) < 0.01 * Math.abs(dataMax) || dataMax === dataMin) {
    // Values are essentially flat, create artificial range for better visualization
    const centerValue = dataMax;
    if (centerValue === 0) {
      minValue = -1;
      maxValue = 1;
    } else {
      const range = Math.max(Math.abs(centerValue * 0.3), Math.abs(centerValue * 0.1), 100); // 30% range minimum
      minValue = centerValue - range;
      maxValue = centerValue + range;
      // Ensure we don't go below zero for positive values
      if (centerValue > 0 && minValue < 0) {
        minValue = centerValue * 0.5; // 50% of center value as minimum
        maxValue = centerValue * 1.5; // 150% of center value as maximum
      }
    }
    valueRange = maxValue - minValue;

    console.log(`📊 [${title}] Flat data detected - artificial scaling:`, {
      centerValue,
      minValue,
      maxValue,
      valueRange
    });
  } else {
    // Normal case with varying data
    const padding = Math.abs(dataMax - dataMin) * 0.1; // 10% padding
    minValue = dataMin - padding;
    maxValue = dataMax + padding;
    // Ensure we don't go below zero for positive data
    if (dataMin >= 0 && minValue < 0) {
      minValue = 0;
    }
    valueRange = maxValue - minValue;

    console.log(`📊 [${title}] Normal data scaling:`, {
      dataMin,
      dataMax,
      minValue,
      maxValue,
      valueRange
    });
  }

  // Generate SVG path for actual data
  const actualPath = actualData.map((point, index) => {
    const x = leftMargin + (index / (allData.length - 1)) * plotWidth;
    const normalizedValue = Math.max(0, Math.min(1, (point.value - minValue) / valueRange));
    const y = topBottomPadding + plotHeight - normalizedValue * plotHeight;

    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate SVG path for forecast data
  const forecastPath = forecastData.map((point, index) => {
    const actualLength = actualData.length;
    const totalIndex = actualLength + index;
    const x = leftMargin + (totalIndex / (allData.length - 1)) * plotWidth;
    const normalizedValue = Math.max(0, Math.min(1, (point.value - minValue) / valueRange));
    const y = topBottomPadding + plotHeight - normalizedValue * plotHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Connect actual and forecast lines
  const connectionPath = actualData.length > 0 && forecastData.length > 0 ? (() => {
    const lastActual = actualData[actualData.length - 1];
    const firstForecast = forecastData[0];

    const lastActualX = leftMargin + ((actualData.length - 1) / (allData.length - 1)) * plotWidth;
    const lastActualNormalized = Math.max(0, Math.min(1, (lastActual.value - minValue) / valueRange));
    const lastActualY = topBottomPadding + plotHeight - lastActualNormalized * plotHeight;

    const firstForecastX = leftMargin + (actualData.length / (allData.length - 1)) * plotWidth;
    const firstForecastNormalized = Math.max(0, Math.min(1, (firstForecast.value - minValue) / valueRange));
    const firstForecastY = topBottomPadding + plotHeight - firstForecastNormalized * plotHeight;

    return `M ${lastActualX} ${lastActualY} L ${firstForecastX} ${firstForecastY}`;
  })() : '';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <IconComponent className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <div className="flex items-center space-x-2">
            {trendPercentage >= 0 ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
            ) : (
              <ArrowTrendingDownIcon className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-semibold">
              {trendPercentage >= 0 ? '+' : ''}{trendPercentage.toFixed(1)}% vs Previous Month
            </span>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.actualColor }}></div>
            <span className="text-sm text-gray-600">Actual {icon === 'revenue' ? 'Revenue' : 'Net Income'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.forecastColor }}></div>
            <span className="text-sm text-gray-600">Forecast</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.trendColor }}></div>
            <span className="text-sm text-gray-600">Trend Line</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded opacity-30" style={{ backgroundColor: theme.confidenceColor }}></div>
            <span className="text-sm text-gray-600">Upper Confidence (95%)</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex justify-center mb-6">
          <svg width={chartWidth} height={chartHeight} className="border rounded-lg bg-gray-50">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(percent => (
              <line
                key={percent}
                x1={leftMargin}
                y1={topBottomPadding + (percent / 100) * plotHeight}
                x2={leftMargin + plotWidth}
                y2={topBottomPadding + (percent / 100) * plotHeight}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Y-axis value labels */}
            {[0, 25, 50, 75, 100].map(percent => {
              const value = minValue + ((100 - percent) / 100) * valueRange;
              const y = topBottomPadding + (percent / 100) * plotHeight;
              const displayValue = Math.abs(value) < 0.01 ? 0 : value; // Handle very small values
              return (
                <text
                  key={`y-label-${percent}`}
                  x={leftMargin - 15}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#6B7280"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  {currency}{formatValue(displayValue)}
                </text>
              );
            })}

            {/* Confidence band for forecast */}
            {forecastData.length > 0 && (
              <defs>
                <linearGradient id={`confidence-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: theme.forecastColor, stopOpacity: 0.1 }} />
                  <stop offset="100%" style={{ stopColor: theme.forecastColor, stopOpacity: 0.05 }} />
                </linearGradient>
              </defs>
            )}

            {/* Actual data line */}
            {actualPath && (
              <path
                d={actualPath}
                fill="none"
                stroke={theme.actualColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Connection line */}
            {connectionPath && (
              <path
                d={connectionPath}
                fill="none"
                stroke={theme.trendColor}
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}

            {/* Forecast data line */}
            {forecastPath && (
              <path
                d={forecastPath}
                fill="none"
                stroke={theme.forecastColor}
                strokeWidth="3"
                strokeDasharray="6,3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points - Actual */}
            {actualData.map((point, index) => {
              const x = leftMargin + (index / (allData.length - 1)) * plotWidth;
              const normalizedValue = Math.max(0, Math.min(1, (point.value - minValue) / valueRange));
              const y = topBottomPadding + plotHeight - normalizedValue * plotHeight;

              // Calculate percentage change from previous point
              const previousValue = index > 0 ? actualData[index - 1].value : point.value;
              const percentageChange = previousValue !== 0 ? ((point.value - previousValue) / Math.abs(previousValue)) * 100 : 0;

              return (
                <g key={`actual-${index}`}>
                  <Tooltip
                    content={
                      <div className="bg-white p-3 rounded-lg shadow-lg border">
                        <div className="font-semibold text-gray-900">{point.month} 2025</div>
                        <div className="text-sm text-gray-600 mt-1">Actual Data</div>
                        <div className="font-bold text-lg mt-1 text-green-600">
                          {currency}{formatValue(point.value)}
                        </div>
                        {index > 0 && (
                          <div className={`text-sm mt-1 ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {percentageChange >= 0 ? '↗' : '↘'} {Math.abs(percentageChange).toFixed(1)}% vs previous month
                          </div>
                        )}
                      </div>
                    }
                    position="top"
                  >
                    <g>
                      {/* Invisible larger hover area */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                      />
                      {/* Visible data point */}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={theme.actualColor}
                        stroke="white"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />
                    </g>
                  </Tooltip>
                  {/* Show value on first and last actual data points */}
                  {(index === 0 || index === actualData.length - 1) && (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#374151"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {currency}{formatValue(point.value)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Data points - Forecast */}
            {forecastData.map((point, index) => {
              const actualLength = actualData.length;
              const totalIndex = actualLength + index;
              const x = leftMargin + (totalIndex / (allData.length - 1)) * plotWidth;
              const normalizedValue = Math.max(0, Math.min(1, (point.value - minValue) / valueRange));
              const y = topBottomPadding + plotHeight - normalizedValue * plotHeight;

              // Calculate percentage change from previous point (last actual or previous forecast)
              const previousPoint = index === 0 ?
                (actualData.length > 0 ? actualData[actualData.length - 1] : point) :
                forecastData[index - 1];
              const percentageChange = previousPoint.value !== 0 ?
                ((point.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100 : 0;

              return (
                <g key={`forecast-${index}`}>
                  <Tooltip
                    content={
                      <div className="bg-white p-3 rounded-lg shadow-lg border">
                        <div className="font-semibold text-gray-900">{point.month} 2025</div>
                        <div className="text-sm text-gray-600 mt-1">Forecasted Data</div>
                        <div className="font-bold text-lg mt-1 text-blue-600">
                          {currency}{formatValue(point.value)}
                        </div>
                        <div className={`text-sm mt-1 ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {percentageChange >= 0 ? '↗' : '↘'} {Math.abs(percentageChange).toFixed(1)}% vs previous period
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Based on historical trend
                        </div>
                      </div>
                    }
                    position="top"
                  >
                    <g>
                      {/* Invisible larger hover area */}
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                      />
                      {/* Visible data point */}
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={theme.forecastColor}
                        stroke="white"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />
                    </g>
                  </Tooltip>
                  {/* Show value on last forecast data point */}
                  {index === forecastData.length - 1 && (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#374151"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {currency}{formatValue(point.value)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Month labels */}
            {allData.map((point, index) => {
              const x = leftMargin + (index / (allData.length - 1)) * plotWidth;
              return (
                <text
                  key={`label-${index}`}
                  x={x}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6B7280"
                >
                  {point.month}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Current Trend</div>
            <div className={`text-2xl font-bold ${theme.text} mb-1`}>
              {trendPercentage >= 0 ? '↗' : '↘'} {Math.abs(trendPercentage).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">monthly</div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">6-Month Projection</div>
            <div className={`text-2xl font-bold ${theme.text} mb-1`}>
              {currency} {formatValue(sixMonthProjection)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Confidence Range</div>
            <div className={`text-2xl font-bold ${theme.text} mb-1`}>
              ±{sixMonthProjection !== 0 ? ((confidenceRange / Math.abs(sixMonthProjection)) * 100).toFixed(1) : '15.0'}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export individual components for Revenue and Net Income
export function RevenueTrendChart(props: Omit<TrendAnalysisProps, 'color' | 'icon'>) {
  return (
    <TrendAnalysisChart
      {...props}
      color="blue"
      icon="revenue"
    />
  );
}

export function NetIncomeTrendChart(props: Omit<TrendAnalysisProps, 'color' | 'icon'>) {
  return (
    <TrendAnalysisChart
      {...props}
      color="emerald"
      icon="income"
    />
  );
}