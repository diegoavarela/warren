import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface TrendForecastProps {
  chartData: any[];
}

export function TrendForecastChart({ chartData }: TrendForecastProps) {
  // Simple linear regression for forecast
  const forecastMonths = 3;
  const lastMonths = chartData.slice(-6);
  
  const calculateTrend = (data: number[]) => {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const revenueData = lastMonths.map(d => d.revenue);
  const revenueTrend = calculateTrend(revenueData);
  
  const forecastData = [];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const lastMonth = new Date();
  
  for (let i = 0; i < forecastMonths; i++) {
    const forecastRevenue = revenueTrend.intercept + revenueTrend.slope * (revenueData.length + i);
    const nextMonth = new Date(lastMonth);
    nextMonth.setMonth(lastMonth.getMonth() + i + 1);
    
    forecastData.push({
      month: monthNames[nextMonth.getMonth()],
      revenue: Math.max(0, forecastRevenue),
      forecast: true
    });
  }

  const allData = [...chartData, ...forecastData];

  const chartConfig = {
    labels: allData.map(d => d.month),
    datasets: [
      {
        label: 'Ingresos Reales',
        data: allData.map(d => d.forecast ? null : d.revenue),
        borderColor: '#7CB342',
        backgroundColor: 'rgba(124, 179, 66, 0.1)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Pronóstico',
        data: allData.map((d, i) => {
          if (d.forecast) return d.revenue;
          if (i === chartData.length - 1) return chartData[i].revenue;
          return null;
        }),
        borderColor: '#FF9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'EBITDA',
        data: allData.map(d => {
          if (d.forecast) return null;
          return d.revenue * (d.ebitdaMargin / 100);
        }),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
            return '$' + new Intl.NumberFormat('es-MX', {
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(value);
          }
        }
      }
    }
  };

  const avgGrowthRate = lastMonths.length > 1 
    ? ((lastMonths[lastMonths.length - 1].revenue - lastMonths[0].revenue) / lastMonths[0].revenue) * 100 / lastMonths.length
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ChartBarIcon className="w-6 h-6 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Tendencias y Pronóstico</h3>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <SparklesIcon className="w-4 h-4 mr-1" />
          <span>Pronóstico a 3 meses</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Crecimiento Promedio</p>
          <p className={`text-xl font-bold ${avgGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {avgGrowthRate >= 0 ? '+' : ''}{avgGrowthRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Mensual</p>
        </div>
        <div className="text-center border-l border-r border-gray-200">
          <p className="text-sm text-gray-600">Ingresos Proyectados</p>
          <p className="text-xl font-bold text-orange-600">
            ${new Intl.NumberFormat('es-MX', {
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(forecastData[forecastData.length - 1]?.revenue || 0)}
          </p>
          <p className="text-xs text-gray-500">En 3 meses</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Tendencia</p>
          <p className={`text-xl font-bold ${revenueTrend.slope > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {revenueTrend.slope > 0 ? '↑ Positiva' : '↓ Negativa'}
          </p>
          <p className="text-xs text-gray-500">Últimos 6 meses</p>
        </div>
      </div>

      <div className="h-80">
        <Line data={chartConfig} options={options} />
      </div>
    </div>
  );
}