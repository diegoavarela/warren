import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
  currency?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500'
};

export function KPICard({
  title,
  value,
  previousValue,
  icon,
  trend,
  changePercent,
  currency = '',
  color = 'blue'
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
          {icon || (
            <div className={`w-6 h-6 ${colorClasses[color]} rounded`} />
          )}
        </div>
        {trend && changePercent !== undefined && (
          <div className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : trend === 'down' ? (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            ) : null}
            {Math.abs(changePercent)}%
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-gray-900">
          {currency && <span className="text-lg">{currency} </span>}
          {formatValue(value)}
        </span>
      </div>
      
      {previousValue !== undefined && (
        <p className="text-xs text-gray-500 mt-2">
          Periodo anterior: {currency} {formatValue(previousValue)}
        </p>
      )}
    </div>
  );
}