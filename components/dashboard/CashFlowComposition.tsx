"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChartPieIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import { Bar, getElementsAtEvent } from 'react-chartjs-2';
import { useRef } from 'react';
// Import the global Chart.js setup to ensure components are registered
import '@/lib/utils/chartSetup';

interface CashFlowCompositionProps {
  historicalData: any[];
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
}

interface CompositionItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
  csvRow?: string;
  isGroup?: boolean;
  groupId?: string;
  subcategories?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function CashFlowComposition({ 
  historicalData,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false
}: CashFlowCompositionProps) {
  const [viewMode, setViewMode] = useState<'inflows' | 'outflows' | 'both'>('both');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const chartRef = useRef<any>(null);
  // Removed timeframe state - using current month only (August 2025)
  
  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (modalData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalData]);

  // Calculate composition data using CURRENT MONTH ONLY (August 2025, index 7)
  const compositionData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { inflowsData: [], outflowsData: [], combinedData: [] };
    }

    // Use August 2025 data only (index 7)
    const currentPeriod = historicalData[7];
    if (!currentPeriod) {
      return { inflowsData: [], outflowsData: [], combinedData: [] };
    }
    
    // Current month totals using specific CSV rows - NO AGGREGATION
    const totals = {
      // INFLOWS - Only actual money coming in (removed initialBalance)
      totalCollections: currentPeriod.totalCollections || 0,
      totalInvestmentIncome: currentPeriod.totalInvestmentIncome || 0,
      
      // OUTFLOWS - Individual expense rows (no double-counting with totals)
      // OPEX Subcategories
      totalRentExpense: Math.abs(currentPeriod.totalRentExpense || 0),
      totalExternalProfessionalServices: Math.abs(currentPeriod.totalExternalProfessionalServices || 0),
      totalUtilities: Math.abs(currentPeriod.totalUtilities || 0),
      totalOtherExpenses: Math.abs(currentPeriod.totalOtherExpenses || 0),
      
      // WAGES Subcategories  
      totalConsultingEducation: Math.abs(currentPeriod.totalConsultingEducation || 0),
      totalBenefits: Math.abs(currentPeriod.totalBenefits || 0),
      totalPrepaidHealthCoverage: Math.abs(currentPeriod.totalPrepaidHealthCoverage || 0),
      totalContractors: Math.abs(currentPeriod.totalContractors || 0),
      totalSalaries: Math.abs(currentPeriod.totalSalaries || 0),
      
      // OTHER Outflows
      totalTaxes: Math.abs(currentPeriod.totalTaxes || 0),
      totalBankExpensesAndTaxes: Math.abs(currentPeriod.totalBankExpensesAndTaxes || 0)
    };

    // Create inflows breakdown - INDIVIDUAL CSV ROWS (Row 10, 20, 23)
    const totalInflowsSum = (currentPeriod.initialBalance || 0) + totals.totalCollections + totals.totalInvestmentIncome;
    
    const inflowsData = [
      {
        name: locale?.startsWith('es') ? 'Balance Inicial' : 'Initial Balance',
        value: currentPeriod.initialBalance || 0,
        percentage: totalInflowsSum > 0 ? ((currentPeriod.initialBalance || 0) / totalInflowsSum) * 100 : 0,
        color: '#10B981',
        csvRow: 'Row 10'
      },
      {
        name: locale?.startsWith('es') ? 'Cobranzas Totales' : 'Total Collections',
        value: totals.totalCollections,
        percentage: totalInflowsSum > 0 ? (totals.totalCollections / totalInflowsSum) * 100 : 0,
        color: '#34D399',
        csvRow: 'Row 20'
      },
      {
        name: locale?.startsWith('es') ? 'Ingresos Inversión' : 'Investment Income',
        value: totals.totalInvestmentIncome,
        percentage: totalInflowsSum > 0 ? (totals.totalInvestmentIncome / totalInflowsSum) * 100 : 0,
        color: '#6EE7B7',
        csvRow: 'Row 23'
      }
    ].sort((a, b) => b.value - a.value); // Sort by amount (largest to smallest)

    // Create outflows breakdown - GROUPED CATEGORIES (compact view)
    // Group OPEX subcategories
    const opexTotal = totals.totalRentExpense + totals.totalExternalProfessionalServices + totals.totalUtilities + totals.totalOtherExpenses;
    // Group small WAGES subcategories 
    const smallWagesTotal = totals.totalConsultingEducation + totals.totalBenefits + totals.totalPrepaidHealthCoverage;
    
    const totalOutflowsSum = 
      totals.totalSalaries + totals.totalContractors + opexTotal + smallWagesTotal +
      totals.totalTaxes + totals.totalBankExpensesAndTaxes;
    
    const outflowsData = [
      // Major individual items
      {
        name: locale?.startsWith('es') ? 'Salarios' : 'Salaries',
        value: totals.totalSalaries,
        percentage: totalOutflowsSum > 0 ? (totals.totalSalaries / totalOutflowsSum) * 100 : 0,
        color: '#F97316'
      },
      {
        name: locale?.startsWith('es') ? 'Contratistas' : 'Contractors',
        value: totals.totalContractors,
        percentage: totalOutflowsSum > 0 ? (totals.totalContractors / totalOutflowsSum) * 100 : 0,
        color: '#FB923C'
      },
      // Grouped OPEX (all OPEX subcategories combined)
      {
        name: locale?.startsWith('es') ? 'Gastos Operativos (OPEX)' : 'Operating Expenses (OPEX)',
        value: opexTotal,
        percentage: totalOutflowsSum > 0 ? (opexTotal / totalOutflowsSum) * 100 : 0,
        color: '#EF4444',
        isGroup: true,
        groupId: 'opex',
        subcategories: [
          { name: locale?.startsWith('es') ? 'Alquileres' : 'Rent', value: totals.totalRentExpense, color: '#EF4444' },
          { name: locale?.startsWith('es') ? 'Servicios Profesionales' : 'Professional Services', value: totals.totalExternalProfessionalServices, color: '#F87171' },
          { name: locale?.startsWith('es') ? 'Servicios Públicos' : 'Utilities', value: totals.totalUtilities, color: '#FCA5A5' },
          { name: locale?.startsWith('es') ? 'Otros Gastos' : 'Other Expenses', value: totals.totalOtherExpenses, color: '#FECACA' }
        ].filter(sub => sub.value > 0)
      },
      // Grouped small wages items
      {
        name: locale?.startsWith('es') ? 'Beneficios y Otros' : 'Benefits & Other',
        value: smallWagesTotal,
        percentage: totalOutflowsSum > 0 ? (smallWagesTotal / totalOutflowsSum) * 100 : 0,
        color: '#FDBA74',
        isGroup: true,
        groupId: 'benefits',
        subcategories: [
          { name: locale?.startsWith('es') ? 'Consultoría/Educación' : 'Consulting/Education', value: totals.totalConsultingEducation, color: '#FDBA74' },
          { name: locale?.startsWith('es') ? 'Beneficios' : 'Benefits', value: totals.totalBenefits, color: '#FED7AA' },
          { name: locale?.startsWith('es') ? 'Cobertura Salud' : 'Health Coverage', value: totals.totalPrepaidHealthCoverage, color: '#FFEDD5' }
        ].filter(sub => sub.value > 0)
      },
      // Individual other categories
      {
        name: locale?.startsWith('es') ? 'Impuestos' : 'Taxes',
        value: totals.totalTaxes,
        percentage: totalOutflowsSum > 0 ? (totals.totalTaxes / totalOutflowsSum) * 100 : 0,
        color: '#DC2626'
      },
      {
        name: locale?.startsWith('es') ? 'Gastos Bancarios' : 'Bank Expenses',
        value: totals.totalBankExpensesAndTaxes,
        percentage: totalOutflowsSum > 0 ? (totals.totalBankExpensesAndTaxes / totalOutflowsSum) * 100 : 0,
        color: '#B91C1C'
      }
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value); // Sort by amount (largest to smallest)

    // Create combined data using calculated totals
    const combinedData = [
      {
        name: locale?.startsWith('es') ? 'Entradas' : 'Inflows',
        value: totalInflowsSum,
        percentage: 50, // Will be calculated properly below
        color: '#10B981',
        type: 'inflow'
      },
      {
        name: locale?.startsWith('es') ? 'Salidas' : 'Outflows',
        value: totalOutflowsSum,
        percentage: 50, // Will be calculated properly below
        color: '#EF4444',
        type: 'outflow'
      }
    ];

    // Calculate proper percentages for combined view
    const totalFlow = totalInflowsSum + totalOutflowsSum;
    if (totalFlow > 0) {
      combinedData[0].percentage = (totalInflowsSum / totalFlow) * 100;
      combinedData[1].percentage = (totalOutflowsSum / totalFlow) * 100;
    }

    return { inflowsData, outflowsData, combinedData };
  }, [historicalData, locale]);

  // Get chart data based on view mode
  const getChartData = () => {
    let data, title;
    
    switch (viewMode) {
      case 'inflows':
        data = compositionData.inflowsData;
        title = locale?.startsWith('es') ? 'Composición de Entradas' : 'Inflows Composition';
        break;
      case 'outflows':
        data = compositionData.outflowsData;
        title = locale?.startsWith('es') ? 'Composición de Salidas' : 'Outflows Composition';
        break;
      default:
        data = compositionData.combinedData;
        title = locale?.startsWith('es') ? 'Entradas vs Salidas' : 'Inflows vs Outflows';
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      labels: data.map(item => item.name),
      datasets: [
        {
          label: title,
          data: data.map(item => item.value),
          borderColor: data.map(item => item.color),
          borderWidth: 2,
          hoverBorderColor: data.map(item => item.color),
          hoverBorderWidth: 2,
          barThickness: 40, // Thicker bars for better visibility
          maxBarThickness: 45,
          categoryPercentage: 0.8, // More spacing for thicker bars
          // Make grouped bars more visually distinct
          backgroundColor: data.map(item => 
            (item as any)?.isGroup ? (item.color + '60') : (item.color + '80')
          ),
          hoverBackgroundColor: data.map(item => 
            (item as any)?.isGroup ? (item.color + '90') : item.color
          )
        }
      ],
      title
    };
  };

  const chartData = getChartData();

  // Handle chart bar clicks
  const handleChartClick = (event: any) => {
    if (!chartRef.current) return;
    
    const elements = getElementsAtEvent(chartRef.current, event);
    console.log('Chart click elements:', elements);
    
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      const data = viewMode === 'inflows' ? compositionData.inflowsData :
                  viewMode === 'outflows' ? compositionData.outflowsData :
                  compositionData.combinedData;
      const clickedItem = data[dataIndex];
      
      console.log('Clicked item:', clickedItem);
      
      if (clickedItem && (clickedItem as any).isGroup) {
        console.log('Opening modal for group:', (clickedItem as any)?.groupId);
        setModalData(clickedItem);
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bar chart
    plugins: {
      legend: {
        display: false // Hide legend for cleaner look
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const data = viewMode === 'inflows' ? compositionData.inflowsData :
                        viewMode === 'outflows' ? compositionData.outflowsData :
                        compositionData.combinedData;
            const item = data[context.dataIndex];
            const clickHint = (item as any).isGroup ? ' (Clic para detalles)' : '';
            return `${item.name}: ${formatValue(item.value)} (${formatPercentage(item.percentage)})${clickHint}`;
          }
        }
      }
    },
    onHover: (event: any, elements: any) => {
      if (event.native?.target) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatValue(value),
          font: {
            size: 10
          }
        },
        grid: {
          display: true,
          color: '#E5E7EB'
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 0,
          padding: 5
        },
        grid: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10
      }
    }
  };

  const getCurrentData = () => {
    switch (viewMode) {
      case 'inflows':
        return compositionData.inflowsData;
      case 'outflows':
        return compositionData.outflowsData;
      default:
        return compositionData.combinedData;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ChartPieIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {locale?.startsWith('es') ? 'Composición Cash Flow' : 'Cash Flow Composition'}
              </h3>
              <p className="text-sm text-white/80">
                {locale?.startsWith('es') 
                  ? 'Mes actual (Agosto 2025)'
                  : 'Current month (August 2025)'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HelpIcon 
              topic={helpTopics['dashboard.composition'] || helpTopics['dashboard.cashflow']} 
              size="sm" 
              className="text-white hover:text-gray-200"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* View Mode Toggles */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setViewMode('both')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 ${
              viewMode === 'both'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <EyeIcon className="w-4 h-4" />
            <span>{locale?.startsWith('es') ? 'General' : 'Overview'}</span>
          </button>
          <button
            onClick={() => setViewMode('inflows')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 ${
              viewMode === 'inflows'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowUpIcon className="w-4 h-4 text-green-500" />
            <span>{locale?.startsWith('es') ? 'Entradas' : 'Inflows'}</span>
          </button>
          <button
            onClick={() => setViewMode('outflows')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 ${
              viewMode === 'outflows'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDownIcon className="w-4 h-4 text-red-500" />
            <span>{locale?.startsWith('es') ? 'Salidas' : 'Outflows'}</span>
          </button>
        </div>

        {chartData ? (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-96 max-h-96 overflow-y-auto">
              <Bar 
                ref={chartRef}
                data={chartData} 
                options={chartOptions}
                onClick={(event) => handleChartClick(event)}
              />
            </div>

            {/* Legend with Values - Compact */}
            <div className="grid grid-cols-1 gap-1">
              {getCurrentData().map((item, index) => (
                <div key={index}>
                  <div 
                    className={`flex items-center justify-between py-1 px-2 bg-gray-50 rounded border border-gray-100 ${
                      (item as any)?.isGroup ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => (item as any)?.isGroup ? setModalData(item) : setExpandedGroup(expandedGroup === (item as any)?.groupId ? null : (item as any)?.groupId)}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-xs font-medium text-gray-700 truncate">{item.name}</span>
                      {(item as any).isGroup && (
                        <span className="text-xs text-gray-400">
                          {expandedGroup === (item as any)?.groupId ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-gray-900">{formatValue(item.value)}</span>
                      <span className="text-xs text-gray-500 ml-1">{formatPercentage(item.percentage)}</span>
                    </div>
                  </div>
                  
                  {/* Expanded subcategories */}
                  {(item as any)?.isGroup && expandedGroup === (item as any)?.groupId && (item as any)?.subcategories && (
                    <div className="ml-4 mt-1 space-y-1">
                      {(item as any).subcategories.map((sub: any, subIndex: number) => (
                        <div key={subIndex} className="flex items-center justify-between py-1 px-2 bg-gray-25 rounded border border-gray-50">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: sub.color }}
                            ></div>
                            <span className="text-xs text-gray-600 truncate">{sub.name}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-medium text-gray-700">{formatValue(sub.value)}</span>
                            <span className="text-xs text-gray-400 ml-1">
                              {((sub.value / item.value) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary Insights */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h4 className="font-medium text-indigo-800 mb-2">
                {locale?.startsWith('es') ? 'Resumen (Agosto 2025)' : 'Summary (August 2025)'}
              </h4>
              <div className="space-y-1 text-sm text-indigo-700">
                {viewMode === 'both' && (
                  <>
                    <p>
                      • {locale?.startsWith('es')
                        ? `Total entradas: ${formatValue(compositionData.combinedData[0]?.value || 0)}`
                        : `Total inflows: ${formatValue(compositionData.combinedData[0]?.value || 0)}`}
                    </p>
                    <p>
                      • {locale?.startsWith('es')
                        ? `Total salidas: ${formatValue(compositionData.combinedData[1]?.value || 0)}`
                        : `Total outflows: ${formatValue(compositionData.combinedData[1]?.value || 0)}`}
                    </p>
                    <p>
                      • {locale?.startsWith('es')
                        ? `Flujo neto: ${formatValue((compositionData.combinedData[0]?.value || 0) - (compositionData.combinedData[1]?.value || 0))}`
                        : `Net flow: ${formatValue((compositionData.combinedData[0]?.value || 0) - (compositionData.combinedData[1]?.value || 0))}`}
                    </p>
                  </>
                )}
                {viewMode === 'inflows' && compositionData.inflowsData.length > 0 && (
                  <p>
                    • {locale?.startsWith('es')
                      ? `Fuente principal: ${compositionData.inflowsData[0]?.name} (${formatPercentage(compositionData.inflowsData[0]?.percentage || 0)})`
                      : `Main source: ${compositionData.inflowsData[0]?.name} (${formatPercentage(compositionData.inflowsData[0]?.percentage || 0)})`}
                  </p>
                )}
                {viewMode === 'outflows' && compositionData.outflowsData.length > 0 && (
                  <p>
                    • {locale?.startsWith('es')
                      ? `Mayor gasto: ${compositionData.outflowsData[0]?.name} (${formatPercentage(compositionData.outflowsData[0]?.percentage || 0)})`
                      : `Largest expense: ${compositionData.outflowsData[0]?.name} (${formatPercentage(compositionData.outflowsData[0]?.percentage || 0)})`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChartPieIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 mb-2">
              {locale?.startsWith('es') ? 'No hay datos para mostrar' : 'No data to display'}
            </p>
            <p className="text-xs text-gray-400">
              {locale?.startsWith('es') 
                ? 'Los datos de composición no están disponibles para el período seleccionado'
                : 'Composition data not available for selected period'}
            </p>
          </div>
        )}
      </div>

      {/* Modal para desglose de categorías agrupadas */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalData(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: modalData.color }}
                ></div>
                <span>{modalData.name}</span>
              </h3>
              <button 
                onClick={() => setModalData(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                title="Cerrar"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatValue(modalData.value)}</p>
                <p className="text-sm text-gray-500">{formatPercentage(modalData.percentage)} del total de salidas</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Desglose detallado:
              </h4>
              {modalData.subcategories?.map((sub: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded border">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    ></div>
                    <span className="text-sm text-gray-700">{sub.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatValue(sub.value)}</p>
                    <p className="text-xs text-gray-500">
                      {((sub.value / modalData.value) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setModalData(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}