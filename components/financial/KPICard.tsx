"use client";

import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  currency?: string;
  format?: 'currency' | 'percentage' | 'number';
  growth?: number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  icon?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  currency = 'MXN',
  format = 'currency',
  growth,
  subtitle,
  color = 'blue',
  icon
}: KPICardProps) {
  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: Math.abs(value) >= 1000000 ? 'compact' : 'standard',
        compactDisplay: 'short'
      }).format(value);
    } else if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    } else {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: Math.abs(value) >= 1000000 ? 'compact' : 'standard',
        compactDisplay: 'short'
      }).format(value);
    }
  };

  const getGrowthIcon = () => {
    if (growth === undefined || growth === null) return null;
    
    if (growth > 0) {
      return <TrendingUpIcon className="w-4 h-4" />;
    } else if (growth < 0) {
      return <TrendingDownIcon className="w-4 h-4" />;
    } else {
      return <MinusIcon className="w-4 h-4" />;
    }
  };

  const getGrowthColor = () => {
    if (growth === undefined || growth === null) return 'text-gray-500';
    
    if (growth > 0) {
      return 'text-green-600';
    } else if (growth < 0) {
      return 'text-red-600';
    } else {
      return 'text-gray-500';
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-50 border-blue-100',
      green: 'bg-green-50 border-green-100',
      purple: 'bg-purple-50 border-purple-100',
      orange: 'bg-orange-50 border-orange-100',
      red: 'bg-red-50 border-red-100'
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClasses = () => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      red: 'text-red-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`rounded-xl border p-6 transition-all hover:shadow-md ${getColorClasses()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {icon && (
              <span className={`${getIconColorClasses()}`}>
                {icon}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {formatValue()}
            </h3>
            
            {growth !== undefined && growth !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium ${getGrowthColor()}`}>
                {getGrowthIcon()}
                <span>{Math.abs(growth).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}