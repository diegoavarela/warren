"use client";

import React, { useState } from 'react';

interface ExpenseData {
  category: string;
  parentCategory?: string;
  amount: number;
  percentage: number;
  items: Array<{
    accountName: string;
    amount: number;
    percentage: number;
    subcategory?: string;
  }>;
}

interface OperatingExpensesAnalysisChartProps {
  data: ExpenseData[];
  totalOpex: number;
  currency: string;
  formatValue: (value: number) => string;
  onCategoryClick?: (categoryData: ExpenseData) => void;
}

const OPEX_COLORS = [
  '#3B82F6', // Blue-500 - Primary blue
  '#10B981', // Emerald-500 - Green
  '#F59E0B', // Amber-500 - Orange/Yellow
  '#EF4444', // Red-500 - Red
  '#8B5CF6', // Violet-500 - Purple
  '#06B6D4', // Cyan-500 - Light blue
  '#84CC16', // Lime-500 - Lime green
  '#F97316', // Orange-500 - Orange
  '#EC4899', // Pink-500 - Pink
  '#6366F1', // Indigo-500 - Indigo
  '#14B8A6', // Teal-500 - Teal
  '#D97706', // Amber-600 - Darker orange
  '#7C3AED', // Violet-600 - Darker purple
  '#DC2626', // Red-600 - Darker red
];

export function OperatingExpensesAnalysisChart({
  data,
  totalOpex,
  currency,
  formatValue,
  onCategoryClick
}: OperatingExpensesAnalysisChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No Operating Expenses data available</p>
      </div>
    );
  }

  // Sort data by amount (highest first)
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Operating Expenses Categories */}
      <div className="space-y-3">
        {sortedData.map((category, index) => (
          <div key={category.category} className="bg-white border rounded-lg overflow-hidden shadow-sm">
            {/* Parent Category Row */}
            <div
              className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                hoveredCategory === category.category ? 'ring-2 ring-blue-200 bg-blue-50' : ''
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
                    style={{ backgroundColor: OPEX_COLORS[index % OPEX_COLORS.length] }}
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
                                backgroundColor: OPEX_COLORS[(index * 3 + itemIndex) % OPEX_COLORS.length]
                              }}
                              title={`${item.accountName}\n${currency}${formatValue(item.amount)} • ${item.percentage.toFixed(1)}% of ${category.category}\n${((item.amount / totalOpex) * 100).toFixed(1)}% of Total OpEx`}
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
                    {category.percentage.toFixed(1)}% of OpEx
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-800">
              {currency} {formatValue(totalOpex)}
            </div>
            <div className="text-sm text-blue-600">Total OpEx</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-800">
              {data.length}
            </div>
            <div className="text-sm text-blue-600">
              Categor{data.length !== 1 ? 'ies' : 'y'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-800">
              {data.reduce((sum, cat) => sum + cat.items.length, 0)}
            </div>
            <div className="text-sm text-blue-600">Total Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-800">
              {data.length > 0 ? `${Math.max(...data.map(cat => cat.percentage)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-sm text-blue-600">Largest Category</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        Click any category to view detailed account breakdown • Stacked bars show individual account proportions
      </div>
    </div>
  );
}