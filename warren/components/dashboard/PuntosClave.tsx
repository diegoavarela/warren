import React from 'react';
import { 
  ArrowTrendingUpIcon, 
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface PuntosClaveProps {
  currentMonth: any;
  previousMonth?: any;
  yearToDate?: any;
}

export function PuntosClave({ currentMonth, previousMonth, yearToDate }: PuntosClaveProps) {
  const calculateGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentMonth.revenue, previousMonth?.revenue || 0);
  const ebitdaMargin = currentMonth.ebitdaMargin || 0;
  
  // Generate key insights based on the data
  const insights = [];

  // Revenue growth insight
  if (Math.abs(revenueGrowth) > 5) {
    insights.push({
      title: 'Crecimiento de Ingresos',
      description: `Los ingresos crecieron un ${revenueGrowth.toFixed(1)}% desde el mes anterior, desde ${(previousMonth?.revenue / 1000).toFixed(0)}K hasta ${(currentMonth.revenue / 1000).toFixed(0)}K.`,
      icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
      type: revenueGrowth > 0 ? 'positive' : 'negative'
    });
  } else {
    insights.push({
      title: 'Crecimiento de Ingresos',
      description: `Los ingresos permanecieron relativamente estables con un cambio del ${revenueGrowth.toFixed(1)}% desde el mes anterior.`,
      icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
      type: 'neutral'
    });
  }

  // EBITDA insight
  if (ebitdaMargin > 15) {
    insights.push({
      title: 'EBITDA Sólido',
      description: `El margen EBITDA de ${ebitdaMargin.toFixed(1)}% indica una eficiencia operativa sólida y una buena rentabilidad subyacente.`,
      icon: <ChartBarIcon className="h-5 w-5" />,
      type: 'positive'
    });
  } else if (ebitdaMargin > 5) {
    insights.push({
      title: 'EBITDA Moderado',
      description: `El margen EBITDA de ${ebitdaMargin.toFixed(1)}% sugiere una operación rentable pero con espacio para mejorar la eficiencia.`,
      icon: <ChartBarIcon className="h-5 w-5" />,
      type: 'neutral'
    });
  } else {
    insights.push({
      title: 'EBITDA Bajo',
      description: `El margen EBITDA de ${ebitdaMargin.toFixed(1)}% indica la necesidad de revisar los costos operativos y mejorar la eficiencia.`,
      icon: <ExclamationTriangleIcon className="h-5 w-5" />,
      type: 'negative'
    });
  }

  // Additional insights based on margins
  const grossMargin = currentMonth.grossMargin || 0;
  if (grossMargin > 40) {
    insights.push({
      title: 'Margen Bruto Fuerte',
      description: `El margen bruto de ${grossMargin.toFixed(1)}% refleja un buen control de costos directos y un modelo de negocio sólido.`,
      icon: <LightBulbIcon className="h-5 w-5" />,
      type: 'positive'
    });
  }

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIconStyle = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Puntos Clave</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className={`rounded-lg p-4 border ${getCardStyle(insight.type)}`}>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${getIconStyle(insight.type)}`}>
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-1">
                  {insight.title}
                </h3>
                <p className="text-sm opacity-90">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}