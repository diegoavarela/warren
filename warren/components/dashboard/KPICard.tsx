import React, { memo } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
  currency?: string;
  color?: 'emerald' | 'rose' | 'purple' | 'orange' | 'blue';
  subtitle?: string;
  sparkle?: boolean;
  large?: boolean;
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    text: 'text-emerald-600',
    sparkle: 'text-emerald-400',
    border: 'border-emerald-200'
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    text: 'text-rose-600',
    sparkle: 'text-rose-400',
    border: 'border-rose-200'
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    text: 'text-purple-600',
    sparkle: 'text-purple-400',
    border: 'border-purple-200'
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    text: 'text-orange-600',
    sparkle: 'text-orange-400',
    border: 'border-orange-200'
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    text: 'text-blue-600',
    sparkle: 'text-blue-400',
    border: 'border-blue-200'
  }
};

const KPICardComponent = function KPICard({
  title,
  value,
  previousValue,
  icon,
  trend,
  changePercent,
  currency = '',
  color = 'blue',
  subtitle,
  sparkle = true,
  large = false
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val);
    }
    return val;
  };

  const colors = colorClasses[color];

  return (
    <div className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border ${colors.border} ${
      large ? 'p-8' : 'p-6'
    }`}>
      {/* Header with icon and sparkle */}
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors.iconBg} p-2 rounded-xl shadow-sm`}>
          <div className={colors.text}>
            {icon || <div className="w-6 h-6 bg-current rounded opacity-20" />}
          </div>
        </div>
        {sparkle && (
          <SparklesIcon className={`h-5 w-5 ${colors.sparkle} animate-pulse`} />
        )}
      </div>
      
      {/* Title */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 leading-tight">
        {title}
      </h3>
      
      {/* Main Value */}
      <div className="flex items-baseline mb-2">
        <span className={`${large ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900`}>
          {currency && <span className="text-lg font-medium text-gray-600">{currency} </span>}
          {formatValue(value)}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-2">{subtitle}</p>
      )}
      
      {/* Trend and Previous Value */}
      <div className="flex items-center justify-between">
        {previousValue !== undefined && (
          <p className="text-xs text-gray-500">
            Anterior: {currency} {formatValue(previousValue)}
          </p>
        )}
        
        {trend && changePercent !== undefined && (
          <div className={`flex items-center text-sm font-medium ${
            trend === 'up' 
              ? 'text-emerald-600' 
              : trend === 'down' 
                ? 'text-rose-600' 
                : 'text-gray-600'
          }`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : trend === 'down' ? (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            ) : null}
            {Math.abs(changePercent).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Optional gradient overlay for premium feel */}
      <div className={`absolute inset-0 ${colors.bg} opacity-5 rounded-2xl pointer-events-none`} />
    </div>
  );
};

// Memoized export for performance optimization
export const KPICard = memo(KPICardComponent);

// Also export as default for compatibility
export default KPICard;