"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useLocaleText } from '@/hooks/useLocaleText';
import { cn } from '@/lib/utils';

interface UserLimitIndicatorProps {
  current: number;
  max: number;
  className?: string;
  compact?: boolean;
  showUpgradePrompt?: boolean;
  onUpgrade?: () => void;
}

export function UserLimitIndicator({
  current,
  max,
  className,
  compact = false,
  showUpgradePrompt = true,
  onUpgrade,
}: UserLimitIndicatorProps) {
  const { t } = useLocaleText();
  
  const remaining = Math.max(0, max - current);
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const isAtLimit = current >= max;
  const isNearLimit = percentage >= 80;
  
  // Determine color scheme based on usage
  const getStatusColor = () => {
    if (isAtLimit) return 'red';
    if (isNearLimit) return 'yellow';
    return 'green';
  };
  
  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getIcon = () => {
    if (isAtLimit) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isNearLimit) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">
            {t(
              `${current} of ${max} users`,
              `${current} de ${max} usuarios`
            )}
          </span>
        </div>
        
        <div className="flex-1 max-w-[120px]">
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
        
        <Badge 
          variant={isAtLimit ? "destructive" : isNearLimit ? "outline" : "default"}
          className="text-xs"
        >
          {remaining === 0 
            ? t("At limit", "En el límite")
            : t(`${remaining} left`, `${remaining} disponibles`)
          }
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t("User Capacity", "Capacidad de Usuarios")}
            </h3>
          </div>
          {getIcon()}
        </div>

        {/* Progress Section */}
        <div className="space-y-3">
          {/* Numbers */}
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {current}
            </span>
            <span className="text-sm text-gray-500">
              {t(
                `of ${max} users`,
                `de ${max} usuarios`
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Progress value={percentage} className="h-3" />
              <div 
                className={cn(
                  "absolute inset-0 h-3 rounded-full transition-all",
                  getProgressColor()
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {/* Percentage and Status */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">
                {percentage}% {t("used", "utilizado")}
              </span>
              <Badge 
                variant={isAtLimit ? "destructive" : isNearLimit ? "outline" : "default"}
                className="text-xs"
              >
                {isAtLimit 
                  ? t("Limit reached", "Límite alcanzado")
                  : isNearLimit 
                    ? t("Near limit", "Cerca del límite")
                    : t("Available", "Disponible")
                }
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {isAtLimit ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-red-600 font-medium">
                {t(
                  "You've reached your user limit",
                  "Has alcanzado tu límite de usuarios"
                )}
              </p>
              {showUpgradePrompt && (
                <button
                  onClick={onUpgrade}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  {t("Upgrade to add more users", "Actualiza para agregar más usuarios")}
                </button>
              )}
            </div>
          ) : isNearLimit ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-yellow-600 font-medium">
                {remaining === 1 
                  ? t("1 user slot remaining", "1 espacio disponible")
                  : t(`${remaining} user slots remaining`, `${remaining} espacios disponibles`)
                }
              </p>
              {showUpgradePrompt && (
                <button
                  onClick={onUpgrade}
                  className="text-xs text-yellow-600 hover:text-yellow-800 underline"
                >
                  {t("Consider upgrading", "Considera actualizar")}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-green-600">
                {t(
                  `${remaining} users available`,
                  `${remaining} usuarios disponibles`
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default UserLimitIndicator;