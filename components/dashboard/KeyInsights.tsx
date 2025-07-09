"use client";

import React from 'react';
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface InsightData {
  revenue: number;
  expenses: number;
  netIncome: number;
  grossMargin: number;
  operatingMargin: number;
  cashFlow: number;
  previousMonth?: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  message: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

interface KeyInsightsProps {
  data: InsightData;
  className?: string;
}

export function KeyInsights({ data, className = '' }: KeyInsightsProps) {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Revenue Growth Analysis
    if (data.previousMonth) {
      const revenueGrowth = ((data.revenue - data.previousMonth.revenue) / data.previousMonth.revenue) * 100;
      
      if (revenueGrowth > 10) {
        insights.push({
          id: 'revenue-growth-strong',
          type: 'positive',
          title: 'Crecimiento Sólido de Ingresos',
          message: `Los ingresos aumentaron ${revenueGrowth.toFixed(1)}% respecto al mes anterior, indicando una fuerte performance comercial.`,
          icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
          priority: 'high'
        });
      } else if (revenueGrowth < -5) {
        insights.push({
          id: 'revenue-decline',
          type: 'negative',
          title: 'Declive en Ingresos',
          message: `Los ingresos disminuyeron ${Math.abs(revenueGrowth).toFixed(1)}% este mes. Revisar estrategias comerciales.`,
          icon: <ArrowTrendingDownIcon className="h-5 w-5" />,
          priority: 'high'
        });
      } else if (revenueGrowth >= 0) {
        insights.push({
          id: 'revenue-stable',
          type: 'neutral',
          title: 'Ingresos Estables',
          message: `Los ingresos se mantuvieron estables con un crecimiento del ${revenueGrowth.toFixed(1)}%.`,
          icon: <CheckCircleIcon className="h-5 w-5" />,
          priority: 'medium'
        });
      }
    }

    // Margin Analysis
    if (data.grossMargin > 50) {
      insights.push({
        id: 'strong-margins',
        type: 'positive',
        title: 'Márgenes Saludables',
        message: `El margen bruto del ${data.grossMargin.toFixed(1)}% indica una buena estructura de costos y pricing poder.`,
        icon: <CheckCircleIcon className="h-5 w-5" />,
        priority: 'medium'
      });
    } else if (data.grossMargin < 30) {
      insights.push({
        id: 'low-margins',
        type: 'warning',
        title: 'Márgenes Bajo Presión',
        message: `El margen bruto del ${data.grossMargin.toFixed(1)}% está por debajo del benchmark. Revisar estructura de costos.`,
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
        priority: 'high'
      });
    }

    // Cash Flow Analysis
    if (data.cashFlow > data.revenue * 0.15) {
      insights.push({
        id: 'strong-cashflow',
        type: 'positive',
        title: 'Excelente Generación de Efectivo',
        message: `El flujo de efectivo representa ${((data.cashFlow / data.revenue) * 100).toFixed(1)}% de los ingresos, indicando sólida gestión financiera.`,
        icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
        priority: 'medium'
      });
    } else if (data.cashFlow < 0) {
      insights.push({
        id: 'negative-cashflow',
        type: 'negative',
        title: 'Flujo de Efectivo Negativo',
        message: 'El flujo de efectivo negativo requiere atención inmediata. Revisar timing de cobros y pagos.',
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
        priority: 'high'
      });
    }

    // Expense Analysis
    if (data.previousMonth) {
      const expenseGrowth = ((data.expenses - data.previousMonth.expenses) / data.previousMonth.expenses) * 100;
      
      if (expenseGrowth > 15) {
        insights.push({
          id: 'expense-growth-high',
          type: 'warning',
          title: 'Crecimiento Acelerado de Gastos',
          message: `Los gastos aumentaron ${expenseGrowth.toFixed(1)}% este mes. Revisar control de costos operacionales.`,
          icon: <ExclamationTriangleIcon className="h-5 w-5" />,
          priority: 'medium'
        });
      } else if (expenseGrowth < 0) {
        insights.push({
          id: 'expense-reduction',
          type: 'positive',
          title: 'Optimización de Gastos',
          message: `Los gastos se redujeron ${Math.abs(expenseGrowth).toFixed(1)}%, mejorando la eficiencia operacional.`,
          icon: <CheckCircleIcon className="h-5 w-5" />,
          priority: 'low'
        });
      }
    }

    // Profitability Analysis
    if (data.operatingMargin > 20) {
      insights.push({
        id: 'high-profitability',
        type: 'positive',
        title: 'Alta Rentabilidad Operacional',
        message: `El margen operacional del ${data.operatingMargin.toFixed(1)}% demuestra excelente control operativo.`,
        icon: <SparklesIcon className="h-5 w-5" />,
        priority: 'medium'
      });
    } else if (data.operatingMargin < 5) {
      insights.push({
        id: 'low-profitability',
        type: 'warning',
        title: 'Rentabilidad Operacional Baja',
        message: `El margen operacional del ${data.operatingMargin.toFixed(1)}% necesita mejora. Revisar eficiencia operativa.`,
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
        priority: 'high'
      });
    }

    // AI-powered recommendations
    if (data.revenue > 1000000) {
      insights.push({
        id: 'scale-opportunities',
        type: 'neutral',
        title: 'Oportunidades de Escalamiento',
        message: 'Con este nivel de ingresos, considerar inversiones en automatización y expansión de capacidades.',
        icon: <LightBulbIcon className="h-5 w-5" />,
        priority: 'low'
      });
    }

    // Sort by priority
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const insights = generateInsights();

  const getInsightStyle = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          iconColor: 'text-emerald-600',
          titleColor: 'text-emerald-900',
          messageColor: 'text-emerald-700'
        };
      case 'negative':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          iconColor: 'text-rose-600',
          titleColor: 'text-rose-900',
          messageColor: 'text-rose-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-900',
          messageColor: 'text-amber-700'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
    }
  };

  if (insights.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <InformationCircleIcon className="h-6 w-6 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Observaciones Clave</h3>
        </div>
        <p className="text-gray-600">No hay observaciones disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-2 rounded-xl">
          <SparklesIcon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Observaciones Clave</h3>
        <div className="flex-1" />
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          IA Powered
        </span>
      </div>

      <div className="space-y-4">
        {insights.slice(0, 4).map((insight) => {
          const style = getInsightStyle(insight.type);
          
          return (
            <div
              key={insight.id}
              className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start space-x-3">
                <div className={`${style.iconColor} mt-0.5 flex-shrink-0`}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium ${style.titleColor}`}>
                      {insight.title}
                    </h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      insight.priority === 'high' 
                        ? 'bg-red-100 text-red-700' 
                        : insight.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <p className={`text-sm ${style.messageColor} leading-relaxed`}>
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > 4 && (
        <div className="mt-4 text-center">
          <button className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
            Ver {insights.length - 4} observaciones adicionales
          </button>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          💡 Las observaciones se generan automáticamente basadas en el análisis de tus datos financieros
        </p>
      </div>
    </div>
  );
}