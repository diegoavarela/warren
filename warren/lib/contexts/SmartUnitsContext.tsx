/**
 * Smart Units Context
 * 
 * Provides centralized, intelligent units management for dashboard components.
 * Ensures consistent units across all components while handling card layout constraints,
 * data ranges, and user preferences.
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { configService } from '@/lib/services/configuration-service';

// Types and Interfaces
export type Units = 'normal' | 'K' | 'M' | 'B';
export type UnitsStatus = 'user_selected' | 'auto_scaled' | 'system_optimized' | 'layout_constrained';

export interface DataRange {
  min: number;
  max: number;
  median: number;
  p90: number; // 90th percentile
  count: number;
}

export interface CardConstraints {
  maxWidth: number;
  maxCharacters: number;
  preferredDigits: number;
}

export interface OptimalUnits {
  recommended: Units;
  reason: 'data_range' | 'card_layout' | 'readability' | 'user_preference';
  confidence: number; // 0-1
  alternatives: Array<{
    units: Units;
    score: number;
    issues: string[];
  }>;
}

export interface UnitsRecommendation {
  suggested: Units;
  current: Units;
  reason: string;
  impact: 'no_overflow' | 'better_fit' | 'improved_readability' | 'user_preference';
  canOverride: boolean;
  overrideWarnings: string[];
}

export interface FormattedValue {
  formatted: string;
  raw: number;
  units: Units;
  suffix: string;
  isOverflow: boolean;
}

export interface UnitsContextValue {
  // Current State
  currentUnits: Units;
  effectiveUnits: Units; // May differ from currentUnits due to auto-scaling
  status: UnitsStatus;
  isAutoScaled: boolean;
  
  // Data Analysis
  dataRange: DataRange | null;
  cardConstraints: CardConstraints;
  
  // Recommendations
  recommendation: UnitsRecommendation | null;
  
  // Actions
  setUserPreference: (units: Units) => void;
  analyzeDataset: (values: number[]) => void;
  formatValue: (value: number, currency?: string) => FormattedValue;
  forceUnits: (units: Units) => void;
  resetToOptimal: () => void;
  
  // Configuration
  updateCardConstraints: (constraints: Partial<CardConstraints>) => void;
  
  // State
  loading: boolean;
  error: string | null;
}

const SmartUnitsContext = createContext<UnitsContextValue | null>(null);

export interface SmartUnitsProviderProps {
  children: ReactNode;
  companyId?: string;
  organizationId?: string;
  initialUnits?: Units;
  autoOptimize?: boolean;
}

export function SmartUnitsProvider({
  children,
  companyId,
  organizationId,
  initialUnits = 'normal',
  autoOptimize = true
}: SmartUnitsProviderProps) {
  const { user } = useAuth();
  
  // Core State
  const [currentUnits, setCurrentUnits] = useState<Units>(initialUnits);
  const [effectiveUnits, setEffectiveUnits] = useState<Units>(initialUnits);
  const [status, setStatus] = useState<UnitsStatus>('user_selected');
  const [dataRange, setDataRange] = useState<DataRange | null>(null);
  const [recommendation, setRecommendation] = useState<UnitsRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Card Constraints (default values, can be updated by components)
  const [cardConstraints, setCardConstraints] = useState<CardConstraints>({
    maxWidth: 200, // pixels
    maxCharacters: 12, // characters in formatted value
    preferredDigits: 6 // preferred max digits before scaling
  });

  // Load user preferences from configuration
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const context = {
          userId: user.id,
          companyId,
          organizationId: user.organizationId
        };
        
        const userUnits = await configService.getRawValue<Units>('ui.preferredUnits', context, initialUnits);
        if (userUnits && userUnits !== currentUnits) {
          setCurrentUnits(userUnits);
          setEffectiveUnits(userUnits);
        }
      } catch (err) {
        console.error('Failed to load user units preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserPreferences();
  }, [user?.id, companyId, organizationId, initialUnits, currentUnits]);

  // Data Analysis Utilities
  const calculateDataRange = useCallback((values: number[]): DataRange => {
    if (values.length === 0) {
      return { min: 0, max: 0, median: 0, p90: 0, count: 0 };
    }
    
    const sortedValues = values.map(Math.abs).sort((a, b) => a - b);
    const count = sortedValues.length;
    
    return {
      min: sortedValues[0],
      max: sortedValues[count - 1],
      median: sortedValues[Math.floor(count / 2)],
      p90: sortedValues[Math.floor(count * 0.9)],
      count
    };
  }, []);

  // Optimal Units Calculation
  const calculateOptimalUnits = useCallback((range: DataRange, constraints: CardConstraints): OptimalUnits => {
    const alternatives: OptimalUnits['alternatives'] = [];
    
    // Test each unit option
    const unitsToTest: Units[] = ['normal', 'K', 'M', 'B'];
    
    for (const units of unitsToTest) {
      const score = scoreUnitsOption(units, range, constraints);
      const issues = findUnitsIssues(units, range, constraints);
      
      alternatives.push({
        units,
        score,
        issues
      });
    }
    
    // Sort by score (highest first)
    alternatives.sort((a, b) => b.score - a.score);
    const best = alternatives[0];
    
    let reason: OptimalUnits['reason'] = 'data_range';
    if (best.issues.some(issue => issue.includes('overflow'))) {
      reason = 'card_layout';
    } else if (range.p90 > 1000000) {
      reason = 'readability';
    }
    
    return {
      recommended: best.units,
      reason,
      confidence: best.score,
      alternatives
    };
  }, []);

  // Units Scoring Algorithm
  const scoreUnitsOption = (units: Units, range: DataRange, constraints: CardConstraints): number => {
    let score = 0;
    
    // Score based on data range appropriateness
    const p90 = range.p90;
    switch (units) {
      case 'normal':
        score += p90 < 1000 ? 0.9 : p90 < 100000 ? 0.7 : 0.3;
        break;
      case 'K':
        score += p90 >= 1000 && p90 < 1000000 ? 0.9 : p90 < 10000000 ? 0.7 : 0.3;
        break;
      case 'M':
        score += p90 >= 100000 && p90 < 1000000000 ? 0.9 : p90 >= 1000000 ? 0.7 : 0.3;
        break;
      case 'B':
        score += p90 >= 1000000000 ? 0.9 : 0.2;
        break;
    }
    
    // Score based on character length (simulate formatting)
    const sampleValue = range.p90;
    const formattedLength = estimateFormattedLength(sampleValue, units);
    if (formattedLength <= constraints.maxCharacters) {
      score += 0.8;
    } else if (formattedLength <= constraints.maxCharacters + 2) {
      score += 0.5;
    } else {
      score += 0.1;
    }
    
    // Bonus for avoiding scientific notation
    if (formattedLength <= constraints.preferredDigits) {
      score += 0.3;
    }
    
    return Math.min(score, 1);
  };

  const findUnitsIssues = (units: Units, range: DataRange, constraints: CardConstraints): string[] => {
    const issues: string[] = [];
    const sampleValue = range.p90;
    const formattedLength = estimateFormattedLength(sampleValue, units);
    
    if (formattedLength > constraints.maxCharacters) {
      issues.push('May cause card overflow');
    }
    
    if (units === 'normal' && range.max > 1000000000) {
      issues.push('Very large numbers may be hard to read');
    }
    
    if (units === 'B' && range.p90 < 1000000) {
      issues.push('Most values will show as 0.00B');
    }
    
    if (units === 'K' && range.min < 1) {
      issues.push('Small values will show as 0.00K');
    }
    
    return issues;
  };

  const estimateFormattedLength = (value: number, units: Units): number => {
    let scaledValue = Math.abs(value);
    
    switch (units) {
      case 'K':
        scaledValue = scaledValue / 1000;
        break;
      case 'M':
        scaledValue = scaledValue / 1000000;
        break;
      case 'B':
        scaledValue = scaledValue / 1000000000;
        break;
    }
    
    // Estimate formatted length: currency symbol + number + suffix
    const numberPart = scaledValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: scaledValue >= 100 ? 0 : 1
    });
    
    const suffix = units === 'normal' ? '' : units;
    return 1 + numberPart.length + suffix.length; // 1 for currency symbol
  };

  // Public API Functions
  const analyzeDataset = useCallback((values: number[]) => {
    const range = calculateDataRange(values);
    setDataRange(range);
    
    if (autoOptimize && range.count > 0) {
      const optimal = calculateOptimalUnits(range, cardConstraints);
      
      // Create recommendation
      const rec: UnitsRecommendation = {
        suggested: optimal.recommended,
        current: currentUnits,
        reason: optimal.reason,
        impact: 'improved_readability',
        canOverride: true,
        overrideWarnings: optimal.alternatives.find(a => a.units === currentUnits)?.issues || []
      };
      
      setRecommendation(rec);
      
      // Auto-apply if confidence is high and units would change
      if (optimal.confidence > 0.8 && optimal.recommended !== currentUnits) {
        setEffectiveUnits(optimal.recommended);
        setStatus('auto_scaled');
      }
    }
  }, [calculateDataRange, calculateOptimalUnits, cardConstraints, autoOptimize, currentUnits]);

  const setUserPreference = useCallback((units: Units) => {
    setCurrentUnits(units);
    setEffectiveUnits(units);
    setStatus('user_selected');
    setRecommendation(null);
    
    // TODO: Save to user preferences (ConfigurationService setValue method not implemented)
    // if (user?.id) {
    //   configService.setValue(
    //     'ui.preferredUnits',
    //     units,
    //     'user',
    //     {
    //       userId: user.id,
    //       companyId,
    //       organizationId: user.organizationId
    //     },
    //     {
    //       description: 'User preferred display units for financial data',
    //       category: 'ui'
    //     }
    //   ).catch(err => {
    //     console.error('Failed to save units preference:', err);
    //   });
    // }
  }, [user?.id, companyId, organizationId]);

  const formatValue = useCallback((value: number, currency: string = 'USD'): FormattedValue => {
    let scaledValue = value;
    let suffix = '';
    let units = effectiveUnits;
    
    // Apply scaling
    switch (units) {
      case 'K':
        scaledValue = value / 1000;
        suffix = 'K';
        break;
      case 'M':
        scaledValue = value / 1000000;
        suffix = 'M';
        break;
      case 'B':
        scaledValue = value / 1000000000;
        suffix = 'B';
        break;
      default:
        suffix = '';
    }
    
    // Format the number
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: Math.abs(scaledValue) >= 100 ? 0 : 1,
      maximumFractionDigits: Math.abs(scaledValue) >= 100 ? 0 : 1
    }).format(scaledValue);
    
    const finalFormatted = suffix ? formatted + suffix : formatted;
    const isOverflow = finalFormatted.length > cardConstraints.maxCharacters;
    
    return {
      formatted: finalFormatted,
      raw: value,
      units,
      suffix,
      isOverflow
    };
  }, [effectiveUnits, cardConstraints.maxCharacters]);

  const forceUnits = useCallback((units: Units) => {
    setCurrentUnits(units);
    setEffectiveUnits(units);
    setStatus('user_selected');
    setRecommendation(null);
  }, []);

  const resetToOptimal = useCallback(() => {
    if (recommendation) {
      setCurrentUnits(recommendation.suggested);
      setEffectiveUnits(recommendation.suggested);
      setStatus('system_optimized');
      setRecommendation(null);
    }
  }, [recommendation]);

  const updateCardConstraints = useCallback((constraints: Partial<CardConstraints>) => {
    setCardConstraints(prev => ({ ...prev, ...constraints }));
  }, []);

  // Context Value
  const value: UnitsContextValue = {
    // Current State
    currentUnits,
    effectiveUnits,
    status,
    isAutoScaled: status === 'auto_scaled' || status === 'system_optimized',
    
    // Data Analysis
    dataRange,
    cardConstraints,
    
    // Recommendations
    recommendation,
    
    // Actions
    setUserPreference,
    analyzeDataset,
    formatValue,
    forceUnits,
    resetToOptimal,
    updateCardConstraints,
    
    // State
    loading,
    error
  };

  return (
    <SmartUnitsContext.Provider value={value}>
      {children}
    </SmartUnitsContext.Provider>
  );
}

// Hook for consuming the context
export function useSmartUnits(): UnitsContextValue {
  const context = useContext(SmartUnitsContext);
  if (!context) {
    throw new Error('useSmartUnits must be used within a SmartUnitsProvider');
  }
  return context;
}