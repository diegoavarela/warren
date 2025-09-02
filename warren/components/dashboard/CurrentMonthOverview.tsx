"use client";

import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/translations';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';

interface CurrentMonthData {
  month: string;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  operatingIncome: number;
  operatingMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  netIncome: number;
  netMargin: number;
  // Growth percentages
  revenueGrowth?: number | null;
  grossProfitGrowth?: number | null;
  operatingIncomeGrowth?: number | null;
  ebitdaGrowth?: number | null;
  netIncomeGrowth?: number | null;
}

interface ComparisonData {
  month: string;
}

interface CurrentMonthOverviewProps {
  data: CurrentMonthData;
  comparisonData?: ComparisonData | null;
  comparisonPeriod: 'lastMonth' | 'lastQuarter' | 'lastYear';
  currency: string;
  displayUnits: string;
  locale?: string;
  className?: string;
}

const METRIC_CONFIGS = [
  {
    key: 'revenue',
    titleKey: 'metrics.revenue.title',
    helpTopic: 'metrics.revenue',
    growthKey: 'revenueGrowth',
    showMargin: false,
  },
  {
    key: 'grossProfit',
    titleKey: 'metrics.grossProfit.title',
    helpTopic: 'metrics.grossProfit',
    growthKey: 'grossProfitGrowth',
    showMargin: true,
    marginKey: 'grossMargin',
    marginHelpTopic: 'metrics.grossMargin',
  },
  {
    key: 'operatingIncome',
    titleKey: 'metrics.operatingIncome.title',
    helpTopic: 'metrics.operatingIncome',
    growthKey: 'operatingIncomeGrowth',
    showMargin: true,
    marginKey: 'operatingMargin',
    marginHelpTopic: 'metrics.operatingMargin',
  },
  {
    key: 'ebitda',
    titleKey: 'metrics.ebitda.title',
    helpTopic: 'metrics.ebitda',
    growthKey: 'ebitdaGrowth',
    showMargin: true,
    marginKey: 'ebitdaMargin',
    marginHelpTopic: 'metrics.ebitdaMargin',
  },
  {
    key: 'netIncome',
    titleKey: 'metrics.netIncome.title',
    helpTopic: 'metrics.netIncome',
    growthKey: 'netIncomeGrowth',
    showMargin: true,
    marginKey: 'netMargin',
    marginHelpTopic: 'metrics.netMargin',
  },
];

export function CurrentMonthOverview({
  data,
  comparisonData,
  comparisonPeriod,
  currency,
  displayUnits,
  locale = 'es-MX',
  className = ''
}: CurrentMonthOverviewProps) {
  const { t } = useTranslation(locale);

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    let displayValue = absValue;
    let suffix = '';

    if (displayUnits === 'thousands') {
      displayValue = absValue / 1000;
      suffix = 'K';
    } else if (displayUnits === 'millions') {
      displayValue = absValue / 1000000;
      suffix = 'M';
    }

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: displayValue >= 1000 ? 0 : 1,
      maximumFractionDigits: displayValue >= 1000 ? 0 : 1,
    }).format(displayValue);

    return `${currency} ${formatted}${suffix}`;
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0%';
    }
    if (Math.abs(value) >= 10) {
      return `${value.toFixed(0)}%`;
    }
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined) return <MinusIcon className="h-4 w-4 text-gray-400" />;
    if (growth > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    return <MinusIcon className="h-4 w-4 text-gray-400" />;
  };

  const getGrowthColor = (growth: number | null | undefined): string => {
    if (growth === null || growth === undefined) return 'text-gray-400';
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const getGrowthText = (growth: number | null | undefined): string => {
    if (growth === null || growth === undefined) return t('growth.noData');
    return formatPercentage(growth);
  };

  const getComparisonPeriodLabel = (): string => {
    switch (comparisonPeriod) {
      case 'lastMonth':
        return t('comparison.lastMonth.short');
      case 'lastQuarter':
        return t('comparison.lastQuarter.short');
      case 'lastYear':
        return t('comparison.lastYear.short');
      default:
        return t('comparison.lastMonth.short');
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
{t('currentMonth.overview.title').replace('{month}', data.month)}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('currentMonth.overview.subtitle')}
          </p>
        </div>
        <HelpIcon topic={helpTopics['dashboard.currentMonth']} />
      </div>

      {/* Metrics Grid */}
      <div className="space-y-6">
        {METRIC_CONFIGS.map((config) => {
          const value = data[config.key as keyof CurrentMonthData] as number || 0;
          const growth = data[config.growthKey as keyof CurrentMonthData] as number | null | undefined;
          const margin = config.showMargin && config.marginKey 
            ? data[config.marginKey as keyof CurrentMonthData] as number | null | undefined
            : null;

          return (
            <div key={config.key} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
              {/* Metric Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">
                    {t(config.titleKey)}
                  </h3>
                  <HelpIcon topic={helpTopics[config.helpTopic]} size="sm" />
                </div>
                <div className="flex items-center space-x-2">
                  {getGrowthIcon(growth)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth)}`}>
                    {getGrowthText(growth)}
                  </span>
                </div>
              </div>

              {/* Metric Value */}
              <div className="mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(value)}
                </span>
              </div>

              {/* Growth Details and Margin */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  {growth !== null && growth !== undefined && (
                    <span>
{t('growth.vsComparison')
                        .replace('{period}', getComparisonPeriodLabel())
                        .replace('{comparison}', comparisonData?.month || t('growth.previousPeriod'))}
                    </span>
                  )}
                </div>
                {config.showMargin && margin !== null && margin !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600">{formatPercentage(margin)}</span>
                    {config.marginHelpTopic && (
                      <HelpIcon topic={helpTopics[config.marginHelpTopic]} size="sm" />
                    )}
                    <span className="text-gray-500 text-xs">({t('metrics.ofSales')})</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}