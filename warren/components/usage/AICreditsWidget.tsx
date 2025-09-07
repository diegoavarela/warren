"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { useLocaleText } from '@/hooks/useLocaleText';
import { cn } from '@/lib/utils';

interface AICreditsWidgetProps {
  balance: number;
  used: number;
  monthly: number;
  resetDate?: Date | null;
  recentUsage?: {
    today: number;
    thisWeek: number;
    averagePerQuery: number;
    totalQueries: number;
  };
  estimatedDaysRemaining?: number | null;
  className?: string;
  showDetails?: boolean;
  onUpgrade?: () => void;
}

export function AICreditsWidget({
  balance,
  used,
  monthly,
  resetDate,
  recentUsage,
  estimatedDaysRemaining,
  className,
  showDetails = true,
  onUpgrade,
}: AICreditsWidgetProps) {
  const { t, currentLocale } = useLocaleText();
  
  const percentage = monthly > 0 ? Math.round((balance / monthly) * 100) : 0;
  const isLow = percentage <= 20;
  const isExhausted = balance <= 0;
  const isNearEmpty = percentage <= 10;
  
  // Format currency based on locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: currentLocale?.startsWith('es') ? 'EUR' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format date based on locale
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(currentLocale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Calculate days until reset
  const getDaysUntilReset = () => {
    if (!resetDate) return null;
    const today = new Date();
    const reset = new Date(resetDate);
    const diffTime = reset.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };
  
  const daysUntilReset = getDaysUntilReset();
  
  // Get status color and icon
  const getStatusElements = () => {
    if (isExhausted) {
      return {
        color: 'red',
        bgColor: 'bg-red-500',
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        badgeVariant: 'destructive' as const,
        statusText: t("Exhausted", "Agotado"),
      };
    }
    if (isNearEmpty) {
      return {
        color: 'red',
        bgColor: 'bg-red-400',
        icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
        badgeVariant: 'destructive' as const,
        statusText: t("Critical", "Crítico"),
      };
    }
    if (isLow) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-500',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        badgeVariant: 'warning' as const,
        statusText: t("Low", "Bajo"),
      };
    }
    return {
      color: 'green',
      bgColor: 'bg-green-500',
      icon: <Brain className="h-4 w-4 text-green-500" />,
      badgeVariant: 'success' as const,
      statusText: t("Available", "Disponible"),
    };
  };
  
  const status = getStatusElements();

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-500" />
            <span>{t("AI Credits This Month", "Créditos de IA Este Mes")}</span>
          </CardTitle>
          {status.icon}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Balance Display */}
        <div className="space-y-3">
          {/* Balance Numbers */}
          <div className="flex justify-between items-baseline">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(balance)}
              </div>
              <div className="text-sm text-gray-500">
                {t("remaining", "restante")}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-lg font-semibold text-gray-700">
                {formatCurrency(monthly)}
              </div>
              <div className="text-sm text-gray-500">
                {t("monthly", "mensual")}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Progress value={percentage} className="h-3 bg-gray-200" />
              <div 
                className={cn(
                  "absolute inset-0 h-3 rounded-full transition-all",
                  status.bgColor
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">
                {percentage}% {t("remaining", "restante")}
              </span>
              <Badge variant={status.badgeVariant} className="text-xs">
                {status.statusText}
              </Badge>
            </div>
          </div>
        </div>

        {/* Usage Details */}
        {showDetails && recentUsage && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>{t("Recent Usage", "Uso Reciente")}</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-gray-500">{t("Today", "Hoy")}</div>
                <div className="font-medium">
                  {formatCurrency(recentUsage.today)}
                  {recentUsage.totalQueries > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({recentUsage.totalQueries} {t("queries", "consultas")})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-gray-500">{t("This week", "Esta semana")}</div>
                <div className="font-medium">{formatCurrency(recentUsage.thisWeek)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-gray-500">{t("Avg per query", "Promedio por consulta")}</div>
                <div className="font-medium">{formatCurrency(recentUsage.averagePerQuery)}</div>
              </div>
              
              {estimatedDaysRemaining !== null && (
                <div className="space-y-1">
                  <div className="text-gray-500">{t("Est. days left", "Días estimados")}</div>
                  <div className={cn(
                    "font-medium",
                    estimatedDaysRemaining <= 3 && "text-red-600",
                    estimatedDaysRemaining <= 7 && estimatedDaysRemaining > 3 && "text-yellow-600"
                  )}>
                    {estimatedDaysRemaining === 0 
                      ? t("< 1 day", "< 1 día")
                      : t(`~${estimatedDaysRemaining} days`, `~${estimatedDaysRemaining} días`)
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reset Information */}
        {daysUntilReset !== null && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>
                  {daysUntilReset === 0 
                    ? t("Resets today", "Se reinicia hoy")
                    : daysUntilReset === 1
                      ? t("Resets tomorrow", "Se reinicia mañana")
                      : t(`Resets in ${daysUntilReset} days`, `Se reinicia en ${daysUntilReset} días`)
                  }
                </span>
              </div>
              {resetDate && (
                <span className="text-xs text-gray-400">
                  {formatDate(resetDate)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(isExhausted || isLow) && onUpgrade && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={onUpgrade}
              className={cn(
                "w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isExhausted 
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              )}
            >
              {isExhausted 
                ? t("Upgrade for more AI credits", "Actualiza para más créditos")
                : t("Consider upgrading", "Considera actualizar")
              }
            </button>
          </div>
        )}

        {/* Usage Estimate Preview */}
        {!isExhausted && balance > 0 && (
          <div className="text-xs text-center text-gray-400 pt-2 border-t border-gray-50">
            {t(
              `Estimated cost per query: ${formatCurrency(0.15)}`,
              `Costo estimado por consulta: ${formatCurrency(0.15)}`
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AICreditsWidget;