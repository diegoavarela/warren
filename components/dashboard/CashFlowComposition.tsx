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

// Helper functions for styling and display names
function getInflowColor(key: string): string {
  const colors: Record<string, string> = {
    'Collections': '#10B981',
    'Investment Income': '#34D399',
  };
  return colors[key] || '#6EE7B7'; // Default green color
}

function getOutflowColor(key: string): string {
  const colors: Record<string, string> = {
    'wages': '#F97316',      // Orange
    'opex': '#EF4444',       // Red  
    'taxes': '#DC2626',      // Dark red
    'Bank Expenses and Taxes': '#B91C1C', // Darker red
  };
  return colors[key] || '#FB923C'; // Default orange color
}

function getSubcategoryColor(parentKey: string, subKey: string): string {
  // Generate slightly different shades for subcategories
  const baseColor = getOutflowColor(parentKey);
  return baseColor + '80'; // Add transparency
}

function getOutflowDisplayName(key: string, locale?: string): string {
  const names: Record<string, { es: string; en: string }> = {
    'wages': { es: 'Salarios', en: 'Wages' },
    'opex': { es: 'Gastos Operativos', en: 'Operating Expenses' },
    'taxes': { es: 'Impuestos', en: 'Taxes' },
    'Bank Expenses and Taxes': { es: 'Gastos Bancarios', en: 'Bank Expenses' },
  };
  
  const nameObj = names[key];
  if (!nameObj) return key;
  
  return locale?.startsWith('es') ? nameObj.es : nameObj.en;
}

interface CashFlowCompositionProps {
  data: {
    periods: string[];
    categories: {
      inflows: Record<string, {
        label: string;
        values: (number | null)[];
        total: number;
        subcategories?: Record<string, any>;
      }>;
      outflows: Record<string, {
        label: string;
        values: (number | null)[];
        total: number;
        subcategories?: Record<string, any>;
      }>;
    };
    dataRows: {
      totalInflows: {
        label: string;
        values: (number | null)[];
        total: number;
      };
      totalOutflows: {
        label: string;
        values: (number | null)[];
        total: number;
      };
    };
  } | null;
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
  selectedPeriod?: number;
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
  data,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false,
  selectedPeriod = 0
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

  // Calculate composition data using the live API data structure
  const compositionData = useMemo(() => {
    if (!data || !data.categories || !data.dataRows) {
      return { inflowsData: [], outflowsData: [], combinedData: [] };
    }

    const { categories, periods, dataRows } = data;
    
    // Get the selected period index (default to latest period)
    const periodIndex = selectedPeriod < periods.length ? selectedPeriod : periods.length - 1;
    
    console.log('🎯 CashFlowComposition: Processing period', periodIndex, 'of', periods.length);
    console.log('📅 CashFlowComposition: Periods received:', periods);
    console.log('📊 Categories available:', Object.keys(categories));
    console.log('🔍 selectedPeriod:', selectedPeriod, 'selectedPeriodValue:', periods[selectedPeriod]);
    console.log('🔍 Full data structure:', data);

    // Create inflows data from API categories
    const inflowsData: CompositionItem[] = [];
    let totalInflowsSum = 0;

    Object.entries(categories.inflows || {}).forEach(([key, category]) => {
      const value = category.values[periodIndex] || 0;
      if (value > 0) {
        inflowsData.push({
          name: category.label || key,
          value: value,
          percentage: 0, // Will be calculated below
          color: getInflowColor(key),
        });
        totalInflowsSum += value;
      }
    });

    // Calculate percentages for inflows
    inflowsData.forEach(item => {
      item.percentage = totalInflowsSum > 0 ? (item.value / totalInflowsSum) * 100 : 0;
    });

    // Sort by value (largest to smallest)
    inflowsData.sort((a, b) => b.value - a.value);

    // Create outflows data from API categories  
    const outflowsData: CompositionItem[] = [];
    let totalOutflowsSum = 0;

    Object.entries(categories.outflows || {}).forEach(([key, category]) => {
      const value = Math.abs(category.values[periodIndex] || 0); // Take absolute value for outflows
      if (value > 0) {
        outflowsData.push({
          name: getOutflowDisplayName(key, locale),
          value: value,
          percentage: 0, // Will be calculated below
          color: getOutflowColor(key),
          // Add subcategories if they exist
          ...(category.subcategories && Object.keys(category.subcategories).length > 0 && {
            isGroup: true,
            groupId: key,
            subcategories: Object.entries(category.subcategories).map(([subKey, subCategory]: [string, any]) => ({
              name: subCategory.label || subKey,
              value: Math.abs(subCategory.values[periodIndex] || 0),
              color: getSubcategoryColor(key, subKey),
            })).filter(sub => sub.value > 0)
          })
        });
        totalOutflowsSum += value;
      }
    });

    // Calculate percentages for outflows
    outflowsData.forEach(item => {
      item.percentage = totalOutflowsSum > 0 ? (item.value / totalOutflowsSum) * 100 : 0;
    });

    // Sort by value (largest to smallest)
    outflowsData.sort((a, b) => b.value - a.value);

    // Create combined data using mapped totals from Excel (not category sums)
    const mappedTotalInflows = Math.abs(dataRows.totalInflows?.values[periodIndex] || 0);
    const mappedTotalOutflows = Math.abs(dataRows.totalOutflows?.values[periodIndex] || 0);
    
    const combinedData = [
      {
        name: locale?.startsWith('es') ? 'Entradas' : 'Inflows',
        value: mappedTotalInflows,
        percentage: 0, // Will be calculated below
        color: '#10B981',
        type: 'inflow'
      },
      {
        name: locale?.startsWith('es') ? 'Salidas' : 'Outflows',
        value: mappedTotalOutflows,
        percentage: 0, // Will be calculated below
        color: '#EF4444',
        type: 'outflow'
      }
    ];

    // Calculate proper percentages for combined view using mapped totals
    const totalFlow = mappedTotalInflows + mappedTotalOutflows;
    if (totalFlow > 0) {
      combinedData[0].percentage = (mappedTotalInflows / totalFlow) * 100;
      combinedData[1].percentage = (mappedTotalOutflows / totalFlow) * 100;
    }

    console.log('✅ CashFlowComposition: Processed data', {
      periodIndex,
      inflows: inflowsData.length,
      outflows: outflowsData.length,
      categorySumInflows: totalInflowsSum,
      categorySumOutflows: totalOutflowsSum,
      mappedTotalInflows: mappedTotalInflows,
      mappedTotalOutflows: mappedTotalOutflows,
      usingMappedTotals: 'for GENERAL view'
    });

    return { inflowsData, outflowsData, combinedData };
  }, [data, selectedPeriod, locale]);

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
                {data?.periods && data.periods.length > 0 ? (
                  locale?.startsWith('es') 
                    ? `Período: ${data.periods[selectedPeriod] || data.periods[data.periods.length - 1]}`
                    : `Period: ${data.periods[selectedPeriod] || data.periods[data.periods.length - 1]}`
                ) : (
                  locale?.startsWith('es') ? 'Sin datos' : 'No data'
                )}
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
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
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
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
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
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all flex items-center justify-center space-x-2 min-h-[44px] ${
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
            <div className="h-80 sm:h-96 max-h-96 overflow-y-auto">
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
                {locale?.startsWith('es') ? 'Resumen' : 'Summary'}
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