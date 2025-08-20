"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { currencyService } from '@/lib/services/currency';

interface HeatmapData {
  month: string;
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title: string;
  subtitle?: string;
  colorScale?: 'revenue' | 'margin' | 'performance';
  interactive?: boolean;
  onExclude?: (months: string[]) => void;
  currency?: string;
  originalCurrency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  locale?: string;
  formatValue?: (value: number) => string; // NEW: External formatter from dashboard
}

export function HeatmapChart({ 
  data, 
  title, 
  subtitle,
  colorScale = 'revenue',
  interactive = false,
  onExclude,
  currency = 'USD',
  originalCurrency,
  displayUnits = 'normal',
  locale,
  formatValue: externalFormatValue
}: HeatmapChartProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [excludedMonths, setExcludedMonths] = useState<Set<string>>(new Set());

  const getColorIntensity = (value: number, min: number, max: number) => {
    const normalized = (value - min) / (max - min);
    
    const colorScales = {
      revenue: {
        low: 'bg-purple-100',
        medium: 'bg-purple-300',
        high: 'bg-purple-500',
        veryHigh: 'bg-purple-700',
        textLow: 'text-purple-900',
        textHigh: 'text-white'
      },
      margin: {
        low: 'bg-emerald-100',
        medium: 'bg-emerald-300',
        high: 'bg-emerald-500',
        veryHigh: 'bg-emerald-700',
        textLow: 'text-emerald-900',
        textHigh: 'text-white'
      },
      performance: {
        low: 'bg-blue-100',
        medium: 'bg-blue-300',
        high: 'bg-blue-500',
        veryHigh: 'bg-blue-700',
        textLow: 'text-blue-900',
        textHigh: 'text-white'
      }
    };

    const scale = colorScales[colorScale];
    let bgClass = '';
    let textClass = '';
    
    if (normalized < 0.25) {
      bgClass = scale.low;
      textClass = scale.textLow;
    } else if (normalized < 0.5) {
      bgClass = scale.medium;
      textClass = scale.textLow;
    } else if (normalized < 0.75) {
      bgClass = scale.high;
      textClass = scale.textHigh;
    } else {
      bgClass = scale.veryHigh;
      textClass = scale.textHigh;
    }
    
    return { bgClass, textClass };
  };

  // Filter out invalid months and excluded months
  const validData = data.filter(d => 
    d.month && 
    d.month !== 'undefined' && 
    d.month !== 'Unknown' &&
    typeof d.value === 'number' && 
    !isNaN(d.value)
  );
  
  const filteredData = validData.filter(d => !excludedMonths.has(d.month));
  
  // Handle case where there's no valid data  
  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="text-center text-gray-500 py-8">
          {t('heatmap.noValidData') || 'No valid data available'}
        </div>
      </div>
    );
  }
  
  const values = filteredData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const handleMonthClick = (month: string) => {
    if (!interactive) return;
    
    const newExcluded = new Set(excludedMonths);
    if (newExcluded.has(month)) {
      newExcluded.delete(month);
    } else {
      newExcluded.add(month);
    }
    
    setExcludedMonths(newExcluded);
    if (onExclude) {
      onExclude(Array.from(newExcluded));
    }
  };

  const formatValue = (value: number) => {
    // 🎯 CENTRALIZED FORMATTING: Use external formatter if provided
    if (externalFormatValue && colorScale !== 'margin') {
      return externalFormatValue(value);
    }
    
    // 🔄 FALLBACK: Keep existing logic for margins and compatibility
    if (colorScale === 'margin') {
      return `${value.toFixed(1)}%`;
    }
    
    let convertedValue = value;
    
    // Apply currency conversion if original currency is different from display currency
    if (originalCurrency && currency && originalCurrency !== currency) {
      convertedValue = currencyService.convertValue(value, originalCurrency, currency);
    }
    
    // Note: The value passed here should already be in the correct units
    // This is just for display formatting with suffixes
    let suffix = '';
    
    // Apply display units suffix based on displayUnits setting
    if (displayUnits === 'K') {
      suffix = 'K';
    } else if (displayUnits === 'M') {
      suffix = 'M';
    }
    // NO AUTO-SCALING in fallback - let centralized system handle unit decisions
    
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    }).format(convertedValue);
    
    return formatted + suffix;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        {interactive && (
          <p className="text-xs text-gray-500 mt-2">
            {t('heatmap.clickToExclude')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {validData.map((item, index) => {
          const isExcluded = excludedMonths.has(item.month);
          const { bgClass, textClass } = isExcluded 
            ? { bgClass: 'bg-gray-100', textClass: 'text-gray-600' } 
            : getColorIntensity(item.value, min, max);
          
          return (
            <div
              key={index}
              onClick={() => handleMonthClick(item.month)}
              className={`
                relative p-4 rounded-xl transition-all duration-200 border min-h-[80px] flex flex-col justify-center
                ${bgClass} ${isExcluded ? 'border-gray-300' : 'border-transparent'}
                ${interactive ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}
                ${isExcluded ? 'opacity-60' : ''}
              `}
            >
              <div className={`text-center ${textClass}`}>
                <div className="text-xs font-medium mb-2">{item.month}</div>
                <div className="text-xs font-bold leading-tight break-words">{item.label || formatValue(item.value)}</div>
              </div>
              {isExcluded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-full p-1">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded ${colorScale === 'revenue' ? 'bg-purple-100' : colorScale === 'margin' ? 'bg-emerald-100' : 'bg-blue-100'}`}></div>
          <span className="text-xs text-gray-600">{locale?.startsWith('es') ? 'Bajo' : 'Low'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded ${colorScale === 'revenue' ? 'bg-purple-700' : colorScale === 'margin' ? 'bg-emerald-700' : 'bg-blue-700'}`}></div>
          <span className="text-xs text-gray-600">{locale?.startsWith('es') ? 'Alto' : 'High'}</span>
        </div>
      </div>

      {excludedMonths.size > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setExcludedMonths(new Set());
              if (onExclude) onExclude([]);
            }}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            {locale?.startsWith('es') ? 'Restablecer todos los meses' : 'Reset all months'}
          </button>
        </div>
      )}
    </div>
  );
}