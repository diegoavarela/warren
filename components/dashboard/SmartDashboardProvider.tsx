/**
 * Smart Dashboard Provider
 * 
 * Wraps dashboard components with intelligent units management,
 * automatically analyzes data ranges, and ensures consistent
 * formatting across all dashboard elements.
 */

"use client";

import React, { useEffect, useCallback, ReactNode } from 'react';
import { SmartUnitsProvider, useSmartUnits } from '@/lib/contexts/SmartUnitsContext';
import { unifiedFormatter } from '@/lib/services/unified-formatter';

interface SmartDashboardProviderProps {
  children: ReactNode;
  companyId?: string;
  organizationId?: string;
  dashboardType: 'cashflow' | 'pnl' | 'financial';
  data?: any; // Dashboard data for analysis
  autoOptimize?: boolean;
}

interface DashboardWrapperProps extends Omit<SmartDashboardProviderProps, 'children'> {
  children: ReactNode;
}

// Inner component that has access to SmartUnits context
function DashboardWrapper({ 
  children, 
  dashboardType, 
  data, 
  autoOptimize = true 
}: DashboardWrapperProps) {
  const { 
    analyzeDataset, 
    updateCardConstraints, 
    currentUnits,
    effectiveUnits,
    dataRange,
    recommendation 
  } = useSmartUnits();

  // Extract numerical values from dashboard data for analysis
  const extractValuesFromData = useCallback((data: any): number[] => {
    const values: number[] = [];
    
    if (!data) return values;

    try {
      // Handle different dashboard data structures
      if (dashboardType === 'cashflow' && data.periods) {
        // Cash Flow data structure
        data.periods.forEach((period: any) => {
          if (typeof period.totalInflows === 'number') values.push(Math.abs(period.totalInflows));
          if (typeof period.totalOutflows === 'number') values.push(Math.abs(period.totalOutflows));
          if (typeof period.netCashFlow === 'number') values.push(Math.abs(period.netCashFlow));
          if (typeof period.finalBalance === 'number') values.push(Math.abs(period.finalBalance));
          if (typeof period.monthlyGeneration === 'number') values.push(Math.abs(period.monthlyGeneration));
        });
      } else if (dashboardType === 'pnl') {
        // P&L data structure
        if (data.periods) {
          data.periods.forEach((period: any) => {
            if (typeof period.revenue === 'number') values.push(Math.abs(period.revenue));
            if (typeof period.cogs === 'number') values.push(Math.abs(period.cogs));
            if (typeof period.grossProfit === 'number') values.push(Math.abs(period.grossProfit));
            if (typeof period.operatingExpenses === 'number') values.push(Math.abs(period.operatingExpenses));
            if (typeof period.netIncome === 'number') values.push(Math.abs(period.netIncome));
          });
        }
      } else {
        // Generic financial data - extract all numbers
        const extractNumbers = (obj: any) => {
          if (typeof obj === 'number' && isFinite(obj) && obj !== 0) {
            values.push(Math.abs(obj));
          } else if (Array.isArray(obj)) {
            obj.forEach(extractNumbers);
          } else if (obj && typeof obj === 'object') {
            Object.values(obj).forEach(extractNumbers);
          }
        };
        extractNumbers(data);
      }
    } catch (error) {
      console.error('Error extracting values from dashboard data:', error);
    }

    return values.filter(v => v > 0); // Remove zeros and invalid values
  }, [dashboardType]);

  // Analyze data when it changes
  useEffect(() => {
    if (data && autoOptimize) {
      const values = extractValuesFromData(data);
      if (values.length > 0) {
        console.log(`📊 [SmartDashboard] Analyzing ${values.length} values for ${dashboardType} dashboard`);
        console.log(`📊 [SmartDashboard] Range: ${Math.min(...values).toLocaleString()} - ${Math.max(...values).toLocaleString()}`);
        analyzeDataset(values);
      }
    }
  }, [data, autoOptimize, analyzeDataset, extractValuesFromData, dashboardType]);

  // Update card constraints based on dashboard type
  useEffect(() => {
    const constraints = getDashboardCardConstraints(dashboardType);
    updateCardConstraints(constraints);
  }, [dashboardType, updateCardConstraints]);

  // Log units changes for debugging
  useEffect(() => {
    if (effectiveUnits !== currentUnits) {
      console.log(`🔄 [SmartDashboard] Units auto-scaled from ${currentUnits} to ${effectiveUnits}`);
      if (recommendation) {
        console.log(`💡 [SmartDashboard] Recommendation: ${recommendation.reason} - ${recommendation.impact}`);
      }
    }
  }, [currentUnits, effectiveUnits, recommendation]);

  return <>{children}</>;
}

export function SmartDashboardProvider({
  children,
  companyId,
  organizationId,
  dashboardType,
  data,
  autoOptimize = true
}: SmartDashboardProviderProps) {
  // Determine initial units based on dashboard type
  const getInitialUnits = () => {
    switch (dashboardType) {
      case 'cashflow':
        return 'M'; // Cash flow typically deals with larger numbers
      case 'pnl':
        return 'K'; // P&L can vary more widely
      default:
        return 'normal';
    }
  };

  return (
    <SmartUnitsProvider
      companyId={companyId}
      organizationId={organizationId}
      initialUnits={getInitialUnits()}
      autoOptimize={autoOptimize}
    >
      <DashboardWrapper
        dashboardType={dashboardType}
        data={data}
        autoOptimize={autoOptimize}
      >
        {children}
      </DashboardWrapper>
    </SmartUnitsProvider>
  );
}

// Dashboard-specific card constraints
function getDashboardCardConstraints(dashboardType: string) {
  switch (dashboardType) {
    case 'cashflow':
      return {
        maxWidth: 220,
        maxCharacters: 14, // Cash flow cards can be slightly wider
        preferredDigits: 7
      };
    case 'pnl':
      return {
        maxWidth: 200,
        maxCharacters: 12,
        preferredDigits: 6
      };
    default:
      return {
        maxWidth: 200,
        maxCharacters: 12,
        preferredDigits: 6
      };
  }
}

// Hook for dashboard components to get formatted values
export function useDashboardFormatter() {
  const { formatValue, effectiveUnits, isAutoScaled } = useSmartUnits();
  
  const formatCurrency = useCallback((value: number, currency: string = 'USD') => {
    return formatValue(value, currency);
  }, [formatValue]);
  
  const formatMultiple = useCallback((values: number[], currency: string = 'USD') => {
    return values.map(value => formatValue(value, currency));
  }, [formatValue]);

  const formatWithFallback = useCallback((
    value: number, 
    currency: string = 'USD',
    fallbackFormat?: (value: number) => string
  ) => {
    try {
      return formatValue(value, currency);
    } catch (error) {
      console.error('Formatting error:', error);
      return {
        formatted: fallbackFormat ? fallbackFormat(value) : value.toLocaleString(),
        raw: value,
        units: effectiveUnits,
        suffix: '',
        isOverflow: false
      };
    }
  }, [formatValue, effectiveUnits]);

  return {
    formatCurrency,
    formatMultiple,
    formatWithFallback,
    currentUnits: effectiveUnits,
    isAutoScaled
  };
}

// Hook to get dashboard-wide units info
export function useDashboardUnits() {
  const {
    currentUnits,
    effectiveUnits,
    status,
    isAutoScaled,
    recommendation,
    dataRange,
    setUserPreference,
    forceUnits,
    resetToOptimal
  } = useSmartUnits();

  return {
    currentUnits,
    effectiveUnits,
    status,
    isAutoScaled,
    recommendation,
    dataRange,
    actions: {
      setUserPreference,
      forceUnits,
      resetToOptimal
    }
  };
}