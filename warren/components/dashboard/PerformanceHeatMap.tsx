import React from 'react';
import { FireIcon } from '@heroicons/react/24/outline';

interface PerformanceHeatMapProps {
  chartData: any[];
}

export function PerformanceHeatMap({ chartData }: PerformanceHeatMapProps) {
  const metrics = ['grossMargin', 'operatingMargin', 'netMargin', 'ebitdaMargin'];
  const metricLabels = {
    grossMargin: 'Margen Bruto',
    operatingMargin: 'Margen Operativo',
    netMargin: 'Margen Neto',
    ebitdaMargin: 'Margen EBITDA'
  };

  const getColorForValue = (value: number, metric: string) => {
    const thresholds = {
      grossMargin: { low: 20, mid: 35, high: 50 },
      operatingMargin: { low: 5, mid: 15, high: 25 },
      netMargin: { low: 0, mid: 10, high: 20 },
      ebitdaMargin: { low: 10, mid: 20, high: 30 }
    };

    const t = thresholds[metric as keyof typeof thresholds];
    
    if (value < t.low) return 'bg-red-500';
    if (value < t.mid) return 'bg-orange-500';
    if (value < t.high) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorForValue = (value: number, metric: string) => {
    const thresholds = {
      grossMargin: { low: 20, mid: 35 },
      operatingMargin: { low: 5, mid: 15 },
      netMargin: { low: 0, mid: 10 },
      ebitdaMargin: { low: 10, mid: 20 }
    };

    const t = thresholds[metric as keyof typeof thresholds];
    
    if (value < t.low) return 'text-white';
    if (value < t.mid) return 'text-white';
    return 'text-gray-900';
  };

  const recentData = chartData.slice(-6);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FireIcon className="w-6 h-6 text-orange-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Mapa de Calor de Desempeño</h3>
        </div>
        <p className="text-sm text-gray-500">Últimos 6 meses</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-700 pb-3">Métrica</th>
              {recentData.map((data, index) => (
                <th key={index} className="text-center text-sm font-medium text-gray-700 pb-3 px-2">
                  {data.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-2">
            {metrics.map((metric) => (
              <tr key={metric}>
                <td className="text-sm text-gray-700 py-2 pr-4">
                  {metricLabels[metric as keyof typeof metricLabels]}
                </td>
                {recentData.map((data, index) => {
                  const value = data[metric] || 0;
                  const color = getColorForValue(value, metric);
                  const textColor = getTextColorForValue(value, metric);
                  
                  return (
                    <td key={index} className="px-2 py-2">
                      <div 
                        className={`${color} ${textColor} rounded-lg px-3 py-2 text-center text-sm font-semibold transition-all hover:opacity-80`}
                        title={`${value.toFixed(1)}%`}
                      >
                        {value.toFixed(0)}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2" />
          <span className="text-gray-600">Bajo</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded mr-2" />
          <span className="text-gray-600">Medio</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2" />
          <span className="text-gray-600">Bueno</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2" />
          <span className="text-gray-600">Excelente</span>
        </div>
      </div>
    </div>
  );
}