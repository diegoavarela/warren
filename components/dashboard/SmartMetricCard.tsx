/**
 * Smart Metric Card Component
 * 
 * Updated MetricCard that uses the Smart Units system for consistent formatting.
 * Replaces complex individual formatting logic with centralized, intelligent
 * units management.
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import { InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { HelpTopic } from '../HelpModal';
import { useDashboardFormatter } from './SmartDashboardProvider';
import { unifiedFormatter } from '@/lib/services/unified-formatter';
import { SmartLayoutDetector, LayoutMetrics } from '@/lib/utils/smart-layout-detector';

interface BreakdownItem {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface SmartMetricCardProps {
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
  className?: string;
}

export function SmartMetricCard({
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
  onClick,
  expandedContent,
  colorScheme = 'neutral',
  locale,
  helpTopic,
  helpContext,
  comparisonPeriod,
  previousPeriodLabel,
  className = ''
}: SmartMetricCardProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const { formatCurrency, formatWithFallback, currentUnits, isAutoScaled } = useDashboardFormatter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formattedValues, setFormattedValues] = useState<{
    current: any;
    previous?: any;
    ytd?: any;
  }>({
    current: null
  });
  const [layoutMetrics, setLayoutMetrics] = useState<LayoutMetrics | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Format all values using the smart formatter
  useEffect(() => {
    const formatValues = () => {
      let currentFormatted: any;
      let previousFormatted: any;
      let ytdFormatted: any;

      try {
        // Format based on the specified format type
        switch (format) {
          case 'currency':
            currentFormatted = formatCurrency(currentValue, currency);
            if (previousValue !== undefined) {
              previousFormatted = formatCurrency(previousValue, currency);
            }
            if (ytdValue !== undefined) {
              ytdFormatted = formatCurrency(ytdValue, currency);
            }
            break;

          case 'percentage':
            currentFormatted = unifiedFormatter.formatPercentage(currentValue / 100, {
              currency,
              originalCurrency,
              locale: locale || contextLocale
            });
            if (previousValue !== undefined) {
              previousFormatted = unifiedFormatter.formatPercentage(previousValue / 100, {
                currency,
                originalCurrency,
                locale: locale || contextLocale
              });
            }
            if (ytdValue !== undefined) {
              ytdFormatted = unifiedFormatter.formatPercentage(ytdValue / 100, {
                currency,
                originalCurrency,
                locale: locale || contextLocale
              });
            }
            break;

          case 'number':
            currentFormatted = unifiedFormatter.formatDecimal(currentValue, currentUnits, {
              currency,
              originalCurrency,
              locale: locale || contextLocale
            });
            if (previousValue !== undefined) {
              previousFormatted = unifiedFormatter.formatDecimal(previousValue, currentUnits, {
                currency,
                originalCurrency,
                locale: locale || contextLocale
              });
            }
            if (ytdValue !== undefined) {
              ytdFormatted = unifiedFormatter.formatDecimal(ytdValue, currentUnits, {
                currency,
                originalCurrency,
                locale: locale || contextLocale
              });
            }
            break;

          default:
            currentFormatted = formatWithFallback(currentValue, currency);
            if (previousValue !== undefined) {
              previousFormatted = formatWithFallback(previousValue, currency);
            }
            if (ytdValue !== undefined) {
              ytdFormatted = formatWithFallback(ytdValue, currency);
            }
        }

        setFormattedValues({
          current: currentFormatted,
          previous: previousFormatted,
          ytd: ytdFormatted
        });
      } catch (error) {
        console.error('Error formatting metric card values:', error);
        // Fallback formatting
        setFormattedValues({
          current: { formatted: currentValue.toLocaleString(), isOverflow: false, warnings: ['Formatting error'] },
          previous: previousValue ? { formatted: previousValue.toLocaleString(), isOverflow: false } : undefined,
          ytd: ytdValue ? { formatted: ytdValue.toLocaleString(), isOverflow: false } : undefined
        });
      }
    };

    formatValues();
  }, [currentValue, previousValue, ytdValue, format, currency, originalCurrency, locale, contextLocale, formatCurrency, formatWithFallback, currentUnits]);

  // Smart layout monitoring
  useEffect(() => {
    if (!cardRef.current || !formattedValues.current?.formatted) return;
    
    const monitor = SmartLayoutDetector.createLayoutMonitor();
    if (!monitor) return;
    
    const cleanup = monitor.observe(cardRef.current, (metrics) => {
      setLayoutMetrics(metrics);
    });
    
    return cleanup;
  }, [formattedValues.current?.formatted, currentValue]);

  // Calculate trend data
  const changePercent = previousValue && previousValue !== 0 
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 
    : 0;

  const effectiveTrend = trend || (changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral');

  // Color scheme mapping
  const colorClasses = {
    revenue: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      text: 'text-emerald-600',
      sparkle: 'text-emerald-400',
      border: 'border-emerald-200'
    },
    cost: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      text: 'text-red-600',
      sparkle: 'text-red-400',
      border: 'border-red-200'
    },
    profit: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      text: 'text-purple-600',
      sparkle: 'text-purple-400',
      border: 'border-purple-200'
    },
    warning: {
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      text: 'text-yellow-600',
      sparkle: 'text-yellow-400',
      border: 'border-yellow-200'
    },
    neutral: {
      bg: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      text: 'text-gray-600',
      sparkle: 'text-gray-400',
      border: 'border-gray-200'
    }
  };

  const colors = colorClasses[colorScheme];
  const isClickable = onClick || expandedContent;

  // Handle potential overflow and layout issues
  const hasOverflow = formattedValues.current?.isOverflow || layoutMetrics?.textOverflow;
  const showWarning = hasOverflow || (formattedValues.current?.warnings?.length > 0) || (layoutMetrics?.readabilityScore && layoutMetrics.readabilityScore < 0.7);
  const isLayoutOptimized = layoutMetrics?.readabilityScore && layoutMetrics.readabilityScore > 0.8;

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white rounded-xl border-2 ${colors.border} shadow-sm hover:shadow-md transition-all duration-200 
        ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''} 
        ${isLayoutOptimized ? 'ring-1 ring-green-200' : ''}
        ${className}
      `}
      onClick={isClickable ? () => {
        if (onClick) {
          onClick();
        } else {
          setIsExpanded(!isExpanded);
        }
      } : undefined}
    >
      {/* Smart indicators */}
      <div className="absolute -top-1 -right-1 flex gap-1">
        {isAutoScaled && (
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" 
               title={t('units.autoScaled')} />
        )}
        {isLayoutOptimized && (
          <div className="w-3 h-3 bg-green-500 rounded-full" 
               title={t('layout.optimized')} />
        )}
        {showWarning && (
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" 
               title={layoutMetrics?.layoutAdjustments?.join(', ') || 'Layout may need adjustment'} />
        )}
      </div>

      <div className={`${colors.bg} p-6`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                {title}
              </h3>
              {helpTopic && (
                <HelpIcon 
                  topic={helpTopic} 
                  className="text-gray-400 hover:text-gray-600"
                />
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          {icon && (
            <div className={`${colors.iconBg} p-2 rounded-lg`}>
              {React.cloneElement(icon as React.ReactElement, {
                className: `w-6 h-6 ${colors.text}`
              })}
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span 
              className={`text-2xl font-bold ${colors.text} ${hasOverflow ? 'text-lg' : ''}`}
              title={formattedValues.current?.fullValue || formattedValues.current?.formatted}
            >
              {formattedValues.current?.formatted || '—'}
            </span>
            {showWarning && (
              <InformationCircleIcon 
                className="w-4 h-4 text-yellow-500" 
                title={formattedValues.current?.warnings?.join(', ') || 'Display adjusted for card layout'}
              />
            )}
          </div>

          {/* Trend Indicator */}
          {previousValue !== undefined && formattedValues.previous && (
            <div className="flex items-center gap-2 mt-2">
              {effectiveTrend === 'up' && (
                <ArrowUpIcon className="w-4 h-4 text-green-500" />
              )}
              {effectiveTrend === 'down' && (
                <ArrowDownIcon className="w-4 h-4 text-red-500" />
              )}
              {effectiveTrend === 'neutral' && (
                <MinusIcon className="w-4 h-4 text-gray-400" />
              )}
              
              <span className={`text-xs font-medium ${
                effectiveTrend === 'up' ? 'text-green-600' : 
                effectiveTrend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {Math.abs(changePercent).toFixed(1)}%
              </span>
              
              <span className="text-xs text-gray-500">
                {previousPeriodLabel || t('metric.vs.previous')}
              </span>
            </div>
          )}

          {/* YTD Value */}
          {ytdValue !== undefined && formattedValues.ytd && (
            <div className="text-xs text-gray-600 mt-1">
              <span>{t('metric.ytd')}: </span>
              <span className="font-medium" title={formattedValues.ytd.fullValue}>
                {formattedValues.ytd.formatted}
              </span>
            </div>
          )}
        </div>

        {/* Breakdown */}
        {showBreakdown && breakdownData && breakdownData.length > 0 && (
          <div className="mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              <span>{t('metric.breakdown')}</span>
              {isExpanded ? (
                <ChevronUpIcon className="w-3 h-3" />
              ) : (
                <ChevronDownIcon className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {(isExpanded && (breakdownData || expandedContent)) && (
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
          {breakdownData && (
            <div className="space-y-2">
              {breakdownData.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format === 'currency' 
                        ? formatCurrency(item.value, currency).formatted
                        : item.value.toLocaleString()
                      }
                    </span>
                    {item.percentage !== undefined && (
                      <span className="text-xs text-gray-500">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {expandedContent}
        </div>
      )}
    </div>
  );
}