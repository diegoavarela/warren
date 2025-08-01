"use client";

import React from 'react';
import { COGSHorizontalStackedChart } from '@/components/dashboard/COGSHorizontalStackedChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Mock COGS data that matches the expected structure
const mockCOGSData = [
  {
    category: "Salaries",
    amount: 15000,
    percentage: 58.8,
    items: [
      { accountName: "Base Salaries", amount: 10000, percentage: 66.7 },
      { accountName: "Overtime Pay", amount: 3000, percentage: 20.0 },
      { accountName: "Bonuses", amount: 2000, percentage: 13.3 }
    ]
  },
  {
    category: "Employee Benefits", 
    amount: 4000,
    percentage: 15.7,
    items: [
      { accountName: "Health Insurance", amount: 2500, percentage: 62.5 },
      { accountName: "Retirement 401k", amount: 1000, percentage: 25.0 },
      { accountName: "Life Insurance", amount: 500, percentage: 12.5 }
    ]
  },
  {
    category: "Training",
    amount: 2500,
    percentage: 9.8,
    items: [
      { accountName: "Professional Development", amount: 1500, percentage: 60.0 },
      { accountName: "Certifications", amount: 1000, percentage: 40.0 }
    ]
  },
  {
    category: "Travel & Accommodation",
    amount: 2000,
    percentage: 7.8,
    items: [
      { accountName: "Business Travel", amount: 1200, percentage: 60.0 },
      { accountName: "Hotel Expenses", amount: 800, percentage: 40.0 }
    ]
  },
  {
    category: "Miscellaneous",
    amount: 1500,
    percentage: 5.9,
    items: [
      { accountName: "Office Supplies", amount: 800, percentage: 53.3 },
      { accountName: "Equipment", amount: 700, percentage: 46.7 }
    ]
  },
  {
    category: "Other",
    amount: 500,
    percentage: 2.0,
    // No items array - should create single segment
  }
];

const formatValue = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Simple test data for basic bar chart
const simpleTestData = [
  { name: 'Salaries', value: 15000 },
  { name: 'Benefits', value: 4000 },
  { name: 'Training', value: 2500 },
  { name: 'Travel', value: 2000 },
  { name: 'Misc', value: 1500 },
  { name: 'Other', value: 500 }
];

// Alternative approach 1: Custom HTML/CSS bars
const CustomHorizontalBar = ({ data, formatValue }: { data: any[], formatValue: (v: number) => string }) => {
  const maxValue = Math.max(...data.map(item => item.amount));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.category} className="flex items-center space-x-4">
          <div className="w-32 text-right text-sm font-medium text-gray-700 flex-shrink-0">
            {item.category}
          </div>
          <div className="flex-1 relative">
            <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
              {/* Render stacked segments */}
              {item.items && item.items.length > 0 ? (
                <div className="flex h-full">
                  {item.items.map((subItem: any, subIndex: number) => {
                    const width = (subItem.amount / maxValue) * 100;
                    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
                    return (
                      <div
                        key={subIndex}
                        className={`h-full ${colors[subIndex % colors.length]} flex items-center justify-center text-white text-xs font-medium transition-all hover:opacity-80 cursor-pointer`}
                        style={{ width: `${width}%` }}
                        title={`${subItem.accountName}: ${formatValue(subItem.amount)}`}
                      >
                        {width > 10 && `${formatValue(subItem.amount)}`}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(item.amount / maxValue) * 100}%` }}
                >
                  {formatValue(item.amount)}
                </div>
              )}
            </div>
          </div>
          <div className="w-20 text-sm font-bold text-gray-900 flex-shrink-0">
            {formatValue(item.amount)}
          </div>
        </div>
      ))}
    </div>
  );
};

// Alternative approach 2: Vertical stacked bars (which work better in Recharts)
const verticalStackedData = mockCOGSData.map(item => {
  const result: any = { name: item.category };
  if (item.items) {
    item.items.forEach((subItem, index) => {
      result[subItem.accountName] = subItem.amount;
    });
  } else {
    result['Main Amount'] = item.amount;
  }
  return result;
});

export default function COGSChartTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            COGS Horizontal Stacked Chart Test
          </h1>
          <p className="text-gray-600">
            Testing the horizontal stacked chart implementation with mock data
          </p>
        </div>

        {/* Alternative 1: Custom HTML/CSS Horizontal Stacked Bars */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-green-500 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Alternative 1: Custom HTML/CSS Horizontal Stacked Bars
            </h3>
            <p className="text-sm text-white/80 mt-1">Pure CSS approach with stacked segments</p>
          </div>
          <div className="p-6">
            <CustomHorizontalBar data={mockCOGSData} formatValue={formatValue} />
          </div>
        </div>

        {/* Alternative 2: Vertical Stacked Bars (Recharts) */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-purple-500 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Alternative 2: Vertical Stacked Bars (Recharts - Should Work)
            </h3>
            <p className="text-sm text-white/80 mt-1">Using vertical stacked bars instead of horizontal</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={verticalStackedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Base Salaries" stackId="stack" fill="#8B5CF6" />
                <Bar dataKey="Overtime Pay" stackId="stack" fill="#06B6D4" />
                <Bar dataKey="Bonuses" stackId="stack" fill="#10B981" />
                <Bar dataKey="Health Insurance" stackId="stack" fill="#F59E0B" />
                <Bar dataKey="Retirement 401k" stackId="stack" fill="#EF4444" />
                <Bar dataKey="Life Insurance" stackId="stack" fill="#3B82F6" />
                <Bar dataKey="Professional Development" stackId="stack" fill="#8B5A3C" />
                <Bar dataKey="Certifications" stackId="stack" fill="#EC4899" />
                <Bar dataKey="Business Travel" stackId="stack" fill="#6366F1" />
                <Bar dataKey="Hotel Expenses" stackId="stack" fill="#84CC16" />
                <Bar dataKey="Office Supplies" stackId="stack" fill="#F97316" />
                <Bar dataKey="Equipment" stackId="stack" fill="#14B8A6" />
                <Bar dataKey="Main Amount" stackId="stack" fill="#6B7280" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Simple Test Chart */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-blue-500 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Simple Horizontal Bar Test (Should Work)
            </h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={simpleTestData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complex Test Chart */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Análisis de Costos de Ventas - Test
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Desglose de costos por categoría - Testing horizontal stacked bars
            </p>
          </div>

          {/* Chart Content */}
          <div className="w-full">
            <COGSHorizontalStackedChart
              data={mockCOGSData}
              currency="USD"
              displayUnits="normal"
              locale="en-US"
              formatValue={formatValue}
              onCategoryClick={(expense) => {
                console.log('Category clicked:', expense);
                alert(`Clicked on category: ${expense.category} - $${expense.amount.toLocaleString()}`);
              }}
            />
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mock Data Structure</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(mockCOGSData, null, 2)}
          </pre>
        </div>

        {/* Expected Behavior */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Expected Behavior</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• Should show 6 horizontal bars (one per category)</li>
            <li>• Each bar should have stacked segments for subcategories</li>
            <li>• Chart should span full width of container</li>
            <li>• Tooltips should show category and subcategory details</li>
            <li>• Click on any segment should trigger alert with category info</li>
            <li>• Console should show data processing logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}