"use client";

import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { WarrenChart } from '@/components/charts/WarrenChart';
import { HelpIcon } from '@/components/HelpIcon';
import { helpTopics } from '@/lib/help-content';

interface RevenueGrowthProps {
  chartData: any[];
  currentMonth: any;
  previousMonth: any;
  currency: string;
  displayUnits: 'normal' | 'K' | 'M';
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
}

export function RevenueGrowthAnalysis({ 
  chartData, 
  currentMonth, 
  previousMonth, 
  currency,
  displayUnits,
  formatValue,
  formatPercentage,
  locale = 'es-MX'
}: RevenueGrowthProps) {
  // Defensive check for required functions
  if (!formatPercentage || !formatValue || !currentMonth) {
    return <div>Loading...</div>;
  }
  const revenueGrowth = previousMonth 
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 
    : 0;

  const ytdTotal = chartData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {locale?.startsWith('es') ? 'Análisis de Crecimiento de Ingresos' : 'Revenue Growth Analysis'}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 ${
              revenueGrowth >= 0 ? 'text-white' : 'text-red-200'
            }`}>
              {revenueGrowth >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5" />
              )}
              <span className="font-bold text-lg">{formatPercentage(revenueGrowth)}</span>
            </div>
            <HelpIcon topic={helpTopics['dashboard.revenue']} size="sm" className="text-white hover:text-gray-200" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Ingresos Actuales' : 'Current Revenue'}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatValue(currentMonth.revenue)}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Margen Bruto' : 'Gross Margin'}
            </p>
            <p className="text-xl font-bold text-green-600">
              {formatPercentage(currentMonth.grossMargin)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'YTD Total' : 'YTD Total'}
            </p>
            <p className="text-xl font-bold text-blue-600">
              {formatValue(ytdTotal)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <WarrenChart
          data={chartData.map(d => ({
            month: d.month,
            [locale?.startsWith('es') ? 'Ingresos' : 'Revenue']: d.revenue,
            [locale?.startsWith('es') ? 'Utilidad Bruta' : 'Gross Profit']: d.grossProfit
          }))}
          config={{
            xKey: 'month',
            yKeys: [
              locale?.startsWith('es') ? 'Ingresos' : 'Revenue',
              locale?.startsWith('es') ? 'Utilidad Bruta' : 'Gross Profit'
            ],
            type: 'area',
            height: 250,
            colors: ['#10B981', '#3B82F6'],
            gradient: true
          }}
          formatValue={formatValue}
        />
      </div>
    </div>
  );
}