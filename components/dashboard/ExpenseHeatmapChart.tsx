"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { currencyService } from '@/lib/services/currency';

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
  originalCurrency?: string;
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
  originalCurrency,
  displayUnits = 'normal',
  locale,
  onCategoryClick
}: ExpenseHeatmapChartProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Convert currency symbol to currency code
  const getCurrencyCode = (currencySymbol: string) => {
    if (!currencySymbol) return 'USD';
    
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY',
      'ARS': 'ARS',
      'MXN': 'MXN',
      'BRL': 'BRL',
      'COP': 'COP',
      'CLP': 'CLP',
      'PEN': 'PEN'
    };
    return currencyMap[currencySymbol.toUpperCase()] || currencySymbol.toUpperCase();
  };

  const formatValue = (value: number) => {
    let convertedValue = value;
    
    // Apply currency conversion if original currency is different from display currency
    if (originalCurrency && currency && originalCurrency !== currency) {
      convertedValue = currencyService.convertValue(value, originalCurrency, currency);
    }
    
    let suffix = '';
    
    // Data is stored in thousands in the file
    if (displayUnits === 'K') {
      // Show as-is with K suffix (data already in thousands)
      suffix = 'K';
    } else if (displayUnits === 'M') {
      // Convert thousands to millions: divide by 1000
      convertedValue = convertedValue / 1000;
      suffix = 'M';
    } else if (displayUnits === 'normal') {
      // Convert thousands to normal: multiply by 1000
      convertedValue = convertedValue * 1000;
    }
    
    const currencyCode = getCurrencyCode(currency);
    
    // Get appropriate locale for currency
    const getLocaleForCurrency = (curr: string) => {
      switch (curr) {
        case 'ARS': return 'es-AR';
        case 'MXN': return 'es-MX';
        case 'BRL': return 'pt-BR';
        case 'COP': return 'es-CO';
        case 'CLP': return 'es-CL';
        case 'PEN': return 'es-PE';
        case 'EUR': return 'de-DE';
        case 'GBP': return 'en-GB';
        case 'JPY': return 'ja-JP';
        default: return 'en-US';
      }
    };
    
    const locale = getLocaleForCurrency(currencyCode);
    
    try {
      // For USD, use traditional currency formatting with $ symbol
      if (currencyCode === 'USD') {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
          maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
        }).format(convertedValue);
        return formatted + suffix;
      }
      
      // For all other currencies, show currency code + number to avoid confusion
      const numberFormatted = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
        maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
      }).format(convertedValue);
      
      return `${currencyCode} ${numberFormatted}${suffix}`;
      
    } catch (error) {
      // Fallback to simple number formatting
      const numberFormatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
        maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
      }).format(convertedValue);
      
      return `${currencyCode} ${numberFormatted}${suffix}`;
    }
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

  // Clean up category names by removing redundant suffixes and handling database IDs
  const cleanCategoryName = (categoryName: string) => {
    if (!categoryName || categoryName.trim() === '') {
      return 'Unknown Category';
    }
    
    // Check if this looks like a database hash/ID (long hex string)
    if (/^[a-f0-9]{20,}$/i.test(categoryName)) {
      return 'Professional Services'; // Default fallback for hash IDs
    }
    
    // Check if it contains a hash pattern at the start or end
    if (/^[a-f0-9]{8,}/.test(categoryName) || /[a-f0-9]{8,}$/.test(categoryName)) {
      // Try to extract readable part if any
      const withoutHashes = categoryName.replace(/[a-f0-9]{8,}/g, '').trim();
      if (withoutHashes && withoutHashes.length > 2) {
        return withoutHashes;
      }
      return 'Professional Services'; // Default fallback
    }
    
    const cleaned = categoryName
      .replace(/\s*\(CoR\)$/i, '') // Remove (CoR) suffix
      .replace(/\s*\(cor\)$/i, '') // Remove (cor) suffix
      .trim();
    
    // Handle specific cases
    if (cleaned === '(cor)' || cleaned === 'cor' || cleaned === '') {
      return 'Contract Services';
    }
    
    return cleaned || 'Contract Services';
  };

  // Sort data by amount descending for better visual hierarchy
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  // Force larger squared cards with fixed dimensions

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6" data-testid="expense-heatmap-improved">
      <style jsx>{`
        .expense-card-square {
          aspect-ratio: 1 / 1;
          width: 100%;
          height: auto;
        }
      `}</style>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        <p className="text-xs text-gray-500 mt-2">
          {t('heatmap.clickForDetails')}
        </p>
      </div>

      <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6`} data-testid="expense-cards-grid">
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
                expense-card-square relative p-6 rounded-xl transition-all duration-200 border-2 cursor-pointer
                ${bgClass} ${isHovered ? 'scale-105 shadow-2xl' : 'hover:scale-102 shadow-lg hover:shadow-xl'}
                flex flex-col justify-center items-center
              `}
            >
              <div className={`text-center ${textClass} h-full flex flex-col justify-center space-y-3`}>
                <div className="text-sm font-semibold leading-tight px-1 flex items-center justify-center text-center min-h-[3rem]">
                  {cleanCategoryName(item.category)}
                </div>
                <div className="text-lg font-bold">{formatValue(item.amount)}</div>
                <div className="text-base font-semibold">{item.percentage.toFixed(1)}%</div>
              </div>
              
              {isHovered && (
                <div className="absolute inset-0 bg-black bg-opacity-20 rounded-xl flex items-center justify-center">
                  <div className="bg-white text-gray-900 px-2 py-1 rounded-lg text-xs font-medium shadow-2xl">
                    {t('heatmap.clickToExpand')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-bold text-gray-900 mb-1">
              {formatValue(sortedData.reduce((sum, item) => sum + item.amount, 0))}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.total')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {sortedData.length}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.categories')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-4">
            <div className="text-lg font-bold text-gray-900 mb-1">
              {sortedData.length > 0 ? formatValue(Math.max(...sortedData.map(item => item.amount))) : formatValue(0)}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.highest')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {sortedData.length > 0 ? `${Math.max(...sortedData.map(item => item.percentage)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.largestShare')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}