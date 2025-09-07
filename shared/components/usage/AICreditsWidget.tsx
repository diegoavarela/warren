"use client";

import { useState } from 'react';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { 
  CpuChipIcon, 
  ExclamationTriangleIcon, 
  ChevronDownIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';

interface AICreditsWidgetProps {
  balance: number;
  monthly: number;
  used?: number;
  resetDate?: string | null;
  recentUsage?: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalQueries: number;
    averagePerQuery: number;
  };
  estimatedDaysRemaining?: number | null;
  companiesCount?: number;
  className?: string;
  getText?: (key: string, replacements?: Record<string, string | number>) => string;
  currentLocale?: string;
}

export function AICreditsWidget({ 
  balance,
  monthly,
  used = 0,
  resetDate,
  recentUsage,
  estimatedDaysRemaining,
  companiesCount,
  className = "",
  getText = (key: string) => key, // Default fallback
  currentLocale = 'en-US'
}: AICreditsWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);

  const percentage = monthly > 0 ? Math.round((used / monthly) * 100) : 0;
  const isLowBalance = balance < (monthly * 0.2); // Less than 20% remaining
  const isCriticalBalance = balance < (monthly * 0.1); // Less than 10% remaining

  // Color logic
  let statusColor = 'text-blue-600';
  let bgColor = 'bg-blue-50';
  let progressColor = 'bg-blue-500';
  let borderColor = 'border-blue-200';

  if (isCriticalBalance) {
    statusColor = 'text-red-600';
    bgColor = 'bg-red-50';
    progressColor = 'bg-red-500';
    borderColor = 'border-red-200';
  } else if (isLowBalance) {
    statusColor = 'text-yellow-600';
    bgColor = 'bg-yellow-50';
    progressColor = 'bg-yellow-500';
    borderColor = 'border-yellow-200';
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return getText('usage.no_reset_date');
    
    return new Intl.DateTimeFormat(currentLocale, {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <Card className={`${bgColor} ${borderColor} border ${className}`}>
      <CardBody className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className={`p-1 rounded ${bgColor} mr-3`}>
              <CpuChipIcon className={`h-4 w-4 ${statusColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {getText('usage.ai_credits')}
              </h3>
              <p className="text-xs text-gray-600">
                {balance > 0 
                  ? `${formatCurrency(balance)} ${getText('usage.remaining')}`
                  : `${formatCurrency(monthly)} ${getText('usage.monthly_allowance')}`
                }
              </p>
            </div>
          </div>
          {(isLowBalance || isCriticalBalance) && (
            <ExclamationTriangleIcon className={`h-5 w-5 ${isCriticalBalance ? 'text-red-500' : 'text-yellow-500'}`} />
          )}
        </div>

        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>{formatCurrency(used)} {getText('usage.used')}</span>
            <span className={`font-medium ${
              isCriticalBalance ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-gray-700'
            }`}>{percentage}%</span>
          </div>
          
          {resetDate && (
            <div className="text-xs text-gray-500 mt-1">
              {getText('usage.next_reset')}: {formatDate(resetDate)}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}