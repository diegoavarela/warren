import React from 'react';
import { Line } from 'react-chartjs-2';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface RevenueGrowthProps {
  chartData: any[];
  currentMonth: any;
  previousMonth: any;
}

export function RevenueGrowthAnalysis({ chartData, currentMonth, previousMonth }: RevenueGrowthProps) {
  const revenueGrowth = previousMonth 
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 
    : 0;

  const chartConfig = {
    labels: chartData.map(d => d.month),
    datasets: [
      {
        label: 'Ingresos',
        data: chartData.map(d => d.revenue),
        borderColor: '#7CB342',
        backgroundColor: 'rgba(124, 179, 66, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Utilidad Bruta',
        data: chartData.map(d => d.grossProfit),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': $';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('es-MX').format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + new Intl.NumberFormat('es-MX').format(value);
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Análisis de Crecimiento de Ingresos</h3>
        <div className={`flex items-center ${
          revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {revenueGrowth >= 0 ? (
            <ArrowTrendingUpIcon className="w-5 h-5 mr-1" />
          ) : (
            <ArrowTrendingDownIcon className="w-5 h-5 mr-1" />
          )}
          <span className="font-semibold">{Math.abs(revenueGrowth).toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Ingresos Actuales</p>
          <p className="text-xl font-bold text-gray-900">
            ${new Intl.NumberFormat('es-MX').format(currentMonth.revenue)}
          </p>
        </div>
        <div className="text-center border-l border-r border-gray-200">
          <p className="text-sm text-gray-600">Margen Bruto</p>
          <p className="text-xl font-bold text-green-600">
            {currentMonth.grossMargin.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">YTD Total</p>
          <p className="text-xl font-bold text-gray-900">
            ${new Intl.NumberFormat('es-MX').format(
              chartData.reduce((sum, d) => sum + d.revenue, 0)
            )}
          </p>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartConfig} options={options} />
      </div>
    </div>
  );
}