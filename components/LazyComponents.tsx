/**
 * Lazy Loading Components for Performance Optimization
 * 
 * Heavy components that are loaded on-demand to improve initial bundle size
 * and page load performance.
 */

import React, { lazy, Suspense } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Loading fallback component
const ComponentLoader = ({ name }: { name?: string }) => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex flex-col items-center space-y-3">
      <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
      <div className="text-sm text-gray-600">
        Loading {name}...
      </div>
    </div>
  </div>
);

// Heavy Dashboard Components - Lazy Loaded
export const LazyCashFlowComposition = lazy(() => 
  import('./dashboard/CashFlowComposition').then(module => ({ default: module.CashFlowComposition }))
);

export const LazyCashFlowScenarioPlanning = lazy(() => 
  import('./dashboard/CashFlowScenarioPlanning')
);

export const LazyCashFlowRunwayAnalysis = lazy(() => 
  import('./dashboard/CashFlowRunwayAnalysis')
);

export const LazyCashFlowGrowthAnalysis = lazy(() => 
  import('./dashboard/CashFlowGrowthAnalysis')
);

export const LazyCashFlowHeatmap = lazy(() => 
  import('./dashboard/CashFlowHeatmap')
);

export const LazyFinancialDataChatV2 = lazy(() => 
  import('./dashboard/FinancialDataChatV2')
);

export const LazyAIChat = lazy(() => 
  import('./dashboard/AIChat')
);

export const LazyExpenseDetailModal = lazy(() => 
  import('./dashboard/ExpenseDetailModal').then(module => ({ default: module.ExpenseDetailModal }))
);

// Chart Components - Lazy Loaded
export const LazyCashFlowForecastTrendsChartJS = lazy(() => 
  import('./dashboard/CashFlowForecastTrendsChartJS')
);

export const LazyCOGSHorizontalStackedChart = lazy(() => 
  import('./dashboard/COGSHorizontalStackedChart')
);

export const LazyHeatmapChart = lazy(() => 
  import('./dashboard/HeatmapChart').then(module => ({ default: module.HeatmapChart }))
);

export const LazyHorizontalStackedChart = lazy(() => 
  import('./dashboard/HorizontalStackedChart').then(module => ({ default: module.HorizontalStackedChart }))
);

// UI Components - Heavy ones lazy loaded
export const LazyChartRenderer = lazy(() => 
  import('./ui/ChartRenderer')
);

export const LazyKeyboardShortcutsPanel = lazy(() => 
  import('./ui/KeyboardShortcutsPanel')
);

export const LazySheetSelector = lazy(() => 
  import('./SheetSelector')
);

// Wrapper components with suspense
export const CashFlowComposition = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Cash Flow Composition" />}>
    <LazyCashFlowComposition {...props} />
  </Suspense>
);

export const CashFlowScenarioPlanning = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Scenario Planning" />}>
    <LazyCashFlowScenarioPlanning {...props} />
  </Suspense>
);

export const CashFlowRunwayAnalysis = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Runway Analysis" />}>
    <LazyCashFlowRunwayAnalysis {...props} />
  </Suspense>
);

export const CashFlowGrowthAnalysis = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Growth Analysis" />}>
    <LazyCashFlowGrowthAnalysis {...props} />
  </Suspense>
);

export const CashFlowHeatmap = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Heatmap" />}>
    <LazyCashFlowHeatmap {...props} />
  </Suspense>
);

export const FinancialDataChatV2 = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Financial Chat" />}>
    <LazyFinancialDataChatV2 {...props} />
  </Suspense>
);

export const AIChat = (props: any) => (
  <Suspense fallback={<ComponentLoader name="AI Assistant" />}>
    <LazyAIChat {...props} />
  </Suspense>
);

export const ExpenseDetailModal = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Expense Details" />}>
    <LazyExpenseDetailModal {...props} />
  </Suspense>
);

export const CashFlowForecastTrendsChartJS = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Forecast Chart" />}>
    <LazyCashFlowForecastTrendsChartJS {...props} />
  </Suspense>
);

export const COGSHorizontalStackedChart = (props: any) => (
  <Suspense fallback={<ComponentLoader name="COGS Chart" />}>
    <LazyCOGSHorizontalStackedChart {...props} />
  </Suspense>
);

export const HeatmapChart = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Heatmap Chart" />}>
    <LazyHeatmapChart {...props} />
  </Suspense>
);

export const HorizontalStackedChart = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Stacked Chart" />}>
    <LazyHorizontalStackedChart {...props} />
  </Suspense>
);

export const ChartRenderer = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Chart" />}>
    <LazyChartRenderer {...props} />
  </Suspense>
);

export const KeyboardShortcutsPanel = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Keyboard Shortcuts" />}>
    <LazyKeyboardShortcutsPanel {...props} />
  </Suspense>
);

export const SheetSelector = (props: any) => (
  <Suspense fallback={<ComponentLoader name="Sheet Selector" />}>
    <LazySheetSelector {...props} />
  </Suspense>
);

// Export types for components that need them

// Performance monitoring for lazy loading
export const logLazyLoadTime = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 Lazy loaded: ${componentName} at ${new Date().toISOString()}`);
  }
};