"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface BreakdownItem {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface MetricCardProps {
  title: string;
  currentValue: number;
  previousValue?: number;
  ytdValue?: number;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  showBreakdown?: boolean;
  breakdownData?: BreakdownItem[];
  currency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  onClick?: () => void;
  expandedContent?: React.ReactNode;
  colorScheme?: 'revenue' | 'cost' | 'profit' | 'neutral' | 'warning';
  locale?: string;
}

export function MetricCard({
  title,
  currentValue,
  previousValue,
  ytdValue,
  format,
  icon,
  trend,
  subtitle,
  showBreakdown = false,
  breakdownData,
  currency = 'USD',
  displayUnits = 'normal',
  onClick,
  expandedContent,
  colorScheme = 'neutral',
  locale
}: MetricCardProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [isExpanded, setIsExpanded] = useState(false);
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
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
          currency,
          minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
          maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
        }).format(convertedValue);
        
        return formatted + suffix;
      case 'percentage':
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const calculateChange = (): { value: number; trend: 'up' | 'down' | 'neutral' } => {
    if (!previousValue || previousValue === 0) return { value: 0, trend: 'neutral' };
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      value: change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const change = previousValue !== undefined ? calculateChange() : null;
  const displayTrend = trend || change?.trend || 'neutral';

  const getTrendIcon = () => {
    const iconSize = "h-4 w-4";
    
    switch (displayTrend) {
      case 'up':
        // For cost metrics, up is bad (red), for revenue/profit up is good (green)
        const upIconColor = colorScheme === 'cost' ? 'text-rose-600' : 'text-emerald-600';
        return <ArrowUpIcon className={`${iconSize} ${upIconColor}`} />;
      case 'down':
        // For cost metrics, down is good (green), for revenue/profit down is bad (red)
        const downIconColor = colorScheme === 'cost' ? 'text-emerald-600' : 'text-rose-600';
        return <ArrowDownIcon className={`${iconSize} ${downIconColor}`} />;
      default:
        return <MinusIcon className={`${iconSize} text-gray-400`} />;
    }
  };

  const getTrendColor = () => {
    switch (displayTrend) {
      case 'up':
        // For cost metrics, up is bad (red), for revenue/profit up is good (green)
        return colorScheme === 'cost' ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50';
      case 'down':
        // For cost metrics, down is good (green), for revenue/profit down is bad (red)
        return colorScheme === 'cost' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleClick = () => {
    if (showBreakdown || expandedContent) {
      setIsExpanded(!isExpanded);
      if (onClick) onClick();
    }
  };

  const isClickable = showBreakdown || expandedContent;

  const getColorSchemeStyles = () => {
    switch (colorScheme) {
      case 'revenue':
        return {
          iconBg: 'bg-purple-50',
          iconColor: 'text-purple-600',
          border: 'border-purple-200',
          accentColor: 'purple'
        };
      case 'cost':
        return {
          iconBg: 'bg-rose-50',
          iconColor: 'text-rose-600',
          border: 'border-rose-200',
          accentColor: 'rose'
        };
      case 'profit':
        return {
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          border: 'border-emerald-200',
          accentColor: 'emerald'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          border: 'border-amber-200',
          accentColor: 'amber'
        };
      default:
        return {
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          border: 'border-blue-200',
          accentColor: 'blue'
        };
    }
  };

  const colorStyles = getColorSchemeStyles();

  return (
    <div className="space-y-4 h-full">
      <div 
        className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 relative group min-h-[240px] flex flex-col border ${
          colorStyles.border
        } ${isClickable ? 'cursor-pointer' : ''} overflow-hidden`}
        onClick={handleClick}
      >
        {/* Color accent bar */}
        <div className={`h-1 w-full ${
          colorScheme === 'revenue' ? 'bg-purple-500' :
          colorScheme === 'cost' ? 'bg-rose-500' :
          colorScheme === 'profit' ? 'bg-emerald-500' :
          colorScheme === 'warning' ? 'bg-amber-500' :
          'bg-blue-500'
        }`} />
        
        <div className="p-6 flex-1 flex flex-col">
          {/* Header - Compact design */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {icon && (
                <div className={`p-2.5 rounded-xl ${colorStyles.iconBg} ${colorStyles.iconColor} flex-shrink-0`}>
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-700 truncate flex items-center space-x-1">
                  <span>{title}</span>
                  {isClickable && (
                    isExpanded ? 
                      <ChevronUpIcon className="h-4 w-4 text-gray-400 flex-shrink-0" /> :
                      <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </h3>
                {subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Value - Larger and more prominent */}
          <div className="mb-4 flex-1 flex items-center">
            <div className={`text-4xl font-bold ${
              colorScheme === 'revenue' ? 'text-purple-700' :
              colorScheme === 'cost' ? 'text-rose-700' :
              colorScheme === 'profit' ? 'text-emerald-700' :
              colorScheme === 'warning' ? 'text-amber-700' :
              'text-gray-900'
            }`}>
              {formatValue(currentValue)}
            </div>
          </div>

          {/* Change Indicator - Enhanced with better colors */}
          {change && (
            <div className="flex items-center justify-between mb-3">
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                change.trend === 'up' ? 
                  (colorScheme === 'cost' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700') :
                change.trend === 'down' ? 
                  (colorScheme === 'cost' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') :
                'bg-gray-100 text-gray-600'
              }`}>
                {getTrendIcon()}
                <span>{Math.abs(change.value).toFixed(1)}%</span>
              </div>
              {previousValue !== undefined && (
                <span className="text-xs text-gray-500 font-medium">
                  vs {formatValue(previousValue)}
                </span>
              )}
            </div>
          )}

          {/* YTD Value - More prominent */}
          {ytdValue !== undefined && (
            <div className="mt-auto pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('metrics.ytd')}</span>
                <span className={`text-sm font-bold ${
                  colorScheme === 'revenue' ? 'text-purple-600' :
                  colorScheme === 'cost' ? 'text-rose-600' :
                  colorScheme === 'profit' ? 'text-emerald-600' :
                  colorScheme === 'warning' ? 'text-amber-600' :
                  'text-gray-700'
                }`}>
                  {formatValue(ytdValue)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced hover effect for clickable cards */}
        {isClickable && (
          <div className={`absolute inset-0 rounded-2xl ring-2 ring-opacity-0 group-hover:ring-opacity-100 transition-all duration-200 pointer-events-none ${
            colorScheme === 'revenue' ? 'ring-purple-400' :
            colorScheme === 'cost' ? 'ring-rose-400' :
            colorScheme === 'profit' ? 'ring-emerald-400' :
            colorScheme === 'warning' ? 'ring-amber-400' :
            'ring-blue-400'
          }`} />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-in slide-in-from-top-2 duration-300">
          {breakdownData && breakdownData.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-4">{t('metrics.detailedBreakdown')}</h4>
              {breakdownData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-medium">{formatValue(item.value)}</span>
                  </div>
                  {item.percentage !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.color || 'bg-purple-600'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : expandedContent ? (
            expandedContent
          ) : null}
        </div>
      )}
    </div>
  );
}