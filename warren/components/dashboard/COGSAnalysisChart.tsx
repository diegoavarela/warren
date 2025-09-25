"use client";

import React, { useState } from 'react';

interface COGSData {
  category: string;
  amount: number;
  percentage: number;
  items: Array<{
    accountName: string;
    amount: number;
    percentage: number;
  }>;
}

interface COGSAnalysisChartProps {
  data: COGSData[];
  totalCogs: number;
  currency: string;
  formatValue: (value: number) => string;
  onCategoryClick?: (categoryData: COGSData) => void;
}

const COGS_COLORS = [
  '#DC2626', // Red-600
  '#B91C1C', // Red-700
  '#991B1B', // Red-800
  '#7F1D1D', // Red-900
  '#F87171', // Red-400
  '#FCA5A5', // Red-300
];

export function COGSAnalysisChart({
  data,
  totalCogs,
  currency,
  formatValue,
  onCategoryClick
}: COGSAnalysisChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No COGS data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* COGS Categories */}
      <div className="space-y-3">
        {data.map((category, index) => (
          <div
            key={category.category}
            className={`bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              hoveredCategory === category.category ? 'ring-2 ring-red-200 bg-red-50' : ''
            }`}
            onClick={() => onCategoryClick?.(category)}
            onMouseEnter={() => setHoveredCategory(category.category)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <div className="grid grid-cols-12 gap-1 items-start">
              {/* Category Info - Fixed Width */}
              <div className="col-span-2 flex items-center space-x-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COGS_COLORS[index % COGS_COLORS.length] }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{category.category}</h3>
                  <p className="text-sm text-gray-600">
                    {category.items.length} account{category.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Bar Section - Longer Bars */}
              <div className="col-span-9">
                {/* Stacked Visual Bar */}
                <div className="w-full bg-gray-200 rounded-lg h-14 overflow-hidden shadow-sm">
                  <div className="flex h-full" style={{ width: `${Math.min(category.percentage, 100)}%` }}>
                    {category.items
                      .filter(item => item.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((item, itemIndex) => {
                        const itemWidthPercent = category.amount > 0 ? (item.amount / category.amount) * 100 : 0;
                        return (
                          <div
                            key={itemIndex}
                            className="transition-all duration-500"
                            style={{
                              width: `${itemWidthPercent}%`,
                              backgroundColor: COGS_COLORS[(index * 3 + itemIndex) % COGS_COLORS.length]
                            }}
                            title={`${item.accountName}\n${currency}${formatValue(item.amount)} • ${item.percentage.toFixed(1)}% of ${category.category}\n${((item.amount / totalCogs) * 100).toFixed(1)}% of Total COGS`}
                          />
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Amount and Percentage - Compact Width */}
              <div className="col-span-1 text-right">
                {/* Amount */}
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {currency} {formatValue(category.amount)}
                </div>
                {/* Percentage */}
                <div className="text-sm font-medium text-gray-700">
                  {category.percentage.toFixed(1)}% of COGS
                </div>
              </div>
            </div>

            {/* Subcategory breakdown (if more than one account) */}
            {category.items.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="space-y-2">
                  {category.items
                    .filter(item => item.amount > 0)
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 3) // Show top 3 accounts
                    .map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COGS_COLORS[(index + itemIndex + 1) % COGS_COLORS.length] }}
                        />
                        <span className="text-gray-600">{item.accountName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-800">
                          {currency} {formatValue(item.amount)}
                        </span>
                        <span className="text-gray-500 ml-2">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                  {category.items.length > 3 && (
                    <div className="text-sm text-gray-500 text-center pt-1">
                      +{category.items.length - 3} more account{category.items.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">
              {currency} {formatValue(totalCogs)}
            </div>
            <div className="text-sm text-red-600">Total COGS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">
              {data.length}
            </div>
            <div className="text-sm text-red-600">
              Categor{data.length !== 1 ? 'ies' : 'y'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">
              {data.reduce((sum, cat) => sum + cat.items.length, 0)}
            </div>
            <div className="text-sm text-red-600">Total Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-800">
              {data.length > 0 ? `${Math.max(...data.map(cat => cat.percentage)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-sm text-red-600">Largest Category</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        Click on any category to view detailed account breakdown
      </div>
    </div>
  );
}