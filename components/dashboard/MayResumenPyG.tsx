import React from 'react';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalculatorIcon,
  ScaleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface MayResumenPyGProps {
  currentMonth: any;
  previousMonth?: any;
}

export function MayResumenPyG({ currentMonth, previousMonth }: MayResumenPyGProps) {
  const calculateGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const cards = [
    {
      title: 'Ingresos',
      value: currentMonth.revenue,
      previousValue: previousMonth?.revenue,
      growth: calculateGrowth(currentMonth.revenue, previousMonth?.revenue || 0),
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      color: 'emerald',
      percentage: null
    },
    {
      title: 'Utilidad Bruta',
      value: currentMonth.grossProfit,
      previousValue: previousMonth?.grossProfit,
      growth: calculateGrowth(currentMonth.grossProfit, previousMonth?.grossProfit || 0),
      icon: <ChartBarIcon className="h-5 w-5" />,
      color: 'blue',
      percentage: currentMonth.grossMargin
    },
    {
      title: 'Utilidad Operativa',
      value: currentMonth.operatingIncome,
      previousValue: previousMonth?.operatingIncome,
      growth: calculateGrowth(currentMonth.operatingIncome, previousMonth?.operatingIncome || 0),
      icon: <ScaleIcon className="h-5 w-5" />,
      color: 'indigo',
      percentage: currentMonth.operatingMargin
    },
    {
      title: 'EBITDA',
      value: currentMonth.ebitda,
      previousValue: previousMonth?.ebitda,
      growth: calculateGrowth(currentMonth.ebitda, previousMonth?.ebitda || 0),
      icon: <CalculatorIcon className="h-5 w-5" />,
      color: 'purple',
      percentage: currentMonth.ebitdaMargin
    },
    {
      title: 'Utilidad Neta',
      value: currentMonth.netIncome,
      previousValue: previousMonth?.netIncome,
      growth: calculateGrowth(currentMonth.netIncome, previousMonth?.netIncome || 0),
      icon: <BanknotesIcon className="h-5 w-5" />,
      color: 'pink',
      percentage: currentMonth.netMargin
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: 'bg-emerald-100 text-emerald-600',
      blue: 'bg-blue-100 text-blue-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      purple: 'bg-purple-100 text-purple-600',
      pink: 'bg-pink-100 text-pink-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">May Resumen de PyG</h2>
        <div className="text-sm text-gray-500">
          Análisis de rendimiento financiero e información
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-md ${getColorClasses(card.color)}`}>
                      {card.icon}
                    </div>
                    {card.growth !== 0 && (
                      <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                        card.growth > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {card.growth > 0 ? (
                          <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                        )}
                        <span>{Math.abs(card.growth).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  {card.percentage !== null && (
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        card.color === 'emerald' ? 'text-emerald-600' :
                        card.color === 'blue' ? 'text-blue-600' :
                        card.color === 'indigo' ? 'text-indigo-600' :
                        card.color === 'purple' ? 'text-purple-600' :
                        'text-pink-600'
                      }`}>
                        {formatPercentage(card.percentage)}
                      </div>
                      <div className="text-xs text-gray-500">de ventas</div>
                    </div>
                  )}
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {card.title}
                </h3>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(card.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}