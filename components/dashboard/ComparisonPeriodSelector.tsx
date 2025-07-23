"use client";

import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/translations';

type ComparisonPeriod = 'lastMonth' | 'lastQuarter' | 'lastYear';

interface ComparisonPeriodSelectorProps {
  selectedPeriod: ComparisonPeriod;
  onPeriodChange: (period: ComparisonPeriod) => void;
  locale?: string;
  className?: string;
}

const COMPARISON_PERIODS: Array<{
  value: ComparisonPeriod;
  labelKey: string;
  shortLabelKey: string;
}> = [
  { value: 'lastMonth', labelKey: 'comparison.lastMonth', shortLabelKey: 'comparison.lastMonth.short' },
  { value: 'lastQuarter', labelKey: 'comparison.lastQuarter', shortLabelKey: 'comparison.lastQuarter.short' },
  { value: 'lastYear', labelKey: 'comparison.lastYear', shortLabelKey: 'comparison.lastYear.short' },
];

export function ComparisonPeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  locale = 'es-MX',
  className = '' 
}: ComparisonPeriodSelectorProps) {
  const { t } = useTranslation(locale);

  const selectedOption = COMPARISON_PERIODS.find(p => p.value === selectedPeriod);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('comparison.title')}
      </label>
      <div className="relative">
        <select
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value as ComparisonPeriod)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors duration-200 min-w-[140px]"
        >
          {COMPARISON_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {t(period.labelKey)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {selectedOption && (
        <p className="mt-1 text-xs text-gray-500">
{t('comparison.description').replace('{period}', t(selectedOption.shortLabelKey))}
        </p>
      )}
    </div>
  );
}