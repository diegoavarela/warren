"use client";

import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { WarrenChart } from '@/components/charts/WarrenChart';
import { HelpIcon } from '@/components/HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { useTranslation } from '@/lib/translations';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  const { t } = useTranslation(locale);
  
  // Defensive check for required functions
  if (!formatPercentage || !formatValue || !currentMonth) {
    return <div>{t('common.loading')}</div>;
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
              {t('revenue.growthAnalysis.title')}
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
              <div className="flex flex-col items-end">
                <span className="font-bold text-lg">{formatPercentage(revenueGrowth)}</span>
                <span className="text-xs text-white/80 font-medium">
                  {previousMonth ? 
                    `${t('growth.vs')} ${previousMonth.month || t('previousMonth')} ${previousMonth.year || ''}`.trim() : 
                    t('growth.noComparison')
                  }
                </span>
              </div>
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
              {t('revenue.current')}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatValue(currentMonth.revenue)}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {t('metrics.grossMargin')}
            </p>
            <p className="text-xl font-bold text-green-600">
              {formatPercentage(currentMonth.grossMargin)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {t('revenue.ytdTotal')}
            </p>
            <p className="text-xl font-bold text-blue-600">
              {formatValue(ytdTotal)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData.map(d => ({
              month: d.month,
              [t('charts.revenue')]: d.revenue,
              [t('charts.totalCosts')]: (d.cogs || 0) + (d.operatingExpenses || 0), // Combined costs
              [t('charts.grossProfit')]: d.grossProfit,
              [t('charts.grossMargin')]: d.grossMargin
            }))}
            margin={{ top: 20, right: 40, left: 80, bottom: 40 }}
          >
            <defs>
              {/* Revenue Gradient: Emerald Green */}
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
              </linearGradient>
              
              {/* Costs Gradient: Rose Red */}
              <linearGradient id="costsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0.7} />
              </linearGradient>
              
              {/* Profit Gradient: Sky Blue */}
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="2 2" 
              stroke="#E5E7EB" 
              strokeOpacity={0.6}
              vertical={false}
            />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }}
              height={50}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(value) => formatValue(value)}
              width={80}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(value) => `${value}%`}
              width={60}
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name.includes('Margin') || name.includes('Margen')) {
                  return [`${value.toFixed(1)}%`, name];
                }
                return [formatValue(value), name];
              }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #D1D5DB',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(8px)'
              }}
              labelStyle={{
                color: '#374151',
                fontWeight: 600,
                marginBottom: '4px'
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '24px',
                fontSize: '13px'
              }}
              iconType="rect"
            />
            {/* Revenue Bar: Modern Emerald Green with Gradient */}
            <Bar 
              yAxisId="left"
              dataKey={t('charts.revenue')} 
              fill="url(#revenueGradient)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            {/* Total Costs Bar: Professional Rose Red with Gradient */}
            <Bar 
              yAxisId="left"
              dataKey={t('charts.totalCosts')} 
              fill="url(#costsGradient)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            {/* Gross Profit Bar: Modern Blue with Gradient */}
            <Bar 
              yAxisId="left"
              dataKey={t('charts.grossProfit')} 
              fill="url(#profitGradient)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            {/* Gross Margin Line: Vibrant Orange with Enhanced Style */}
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey={t('charts.grossMargin')} 
              stroke="#F97316" 
              strokeWidth={4}
              dot={{ r: 5, strokeWidth: 2, fill: '#F97316', stroke: '#FFF' }}
              activeDot={{ r: 7, strokeWidth: 3, fill: '#F97316', stroke: '#FFF' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}