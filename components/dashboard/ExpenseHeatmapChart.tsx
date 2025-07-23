"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  subcategory?: string;
}

interface ExpenseHeatmapChartProps {
  data: ExpenseData[];
  title: string;
  subtitle?: string;
  type: 'cogs' | 'opex';
  currency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  locale?: string;
  onCategoryClick?: (category: ExpenseData) => void;
}

export function ExpenseHeatmapChart({ 
  data, 
  title, 
  subtitle,
  type,
  currency = 'USD',
  displayUnits = 'normal',
  locale,
  onCategoryClick
}: ExpenseHeatmapChartProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Convert currency symbol to currency code
  const getCurrencyCode = (currencySymbol: string) => {
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY'
    };
    return currencyMap[currencySymbol] || 'USD';
  };

  const formatValue = (value: number) => {
    let convertedValue = value;
    let suffix = '';
    
    // Apply units for currency
    if (displayUnits === 'K') {
      convertedValue = value / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      convertedValue = value / 1000000;
      suffix = 'M';
    }
    
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: getCurrencyCode(currency),
      minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    }).format(convertedValue);
    
    return formatted + suffix;
  };

  const getColorIntensity = (percentage: number) => {
    const colorScales = {
      cogs: {
        low: 'bg-orange-100 border-orange-200',
        medium: 'bg-orange-300 border-orange-400',
        high: 'bg-orange-500 border-orange-600',
        veryHigh: 'bg-red-600 border-red-700',
        textLow: 'text-orange-900',
        textHigh: 'text-white'
      },
      opex: {
        low: 'bg-rose-100 border-rose-200',
        medium: 'bg-rose-300 border-rose-400',
        high: 'bg-rose-500 border-rose-600',
        veryHigh: 'bg-pink-600 border-pink-700',
        textLow: 'text-rose-900',
        textHigh: 'text-white'
      }
    };

    const scale = colorScales[type];
    let bgClass = '';
    let textClass = '';
    
    if (percentage < 5) {
      bgClass = scale.low;
      textClass = scale.textLow;
    } else if (percentage < 15) {
      bgClass = scale.medium;
      textClass = scale.textLow;
    } else if (percentage < 30) {
      bgClass = scale.high;
      textClass = scale.textHigh;
    } else {
      bgClass = scale.veryHigh;
      textClass = scale.textHigh;
    }
    
    return { bgClass, textClass };
  };

  // Sort data by amount descending for better visual hierarchy
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  // Use consistent grid layout for uniform card sizes
  const getGridCols = () => {
    // Always use 2 columns for consistent card sizing across sections
    return 'grid-cols-2';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        <p className="text-xs text-gray-500 mt-2">
          {t('heatmap.clickForDetails')}
        </p>
      </div>

      <div className={`grid ${getGridCols()} gap-3 mb-6`}>
        {sortedData.map((item, index) => {
          const { bgClass, textClass } = getColorIntensity(item.percentage);
          const isHovered = hoveredCategory === item.category;
          
          return (
            <div
              key={index}
              onClick={() => {
                console.log('Heatmap tile clicked:', item);
                onCategoryClick?.(item);
              }}
              onMouseEnter={() => setHoveredCategory(item.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`
                relative p-4 rounded-xl transition-all duration-200 border-2 cursor-pointer
                ${bgClass} ${isHovered ? 'scale-105 shadow-lg' : 'hover:scale-102 hover:shadow-md'}
              `}
              style={{
                minHeight: '120px'
              }}
            >
              <div className={`text-center ${textClass}`}>
                <div className="text-xs font-medium mb-2 leading-tight">
                  {item.category.length > 20 ? 
                    `${item.category.substring(0, 20)}...` : 
                    item.category
                  }
                </div>
                <div className="text-sm font-bold mb-1">{formatValue(item.amount)}</div>
                <div className="text-xs opacity-90">{item.percentage.toFixed(1)}%</div>
              </div>
              
              {isHovered && (
                <div className="absolute inset-0 bg-black bg-opacity-10 rounded-xl flex items-center justify-center">
                  <div className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
                    {t('heatmap.clickToExpand')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {formatValue(sortedData.reduce((sum, item) => sum + item.amount, 0))}
            </div>
            <div className="text-gray-600">{t('metrics.total')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {sortedData.length}
            </div>
            <div className="text-gray-600">{t('metrics.categories')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {sortedData.length > 0 ? formatValue(Math.max(...sortedData.map(item => item.amount))) : '0'}
            </div>
            <div className="text-gray-600">{t('heatmap.highest')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {sortedData.length > 0 ? `${Math.max(...sortedData.map(item => item.percentage)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-gray-600">{t('heatmap.largestShare')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}