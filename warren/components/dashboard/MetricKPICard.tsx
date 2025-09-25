import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface MetricKPICardProps {
  title: string;
  value: number;
  currency?: string;
  locale?: string;

  // Margin information (displayed below main value)
  margin?: number; // percentage

  // Breakdown information (displayed below main value)
  breakdown?: Array<{
    label: string;
    value: number;
  }>;

  // Comparison data
  previousValue?: number;
  previousPeriod?: string; // e.g., "Jul 2025"
  growthPercent?: number;

  // Special formatting
  isPercentage?: boolean; // for COGS%, OPEX% cards
  suffix?: string; // for period counts like "8 months"
  headerColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red'; // Header background color
}

export function MetricKPICard({
  title,
  value,
  currency = '',
  locale = 'es-MX',
  margin,
  breakdown,
  previousValue,
  previousPeriod,
  growthPercent,
  isPercentage = false,
  suffix
}: MetricKPICardProps) {
  // Format large numbers
  const formatValue = (val: number): string => {
    if (isPercentage) {
      return `${val.toFixed(1)}%`;
    }

    if (Math.abs(val) >= 1000000) {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(val);
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatPreviousValue = (val: number): string => {
    if (isPercentage) {
      return `${val.toFixed(1)}%`;
    }
    return formatValue(val);
  };

  const isPositiveGrowth = (growthPercent || 0) >= 0;
  const growthColor = isPositiveGrowth ? 'text-green-600' : 'text-red-600';
  const GrowthIcon = isPositiveGrowth ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* Card Content */}
      <div className="p-4">

      {/* Title */}
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
        {title}
      </h3>

      {/* Main Value */}
      <div className="flex items-baseline mb-1">
        <span className="text-2xl font-bold text-gray-900">
          {currency && !isPercentage && (
            <span className="text-lg font-medium text-gray-600 mr-1">{currency} </span>
          )}
          {formatValue(value)}
        </span>
        {suffix && (
          <span className="text-sm text-gray-500 ml-2">{suffix}</span>
        )}
      </div>

      {/* Margin (if provided) */}
      {margin !== undefined && (
        <div className="mb-3">
          <span className="text-sm text-gray-600">
            Margin: {margin.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Breakdown (if provided) */}
      {breakdown && breakdown.length > 0 && (
        <div className="mb-3 space-y-1">
          {breakdown.map((item, index) => (
            <div key={index} className="text-xs text-gray-600 pl-2 border-l-2 border-gray-200">
              {item.label}: {currency && !isPercentage ? currency + ' ' : ''}{formatValue(item.value)}
            </div>
          ))}
        </div>
      )}

      {/* Bottom row: Previous period and growth */}
      <div className="flex items-center justify-between mt-4">
        {/* Previous period value */}
        {previousValue !== undefined && previousPeriod && (
          <div className="text-xs text-gray-500">
            {previousPeriod}: {currency && !isPercentage ? currency + ' ' : ''}{formatPreviousValue(previousValue)}
          </div>
        )}

        {/* Growth percentage */}
        {growthPercent !== undefined && (
          <div className={`flex items-center text-sm font-medium ${growthColor}`}>
            <GrowthIcon className="w-4 h-4 mr-1" />
            {Math.abs(growthPercent).toFixed(1)}%
          </div>
        )}
      </div>
      </div> {/* Close card content */}
    </div>
  );
}