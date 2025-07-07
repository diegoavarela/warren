import React from 'react';
import { Bar } from 'react-chartjs-2';
import { UserGroupIcon } from '@heroicons/react/24/outline';

interface PersonnelCostProps {
  currentMonth: any;
}

export function PersonnelCostBreakdown({ currentMonth }: PersonnelCostProps) {
  const totalPersonnel = currentMonth.totalPersonnelCost || 0;
  const personnelAsPercent = currentMonth.revenue > 0 
    ? (totalPersonnel / currentMonth.revenue) * 100 
    : 0;

  const chartData = {
    labels: ['Salarios CoR', 'Impuestos CoR', 'Salarios Op', 'Impuestos Op', 'Cobertura Salud', 'Beneficios'],
    datasets: [{
      label: 'Costo de Personal',
      data: [
        currentMonth.personnelSalariesCoR || 0,
        currentMonth.payrollTaxesCoR || 0,
        currentMonth.personnelSalariesOp || 0,
        currentMonth.payrollTaxesOp || 0,
        currentMonth.healthCoverage || 0,
        currentMonth.personnelBenefits || 0
      ],
      backgroundColor: [
        '#4CAF50',
        '#66BB6A',
        '#2196F3',
        '#42A5F5',
        '#FF9800',
        '#FFA726'
      ]
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
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

  const costCategories = [
    { name: 'Salarios CoR', value: currentMonth.personnelSalariesCoR || 0, color: 'bg-green-500' },
    { name: 'Impuestos CoR', value: currentMonth.payrollTaxesCoR || 0, color: 'bg-green-400' },
    { name: 'Salarios Operativos', value: currentMonth.personnelSalariesOp || 0, color: 'bg-blue-500' },
    { name: 'Impuestos Operativos', value: currentMonth.payrollTaxesOp || 0, color: 'bg-blue-400' },
    { name: 'Cobertura de Salud', value: currentMonth.healthCoverage || 0, color: 'bg-orange-500' },
    { name: 'Beneficios', value: currentMonth.personnelBenefits || 0, color: 'bg-orange-400' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <UserGroupIcon className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Desglose de Costos de Personal</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Personal</p>
          <p className="text-xl font-bold text-gray-900">
            ${new Intl.NumberFormat('es-MX').format(totalPersonnel)}
          </p>
          <p className="text-sm text-gray-500">{personnelAsPercent.toFixed(1)}% de ingresos</p>
        </div>
      </div>

      <div className="h-64 mb-6">
        <Bar data={chartData} options={options} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {costCategories.map((category, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${category.color} mr-2`} />
              <span className="text-sm text-gray-700">{category.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              ${new Intl.NumberFormat('es-MX', {
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(category.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}