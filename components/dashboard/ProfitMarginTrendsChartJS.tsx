"use client";

import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import '@/lib/utils/chartSetup'; // Register Chart.js components

interface ProfitMarginTrendsProps {
  chartData: any[];
  formatPercentage: (value: number) => string;
  locale?: string;
}

export function ProfitMarginTrendsChartJS({ 
  chartData, 
  formatPercentage,
  locale = 'es-MX'
}: ProfitMarginTrendsProps) {
  
  // Defensive check
  if (!formatPercentage || !chartData || chartData.length === 0) {
    return <div>Loading...</div>;
  }

  // Prepare Chart.js data
  const chartJSData = {
    labels: chartData.map(d => d.month),
    datasets: [
      {
        label: 'Margen Bruto',
        data: chartData.map(d => d.grossMargin),
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Margen Neto',
        data: chartData.map(d => d.netMargin),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#3B82F6',
        tension: 0.1,
        fill: true
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Tendencia de Márgenes de Beneficio
            </h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Chart */}
        <div className="h-80 flex-shrink-0">
          <Line data={chartJSData} options={options} />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              Margen Bruto Promedio
            </p>
            <p className="text-xl font-bold text-green-600">
              {formatPercentage(chartData.reduce((sum, d) => sum + d.grossMargin, 0) / chartData.length)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              Margen Neto Promedio
            </p>
            <p className="text-xl font-bold text-blue-600">
              {formatPercentage(chartData.reduce((sum, d) => sum + d.netMargin, 0) / chartData.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}