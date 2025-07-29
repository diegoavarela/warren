"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';

interface ExpenseData {
  category: string;
  amount: number;
  percentage?: number;
  subcategory?: string;
  items?: Array<{
    accountName: string;
    amount: number;
    percentage?: number;
  }>;
}

interface HorizontalStackedChartProps {
  data: ExpenseData[];
  currency?: string;
  originalCurrency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  locale?: string;
  onCategoryClick?: (category: ExpenseData) => void;
  formatValue?: (value: number) => string;
  title?: string;
  subtitle?: string;
}

// Warren color palette for subcategories
const SUBCATEGORY_COLORS = [
  'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 
  'bg-red-500', 'bg-blue-500', 'bg-orange-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-lime-500', 'bg-teal-500', 'bg-yellow-500'
];

// Clean up category names for better display
const cleanCategoryName = (categoryName: string, context?: 'category' | 'account', parentCategory?: string) => {
  if (!categoryName || categoryName.trim() === '') {
    return context === 'account' ? 'Account Item' : 'Unknown Category';
  }
  
  // Check for database hash IDs
  const isHashId = /^[a-f0-9]{16,}$/i.test(categoryName) || 
                   /[a-f0-9]{12,}/i.test(categoryName) ||
                   (categoryName.length > 15 && !/\s/.test(categoryName) && /^[a-zA-Z0-9]+$/.test(categoryName));
  
  if (isHashId) {
    if (context === 'account' && parentCategory) {
      const parent = parentCategory.toLowerCase();
      if (parent.includes('salary') || parent.includes('salaries')) {
        return 'Salary Payment';
      } else if (parent.includes('professional') || parent.includes('service')) {
        return 'Professional Service';
      } else if (parent.includes('material')) {
        return 'Material Cost';
      } else if (parent.includes('labor')) {
        return 'Labor Cost';
      } else {
        return 'Cost Item';
      }
    } else {
      return 'Professional Services';
    }
  }
  
  const cleaned = categoryName
    .replace(/\s*\(CoR\)$/i, '')
    .replace(/\s*\(cor\)$/i, '')
    .trim();
  
  return cleaned || (context === 'account' ? 'Account Item' : 'Professional Services');
};

export function HorizontalStackedChart({
  data,
  currency = 'USD',
  originalCurrency,
  displayUnits = 'normal',
  locale,
  onCategoryClick,
  formatValue,
  title,
  subtitle
}: HorizontalStackedChartProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(item => item.amount));

  // Default format function if none provided
  const defaultFormatValue = (value: number) => {
    // Determine the scale based on displayUnits
    let scaledValue = value;
    let unit = '';
    
    if (displayUnits === 'K') {
      scaledValue = value / 1000;
      unit = 'K';
    } else if (displayUnits === 'M') {
      scaledValue = value / 1000000;
      unit = 'M';
    }
    
    // Define supported currencies inline to avoid async import
    const SUPPORTED_CURRENCIES = [
      { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
      { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
      { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
      { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
      { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
      { code: 'ARS', symbol: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' }
    ];
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency);
    const currencySymbol = currencyInfo?.symbol || currency;
    
    // Format number without currency style to avoid symbol issues
    const numberFormatter = new Intl.NumberFormat(locale || contextLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    });
    
    const formattedNumber = numberFormatter.format(scaledValue);
    
    // Add space before unit suffix if needed
    const unitWithSpace = unit ? ` ${unit}` : '';
    
    // Add space after currency symbol for multi-character currencies like ARS
    const currencyWithSpace = currencySymbol.length > 1 ? `${currencySymbol} ` : currencySymbol;
    
    return `${currencyWithSpace}${formattedNumber}${unitWithSpace}`;
  };

  const valueFormatter = formatValue || defaultFormatValue;

  return (
    <div className="w-full px-6 py-4">
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}

      {/* Horizontal Stacked Bars */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const categoryName = cleanCategoryName(item.category);
          const isHovered = hoveredCategory === item.category;
          
          return (
            <div 
              key={item.category} 
              className="flex items-center space-x-4"
              onMouseEnter={() => setHoveredCategory(item.category)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {/* Category Label */}
              <div className="w-40 text-right text-sm font-medium text-gray-700 flex-shrink-0">
                <div className="truncate" title={categoryName}>
                  {categoryName}
                </div>
                <div className="text-xs text-gray-500">
                  {(item.percentage || 0).toFixed(1)}%
                </div>
              </div>

              {/* Stacked Bar */}
              <div className="flex-1 relative">
                <div 
                  className={`bg-gray-200 rounded-lg h-10 relative overflow-hidden transition-all duration-200 ${
                    isHovered ? 'shadow-md' : ''
                  }`}
                >
                  {/* Render stacked segments */}
                  {item.items && item.items.length > 0 ? (
                    <div className="flex h-full">
                      {item.items.map((subItem, subIndex) => {
                        const width = (subItem.amount / maxValue) * 100;
                        const colorClass = SUBCATEGORY_COLORS[subIndex % SUBCATEGORY_COLORS.length];
                        
                        return (
                          <div
                            key={subIndex}
                            className={`h-full ${colorClass} flex items-center justify-center text-white text-xs font-medium transition-all duration-200 cursor-pointer hover:opacity-90 group relative`}
                            style={{ width: `${width}%` }}
                            title={`${cleanCategoryName(subItem.accountName, 'account', item.category)}: ${valueFormatter(subItem.amount)}`}
                            onClick={() => onCategoryClick && onCategoryClick(item)}
                          >
                            {/* Show value if segment is wide enough */}
                            {width > 8 && (
                              <span className="text-xs font-semibold truncate px-1">
                                {valueFormatter(subItem.amount)}
                              </span>
                            )}
                            
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                              <div className="font-medium">
                                {cleanCategoryName(subItem.accountName, 'account', item.category)}
                              </div>
                              <div>{valueFormatter(subItem.amount)} ({(subItem.percentage || 0).toFixed(1)}%)</div>
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single segment for the entire category if no subcategories */
                    <div 
                      className={`bg-blue-500 h-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:bg-blue-600 transition-colors duration-200`}
                      style={{ width: `${(item.amount / maxValue) * 100}%` }}
                      onClick={() => onCategoryClick && onCategoryClick(item)}
                    >
                      {valueFormatter(item.amount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="w-24 text-sm font-bold text-gray-900 flex-shrink-0 text-right">
                {valueFormatter(item.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {valueFormatter(data.reduce((sum, item) => sum + item.amount, 0))}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.total')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">{data.length}</div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.categories')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {data.length > 0 ? valueFormatter(Math.max(...data.map(item => item.amount))) : '0'}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.highest')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {data.length > 0 ? `${Math.max(...data.map(item => item.percentage || 0)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.largestShare')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}