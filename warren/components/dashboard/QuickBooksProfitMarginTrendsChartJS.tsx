"use client";

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import '@/lib/utils/chartSetup'; // Register Chart.js components

interface MarginDataPoint {
  month: string;
  grossMargin: number;
  netMargin: number;
  revenue: number;
  cogs: number;
  netIncome: number;
}

interface QuickBooksProfitMarginTrendsProps {
  data: MarginDataPoint[];
  formatPercentage: (value: number) => string;
  currency: string;
}

export function QuickBooksProfitMarginTrendsChartJS({
  data,
  formatPercentage,
  currency
}: QuickBooksProfitMarginTrendsProps) {

  const { chartData, marginStats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: null, marginStats: null };
    }

    // Calculate margins for each data point
    const chartPoints = data.map(item => {
      const grossMargin = item.revenue > 0 ? ((item.revenue - item.cogs) / item.revenue) * 100 : 0;
      const netMargin = item.revenue > 0 ? (item.netIncome / item.revenue) * 100 : 0;

      return {
        month: item.month,
        grossMargin,
        netMargin
      };
    });

    const chartJSData = {
      labels: chartPoints.map(d => d.month),
      datasets: [
        {
          label: 'Gross Margin',
          data: chartPoints.map(d => d.grossMargin),
          borderColor: '#10B981',
          backgroundColor: '#10B98120',
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10B981',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Net Margin',
          data: chartPoints.map(d => d.netMargin),
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

    // Calculate average margins
    const avgGrossMargin = chartPoints.reduce((sum, d) => sum + d.grossMargin, 0) / chartPoints.length;
    const avgNetMargin = chartPoints.reduce((sum, d) => sum + d.netMargin, 0) / chartPoints.length;

    const stats = {
      avgGrossMargin,
      avgNetMargin
    };

    return { chartData: chartJSData, marginStats: stats };
  }, [data]);

  if (!chartData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex items-center justify-center">
        <div className="text-gray-500">Loading margin data...</div>
      </div>
    );
  }

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
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        position: 'left',
        ticks: {
          callback: (value) => `${value}%`,
          font: {
            size: 11
          }
        },
        grid: {
          color: '#E5E7EB'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 6
      }
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
              Profit Margin Trends
            </h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Chart */}
        <div className="h-80 flex-shrink-0">
          <Line data={chartData} options={options} />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              Average Gross Margin
            </p>
            <p className="text-xl font-bold text-green-600">
              {(marginStats?.avgGrossMargin || 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              Average Net Margin
            </p>
            <p className="text-xl font-bold text-blue-600">
              {(marginStats?.avgNetMargin || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}