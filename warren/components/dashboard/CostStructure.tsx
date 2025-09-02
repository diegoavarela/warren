import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ChartPieIcon } from '@heroicons/react/24/outline';

interface CostStructureProps {
  currentMonth: any;
}

export function CostStructure({ currentMonth }: CostStructureProps) {
  const costCategories = [
    { name: 'Costo de Ventas', value: currentMonth.cogs, color: '#EF4444' },
    { name: 'Personal Total', value: currentMonth.totalPersonnelCost || 0, color: '#3B82F6' },
    { name: 'Servicios Contratados', value: (currentMonth.contractServicesCoR || 0) + (currentMonth.contractServicesOp || 0), color: '#10B981' },
    { name: 'Servicios Profesionales', value: currentMonth.professionalServices || 0, color: '#F59E0B' },
    { name: 'Ventas y Marketing', value: currentMonth.salesMarketing || 0, color: '#8B5CF6' },
    { name: 'Instalaciones y Admin', value: currentMonth.facilitiesAdmin || 0, color: '#EC4899' }
  ].filter(cat => cat.value > 0);

  const totalCosts = costCategories.reduce((sum, cat) => sum + cat.value, 0);

  const chartData = {
    labels: costCategories.map(cat => cat.name),
    datasets: [{
      data: costCategories.map(cat => cat.value),
      backgroundColor: costCategories.map(cat => cat.color),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = ((value / totalCosts) * 100).toFixed(1);
            return `${label}: $${new Intl.NumberFormat('es-MX').format(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  const topCosts = [...costCategories].sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ChartPieIcon className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Estructura de Costos</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Costos Totales</p>
          <p className="text-xl font-bold text-gray-900">
            ${new Intl.NumberFormat('es-MX').format(totalCosts)}
          </p>
        </div>
      </div>

      <div className="h-64 mb-6">
        <Doughnut data={chartData} options={options} />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Top 3 Categorías de Costo</h4>
        {topCosts.map((category, index) => {
          const percentage = ((category.value / totalCosts) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm text-gray-700">{category.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900 block">
                  ${new Intl.NumberFormat('es-MX', {
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(category.value)}
                </span>
                <span className="text-xs text-gray-500">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}