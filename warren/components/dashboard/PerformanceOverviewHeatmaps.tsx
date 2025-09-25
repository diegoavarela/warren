"use client";

import React, { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface MonthlyPerformanceData {
  month: string;        // "Jan", "Feb", etc.
  revenue: number;      // Revenue amount
  netMargin: number;    // Net margin percentage
  periodLabel: string;  // Full period label for display
}

interface PerformanceOverviewHeatmapsProps {
  monthlyData: MonthlyPerformanceData[];
  currency: string;
  formatValue: (value: number) => string;
}

export function PerformanceOverviewHeatmaps({
  monthlyData,
  currency,
  formatValue
}: PerformanceOverviewHeatmapsProps) {
  const [excludedMonths, setExcludedMonths] = useState<Set<string>>(new Set());

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-2xl px-6 py-4">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Performance Overview</h2>
          </div>
        </div>
        <div className="bg-white rounded-b-2xl shadow-lg p-6">
          <div className="text-center text-gray-500 py-8">
            No monthly performance data available
          </div>
        </div>
      </div>
    );
  }

  // Filter and sort data (most recent first, limit to 8 months for 4x2 grid)
  const filteredData = monthlyData
    .filter(d => !excludedMonths.has(d.month))
    .slice(0, 8);

  // Calculate min/max values for color intensity
  const revenues = filteredData.map(d => d.revenue).filter(r => r > 0);
  const margins = filteredData.map(d => d.netMargin);

  const minRevenue = revenues.length > 0 ? Math.min(...revenues) : 0;
  const maxRevenue = revenues.length > 0 ? Math.max(...revenues) : 0;
  const minMargin = margins.length > 0 ? Math.min(...margins) : 0;
  const maxMargin = margins.length > 0 ? Math.max(...margins) : 0;

  const getRevenueColorIntensity = (value: number) => {
    if (maxRevenue === minRevenue || value <= 0) {
      return { bgClass: 'bg-purple-100', textClass: 'text-purple-900' };
    }

    const normalized = (value - minRevenue) / (maxRevenue - minRevenue);

    if (normalized < 0.25) {
      return { bgClass: 'bg-purple-100', textClass: 'text-purple-900' };
    } else if (normalized < 0.5) {
      return { bgClass: 'bg-purple-300', textClass: 'text-purple-900' };
    } else if (normalized < 0.75) {
      return { bgClass: 'bg-purple-500', textClass: 'text-white' };
    } else {
      return { bgClass: 'bg-purple-700', textClass: 'text-white' };
    }
  };

  const getMarginColorIntensity = (value: number) => {
    if (maxMargin === minMargin) {
      return { bgClass: 'bg-emerald-100', textClass: 'text-emerald-900' };
    }

    const normalized = (value - minMargin) / (maxMargin - minMargin);

    if (normalized < 0.25) {
      return { bgClass: 'bg-emerald-100', textClass: 'text-emerald-900' };
    } else if (normalized < 0.5) {
      return { bgClass: 'bg-emerald-300', textClass: 'text-emerald-900' };
    } else if (normalized < 0.75) {
      return { bgClass: 'bg-emerald-500', textClass: 'text-white' };
    } else {
      return { bgClass: 'bg-emerald-700', textClass: 'text-white' };
    }
  };

  const handleMonthClick = (month: string) => {
    const newExcluded = new Set(excludedMonths);
    if (newExcluded.has(month)) {
      newExcluded.delete(month);
    } else {
      newExcluded.add(month);
    }
    setExcludedMonths(newExcluded);
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-2xl px-6 py-4">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-6 h-6 text-white" />
          <h2 className="text-xl font-bold text-white">Performance Overview</h2>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Monthly Revenue Performance */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Revenue Performance</h3>
              <p className="text-sm text-gray-600">Information from each available month up to one year back</p>
            </div>

            {excludedMonths.size === 0 && (
              <p className="text-xs text-gray-500 mb-4">Click to exclude months</p>
            )}

            <div className="grid grid-cols-4 gap-3">
              {filteredData.map((item) => {
                const isExcluded = excludedMonths.has(item.month);
                const { bgClass, textClass } = isExcluded
                  ? { bgClass: 'bg-gray-100', textClass: 'text-gray-600' }
                  : getRevenueColorIntensity(item.revenue);

                return (
                  <div
                    key={`revenue-${item.month}`}
                    onClick={() => handleMonthClick(item.month)}
                    className={`
                      relative p-3 rounded-xl cursor-pointer transition-all duration-200 border min-h-[80px] flex flex-col justify-center
                      ${bgClass} ${isExcluded ? 'border-gray-300 opacity-60' : 'border-transparent hover:scale-105 hover:shadow-md'}
                    `}
                  >
                    <div className={`text-center ${textClass}`}>
                      <div className="text-xs font-medium mb-1">{item.month}</div>
                      <div className="text-xs font-bold break-words">
                        {currency}{formatValue(item.revenue)}
                      </div>
                    </div>
                    {isExcluded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white rounded-full p-1">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Revenue Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-purple-100"></div>
                <span className="text-xs text-gray-600">Low</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-purple-700"></div>
                <span className="text-xs text-gray-600">High</span>
              </div>
            </div>
          </div>

          {/* Monthly Net Margin Performance */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Net Margin Performance</h3>
              <p className="text-sm text-gray-600">Information from each available month up to one year back</p>
            </div>

            {excludedMonths.size === 0 && (
              <p className="text-xs text-gray-500 mb-4">Click to exclude months</p>
            )}

            <div className="grid grid-cols-4 gap-3">
              {filteredData.map((item) => {
                const isExcluded = excludedMonths.has(item.month);
                const { bgClass, textClass } = isExcluded
                  ? { bgClass: 'bg-gray-100', textClass: 'text-gray-600' }
                  : getMarginColorIntensity(item.netMargin);

                return (
                  <div
                    key={`margin-${item.month}`}
                    onClick={() => handleMonthClick(item.month)}
                    className={`
                      relative p-3 rounded-xl cursor-pointer transition-all duration-200 border min-h-[80px] flex flex-col justify-center
                      ${bgClass} ${isExcluded ? 'border-gray-300 opacity-60' : 'border-transparent hover:scale-105 hover:shadow-md'}
                    `}
                  >
                    <div className={`text-center ${textClass}`}>
                      <div className="text-xs font-medium mb-1">{item.month}</div>
                      <div className="text-xs font-bold break-words">
                        {item.netMargin.toFixed(1)}%
                      </div>
                    </div>
                    {isExcluded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white rounded-full p-1">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Margin Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-emerald-100"></div>
                <span className="text-xs text-gray-600">Low</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-emerald-700"></div>
                <span className="text-xs text-gray-600">High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reset button */}
        {excludedMonths.size > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setExcludedMonths(new Set())}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Reset all months
            </button>
          </div>
        )}
      </div>
    </div>
  );
}