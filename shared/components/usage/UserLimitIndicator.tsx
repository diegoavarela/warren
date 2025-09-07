"use client";

import { Card, CardBody } from '@/shared/components/ui/Card';
import { UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UserLimitIndicatorProps {
  current: number;
  max: number;
  className?: string;
  getText?: (key: string, replacements?: Record<string, string | number>) => string;
}

export function UserLimitIndicator({ 
  current, 
  max, 
  className = "",
  getText = (key: string) => key // Default fallback
}: UserLimitIndicatorProps) {
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const remaining = Math.max(0, max - current);
  const isAtLimit = current >= max;
  const isNearLimit = percentage >= 80;

  // Color logic
  let statusColor = 'text-green-600';
  let bgColor = 'bg-green-50';
  let progressColor = 'bg-green-500';
  let borderColor = 'border-green-200';

  if (isAtLimit) {
    statusColor = 'text-red-600';
    bgColor = 'bg-red-50';
    progressColor = 'bg-red-500';
    borderColor = 'border-red-200';
  } else if (isNearLimit) {
    statusColor = 'text-yellow-600';
    bgColor = 'bg-yellow-50';
    progressColor = 'bg-yellow-500';
    borderColor = 'border-yellow-200';
  }

  return (
    <Card className={`${bgColor} ${borderColor} border ${className}`}>
      <CardBody className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className={`p-1 rounded ${bgColor} mr-3`}>
              <UsersIcon className={`h-4 w-4 ${statusColor}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {getText('usage.user_capacity')}
              </h3>
              <p className="text-xs text-gray-600">
                {getText('usage.users_of_max', { current: current.toString(), max: max.toString() })}
              </p>
            </div>
          </div>
          {isAtLimit && (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
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
            <span>{remaining} {getText('usage.users_remaining')}</span>
            <span className={`font-medium ${
              isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-700'
            }`}>{percentage}%</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}