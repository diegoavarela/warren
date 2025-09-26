"use client";

import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface CostData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  categories: Array<{
    category: string;
    amount: number;
  }>;
}

interface QuickBooksCostEfficiencyAnalysisProps {
  data: CostData;
  currency: string;
  formatValue: (value: number) => string;
}

export function QuickBooksCostEfficiencyAnalysis({
  data,
  currency,
  formatValue
}: QuickBooksCostEfficiencyAnalysisProps) {

  // Calculate efficiency metrics
  const costPerRevenueDollar = data.revenue > 0 ? ((data.cogs + data.operatingExpenses) / data.revenue) : 0;
  const costOfRevenuePercent = data.revenue > 0 ? (((data.revenue - data.grossProfit) / data.revenue) * 100) : 0;
  const opexPercent = data.revenue > 0 ? ((data.operatingExpenses / data.revenue) * 100) : 0;

  // Prepare cost breakdown data
  const sortedCategories = [...data.categories].sort((a, b) => b.amount - a.amount);
  const top3Categories = sortedCategories.slice(0, 3);
  const otherCategories = sortedCategories.slice(3);
  const othersTotal = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);

  const displayCategories = [
    ...top3Categories,
    ...(othersTotal > 0 ? [{
      category: 'Others',
      amount: othersTotal
    }] : [])
  ];

  const cleanCategoryName = (name: string) => {
    return name.replace(/^(Operating Expenses|Revenue|COGS)\s*[:;-]?\s*/i, '').trim();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Cost Efficiency Analysis
            </h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Cost Per Revenue Dollar */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-700 mb-2">
              {data.revenue > 0 ? `${currency} ${costPerRevenueDollar.toFixed(2)}` : 'N/A'}
            </div>
            <div className="text-sm text-purple-600 font-medium mb-1">
              Cost per revenue dollar
            </div>
            <div className="text-xs text-purple-500">
              {data.revenue > 0
                ? `For every ${currency} 1 of revenue, ${currency} ${costPerRevenueDollar.toFixed(2)} in costs`
                : ''
              }
            </div>
          </div>

          {/* % Cost of Revenue */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-amber-700 mb-2">
              {data.revenue > 0 ? `${costOfRevenuePercent.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-sm text-amber-600 font-medium mb-1">
              % Cost of Revenue
            </div>
            <div className="text-xs text-amber-500">
              {data.revenue > 0
                ? `${currency} ${formatValue(data.revenue - data.grossProfit)} of total revenue`
                : ''
              }
            </div>
          </div>

          {/* % OpEx */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-700 mb-2">
              {data.revenue > 0 ? `${opexPercent.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-sm text-blue-600 font-medium mb-1">
              % OpEx
            </div>
            <div className="text-xs text-blue-500">
              {data.revenue > 0
                ? `${currency} ${formatValue(data.operatingExpenses)} of total revenue`
                : ''
              }
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayCategories.map((category, idx) => {
              const percentage = data.operatingExpenses > 0 ? (category.amount / data.operatingExpenses) * 100 : 0;
              return (
                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {cleanCategoryName(category.category)}
                    </span>
                    <span className="text-lg font-bold text-gray-800">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-3">
                    {currency} {formatValue(category.amount)}
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}