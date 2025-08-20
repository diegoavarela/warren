/**
 * Smart Dashboard Integration Example
 * 
 * This file demonstrates how to integrate the Smart Units system into existing
 * dashboards. It shows the before/after comparison and migration steps.
 */

"use client";

import React from 'react';
import { SmartDashboardProvider, useDashboardFormatter, useDashboardUnits } from './SmartDashboardProvider';
import { SmartUnitsSelector } from '../ui/SmartUnitsSelector';
import { SmartMetricCard } from './SmartMetricCard';
import { BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

// Example dashboard data
const mockDashboardData = {
  periods: [
    {
      id: '2025-01',
      totalInflows: 2500000,
      totalOutflows: 1800000,
      netCashFlow: 700000,
      finalBalance: 5200000,
      monthlyGeneration: 450000
    },
    {
      id: '2025-02',
      totalInflows: 2800000,
      totalOutflows: 2100000,
      netCashFlow: 700000,
      finalBalance: 5900000,
      monthlyGeneration: 520000
    },
    // More periods...
  ]
};

// BEFORE: Old dashboard component with individual formatting logic
function OldDashboardExample() {
  // ❌ Each component manages its own units and formatting
  const [displayUnits, setDisplayUnits] = React.useState<'normal' | 'K' | 'M'>('M');
  
  const formatValue = (value: number): string => {
    // ❌ Scattered formatting logic, inconsistent auto-scaling
    let formattedValue = value;
    let suffix = '';
    
    if (displayUnits === 'K') {
      formattedValue = value / 1000;
      suffix = 'K';
      // Auto-scale K to M if too large
      if (Math.abs(formattedValue) >= 1000) {
        formattedValue = formattedValue / 1000;
        suffix = 'M';
      }
    } else if (displayUnits === 'M') {
      formattedValue = value / 1000000;
      suffix = 'M';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1
    }).format(formattedValue) + suffix;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">❌ Old Approach</h2>
        
        {/* ❌ Basic units selector, doesn't reflect auto-scaling */}
        <select 
          value={displayUnits} 
          onChange={(e) => setDisplayUnits(e.target.value as any)}
          className="border rounded px-3 py-1"
        >
          <option value="normal">Normal</option>
          <option value="K">Thousands</option>
          <option value="M">Millions</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ❌ Each card formats independently, potential inconsistencies */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700">Total Inflows</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatValue(mockDashboardData.periods[0].totalInflows)}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700">Total Outflows</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatValue(mockDashboardData.periods[0].totalOutflows)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700">Net Cash Flow</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatValue(mockDashboardData.periods[0].netCashFlow)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700">Final Balance</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatValue(mockDashboardData.periods[0].finalBalance)}
          </p>
        </div>
      </div>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-2">Issues with Old Approach:</h4>
        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
          <li>Units selector shows 'M' but some values auto-scale differently</li>
          <li>Inconsistent formatting logic across components</li>
          <li>No overflow protection for card layouts</li>
          <li>No intelligent units recommendations</li>
          <li>Duplicated formatting code everywhere</li>
        </ul>
      </div>
    </div>
  );
}

// AFTER: New dashboard with Smart Units system
function NewDashboardContent() {
  // ✅ Consistent formatting from centralized system
  const { formatCurrency } = useDashboardFormatter();
  const { effectiveUnits, isAutoScaled, recommendation } = useDashboardUnits();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">✅ Smart Units Approach</h2>
        
        {/* ✅ Intelligent units selector with recommendations */}
        <SmartUnitsSelector showRecommendations={true} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ✅ Consistent formatting across all components */}
        <SmartMetricCard
          title="Total Inflows"
          currentValue={mockDashboardData.periods[0].totalInflows}
          previousValue={mockDashboardData.periods[0].totalInflows * 0.85}
          format="currency"
          currency="USD"
          icon={<ArrowTrendingUpIcon />}
          colorScheme="revenue"
        />
        
        <SmartMetricCard
          title="Total Outflows"
          currentValue={mockDashboardData.periods[0].totalOutflows}
          previousValue={mockDashboardData.periods[0].totalOutflows * 1.1}
          format="currency"
          currency="USD"
          icon={<ArrowTrendingDownIcon />}
          colorScheme="cost"
        />

        <SmartMetricCard
          title="Net Cash Flow"
          currentValue={mockDashboardData.periods[0].netCashFlow}
          previousValue={mockDashboardData.periods[0].netCashFlow * 0.9}
          format="currency"
          currency="USD"
          icon={<CurrencyDollarIcon />}
          colorScheme="profit"
        />

        <SmartMetricCard
          title="Final Balance"
          currentValue={mockDashboardData.periods[0].finalBalance}
          previousValue={mockDashboardData.periods[0].finalBalance * 0.95}
          format="currency"
          currency="USD"
          icon={<BanknotesIcon />}
          colorScheme="neutral"
        />
      </div>

      {/* ✅ System status and recommendations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">✅ Smart Units Benefits:</h4>
        <div className="text-sm text-green-700 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Current Units:</span>
            <span>{effectiveUnits}</span>
            {isAutoScaled && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Auto-scaled
              </span>
            )}
          </div>
          
          {recommendation && (
            <div className="bg-white p-3 rounded border">
              <span className="font-medium">💡 Recommendation:</span>
              <p className="text-xs mt-1">
                Consider using <strong>{recommendation.suggested}</strong> units for {recommendation.reason}
              </p>
            </div>
          )}

          <ul className="list-disc list-inside space-y-1">
            <li>100% consistent units across all components</li>
            <li>Intelligent auto-scaling based on data ranges</li>
            <li>Card overflow prevention</li>
            <li>Smart recommendations with explanations</li>
            <li>Centralized formatting logic</li>
            <li>User preference persistence</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Migration guide component
function MigrationGuide() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">🚀 Migration Guide</h3>
      
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-medium text-blue-800 mb-2">Step 1: Wrap Dashboard with Smart Provider</h4>
          <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`<SmartDashboardProvider
  companyId={companyId}
  organizationId={organizationId}
  dashboardType="cashflow"
  data={dashboardData}
  autoOptimize={true}
>
  <YourDashboardContent />
</SmartDashboardProvider>`}
          </pre>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Step 2: Replace Unit Selectors</h4>
          <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`// Replace this:
<select value={displayUnits} onChange={...}>
  <option value="K">Thousands</option>
</select>

// With this:
<SmartUnitsSelector showRecommendations={true} />`}
          </pre>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Step 3: Update Components</h4>
          <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`// Replace complex formatting logic:
const formatValue = (value) => {
  // 50+ lines of formatting code
};

// With simple hook usage:
const { formatCurrency } = useDashboardFormatter();
const formatted = formatCurrency(value, currency);`}
          </pre>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">Step 4: Use Smart Components</h4>
          <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`// Replace MetricCard with SmartMetricCard
<SmartMetricCard
  title="Revenue"
  currentValue={revenue}
  format="currency"
  currency="USD"
  // No need for displayUnits prop!
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
}

// Main example component
export function SmartDashboardExample() {
  const [showOld, setShowOld] = React.useState(true);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Smart Units System Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Compare the old approach vs. the new Smart Units system
        </p>
        
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowOld(true)}
            className={`px-4 py-2 rounded-lg font-medium ${
              showOld 
                ? 'bg-red-100 text-red-800 border border-red-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            ❌ Old Approach
          </button>
          <button
            onClick={() => setShowOld(false)}
            className={`px-4 py-2 rounded-lg font-medium ${
              !showOld 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            ✅ Smart Units
          </button>
        </div>
      </div>

      {showOld ? (
        <OldDashboardExample />
      ) : (
        <SmartDashboardProvider
          dashboardType="cashflow"
          data={mockDashboardData}
          autoOptimize={true}
        >
          <NewDashboardContent />
        </SmartDashboardProvider>
      )}

      <MigrationGuide />
    </div>
  );
}