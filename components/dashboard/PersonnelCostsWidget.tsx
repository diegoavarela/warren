"use client";

import React from 'react';
import { UserGroupIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { HelpIcon } from '@/components/HelpIcon';
import { helpTopics } from '@/lib/help-content';

interface PersonnelCostsWidgetProps {
  data: {
    currentMonth: {
      salaries: number;
      benefits: number;
      bonuses: number;
      total: number;
    };
    previousMonth?: {
      total: number;
    };
    ytd: {
      salaries: number;
      benefits: number;
      bonuses: number;
      total: number;
    };
    headcount: {
      current: number;
      previous: number;
    };
  };
  currency: string;
  displayUnits: 'normal' | 'K' | 'M';
  locale?: string;
}

export function PersonnelCostsWidget({ 
  data, 
  currency, 
  displayUnits = 'normal',
  locale = 'es-MX' 
}: PersonnelCostsWidgetProps) {
  
  const formatValue = (value: number): string => {
    let convertedValue = value;
    let suffix = '';
    
    if (displayUnits === 'K') {
      convertedValue = value / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      convertedValue = value / 1000000;
      suffix = 'M';
    }
    
    return `${currency} ${convertedValue.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    })}${suffix}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const monthVariation = data.previousMonth 
    ? ((data.currentMonth.total - data.previousMonth.total) / data.previousMonth.total) * 100
    : 0;

  const headcountVariation = data.headcount.previous > 0
    ? ((data.headcount.current - data.headcount.previous) / data.headcount.previous) * 100
    : 0;

  const costPerEmployee = data.headcount.current > 0 
    ? data.currentMonth.total / data.headcount.current 
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {locale?.startsWith('es') ? 'Costos de Personal' : 'Personnel Costs'}
            </h3>
          </div>
          <HelpIcon topic={helpTopics['dashboard.costs']} size="sm" className="text-white hover:text-gray-200" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Total Cost with Trend */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {locale?.startsWith('es') ? 'Costo Total del Mes' : 'Total Monthly Cost'}
            </span>
            {monthVariation !== 0 && (
              <div className={`flex items-center space-x-1 ${
                monthVariation > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {monthVariation > 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{formatPercentage(monthVariation)}</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatValue(data.currentMonth.total)}</p>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {locale?.startsWith('es') ? 'Salarios' : 'Salaries'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatValue(data.currentMonth.salaries)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {locale?.startsWith('es') ? 'Beneficios' : 'Benefits'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatValue(data.currentMonth.benefits)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {locale?.startsWith('es') ? 'Bonos' : 'Bonuses'}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatValue(data.currentMonth.bonuses)}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          {/* Headcount */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Empleados' : 'Headcount'}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">{data.headcount.current}</p>
              {headcountVariation !== 0 && (
                <span className={`text-xs font-medium ${
                  headcountVariation > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(headcountVariation)}
                </span>
              )}
            </div>
          </div>

          {/* Cost per Employee */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">
              {locale?.startsWith('es') ? 'Costo por Empleado' : 'Cost per Employee'}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatValue(costPerEmployee)}
            </p>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {locale?.startsWith('es') ? 'Acumulado YTD' : 'YTD Total'}
            </span>
            <span className="text-sm font-bold text-indigo-600">
              {formatValue(data.ytd.total)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (data.currentMonth.total / (data.ytd.total / 12)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {locale?.startsWith('es') 
              ? `${Math.round((data.currentMonth.total / (data.ytd.total / 12)) * 100)}% del promedio mensual`
              : `${Math.round((data.currentMonth.total / (data.ytd.total / 12)) * 100)}% of monthly average`
            }
          </p>
        </div>
      </div>
    </div>
  );
}