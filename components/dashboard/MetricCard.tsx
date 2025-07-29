"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { HelpTopic } from '../HelpModal';
import { currencyService } from '@/lib/services/currency';

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
  originalCurrency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  onClick?: () => void;
  expandedContent?: React.ReactNode;
  colorScheme?: 'revenue' | 'cost' | 'profit' | 'neutral' | 'warning';
  locale?: string;
  helpTopic?: HelpTopic;
  helpContext?: {
    currentValue: number;
    previousValue?: number;
    trend?: string;
    ytdValue?: number;
    changePercent?: number;
    margin?: number;
    benchmarks?: Record<string, number>;
  };
  comparisonPeriod?: 'lastMonth' | 'lastQuarter' | 'lastYear';
  previousPeriodLabel?: string;
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
  originalCurrency,
  displayUnits = 'normal',
  onClick,
  expandedContent,
  colorScheme = 'neutral',
  locale,
  helpTopic,
  helpContext,
  comparisonPeriod,
  previousPeriodLabel
}: MetricCardProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [isExpanded, setIsExpanded] = useState(false);
  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        let convertedValue = value;
        let suffix = '';
        
        // Apply currency conversion if original currency is different from display currency
        if (originalCurrency && currency && originalCurrency !== currency) {
          convertedValue = currencyService.convertValue(value, originalCurrency, currency);
        }
        
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

  const getPreviousLabel = (): string => {
    // If a custom label is provided, use it
    if (previousPeriodLabel) {
      return previousPeriodLabel;
    }
    
    // Otherwise, generate label based on comparison period
    if (comparisonPeriod) {
      switch (comparisonPeriod) {
        case 'lastMonth':
          return t('comparison.lastMonth.short');
        case 'lastQuarter':
          return t('comparison.lastQuarter.short');
        case 'lastYear':
          return t('comparison.lastYear.short');
        default:
          return t('metrics.previous');
      }
    }
    
    // Fallback to generic "Previous"
    return t('metrics.previous');
  };

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
    <>
      <div 
        className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border ${
          colorStyles.border
        } ${isClickable ? 'cursor-pointer' : ''} p-6 h-full flex flex-col flex-1`}
        onClick={handleClick}
      >
        {/* Header with icon and help */}
        <div className="flex items-center justify-between mb-4">
          <div className={`${colorStyles.iconBg} p-2 rounded-xl shadow-sm`}>
            <div className={colorStyles.iconColor}>
              {icon || <div className="w-6 h-6 bg-current rounded opacity-20" />}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {helpTopic && (
              <HelpIcon 
                topic={{
                  ...helpTopic,
                  context: {
                    ...helpContext,
                    title,
                    format,
                    currency,
                    displayUnits,
                    colorScheme,
                    changeValue: change?.value
                  }
                }}
                size="sm"
                className="opacity-60 hover:opacity-100"
              />
            )}
            {isClickable && (
              <div className={`h-5 w-5 ${colorStyles.iconColor}`}>
                {isExpanded ? 
                  <ChevronUpIcon className="h-5 w-5" /> :
                  <ChevronDownIcon className="h-5 w-5" />
                }
              </div>
            )}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 leading-tight">
          {title}
        </h3>
        
        {/* Main Value - Flex grow to take available space */}
        <div className="flex-grow flex flex-col justify-center">
          <div className="flex items-baseline mb-2">
            <span className={`text-2xl font-bold text-gray-900`}>
              {formatValue(currentValue)}
            </span>
          </div>


          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        
        {/* Trend and Previous Value - Always at bottom */}
        <div className="flex items-center justify-between mt-auto pt-4">
          {previousValue !== undefined ? (
            <p className="text-xs text-gray-500">
              {getPreviousLabel()}: {formatValue(previousValue)}
            </p>
          ) : (comparisonPeriod === 'lastYear' || comparisonPeriod === 'lastQuarter') ? (
            <p className="text-xs text-gray-400 italic">
              {comparisonPeriod === 'lastYear' ? t('comparison.noDataLastYear') : t('comparison.noDataLastQuarter')}
            </p>
          ) : null}
          
          {change && (
            <div className={`flex items-center text-sm font-medium ${
              change.trend === 'up' 
                ? colorScheme === 'cost' ? 'text-rose-600' : 'text-emerald-600'
                : change.trend === 'down'
                  ? colorScheme === 'cost' ? 'text-emerald-600' : 'text-rose-600'
                  : 'text-gray-600'
            }`}>
              {getTrendIcon()}
              {Math.abs(change.value).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Optional gradient overlay for premium feel */}
        <div className={`absolute inset-0 ${
          colorScheme === 'revenue' ? 'bg-purple-50' :
          colorScheme === 'cost' ? 'bg-rose-50' :
          colorScheme === 'profit' ? 'bg-emerald-50' :
          colorScheme === 'warning' ? 'bg-amber-50' :
          'bg-blue-50'
        } opacity-5 rounded-2xl pointer-events-none`} />
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
    </>
  );
}