"use client";

import React, { useState, useMemo } from 'react';
import { 
  FireIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';

interface CashFlowHeatmapProps {
  historicalData: any[];
  formatValue: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
}

interface HeatmapCell {
  month: string;
  category: string;
  value: number;
  intensity: number;
  label: string;
}

export function CashFlowHeatmap({ 
  historicalData,
  formatValue,
  locale = 'es-MX',
  fullWidth = false
}: CashFlowHeatmapProps) {
  const [viewMode, setViewMode] = useState<'net' | 'inflows' | 'outflows'>('net');
  const currentYear = 2025;

  // Process data for 2025 heatmap with inflow/outflow views
  const heatmapData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    // Use only 2025 data (first 12 months)
    const data2025 = historicalData.slice(0, 12);
    const cells: HeatmapCell[] = [];

    // Month names for 2025 in Spanish
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Get values based on view mode
    const monthlyValues = data2025.map((period: any, index: number) => {
      let value = 0;
      
      switch (viewMode) {
        case 'inflows':
          value = Math.abs(period.totalInflows || 0);
          break;
        case 'outflows':
          value = Math.abs(period.totalOutflows || 0);
          break;
        default: // net
          value = period.monthlyGeneration || 0;
      }
      
      return {
        month: monthNames[index],
        value,
        isActual: index <= 7 // Jan-Aug are actual, Sep-Dec are forecast
      };
    });

    // Find max absolute value for intensity scaling
    const maxAbsValue = Math.max(...monthlyValues.map(m => Math.abs(m.value)));

    // Create cells for single row heatmap
    monthlyValues.forEach(monthData => {
      const absValue = Math.abs(monthData.value);
      const intensity = maxAbsValue > 0 ? (absValue / maxAbsValue) : 0;
      
      const categoryLabel = viewMode === 'inflows' ? 'Entradas' :
                          viewMode === 'outflows' ? 'Salidas' : 'Generación Mensual';
      
      cells.push({
        month: monthData.month,
        category: categoryLabel,
        value: monthData.value,
        intensity,
        label: `${monthData.month} ${currentYear} - ${categoryLabel}: ${formatValue(monthData.value)}${monthData.isActual ? '' : ' (Pronóstico)'}`
      });
    });

    return cells;
  }, [historicalData, viewMode, locale, formatValue]);

  // Get months for 2025 in Spanish (fixed layout)
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Get cell data for specific month
  const getCellData = (month: string) => {
    return heatmapData.find(cell => cell.month === month);
  };

  // Get month index to determine if actual or forecast
  const getMonthIndex = (month: string) => {
    return monthNames.indexOf(month);
  };

  // Get styling for cells - forecast cells are transparent with colored borders
  const getCellStyle = (cell: HeatmapCell | undefined, isActual: boolean) => {
    if (!cell) {
      return { 
        backgroundColor: '#f3f4f6',
        borderColor: '#d1d5db',
        borderWidth: '1px'
      };
    }

    // Use different intensities based on value magnitude
    const baseOpacity = Math.max(0.4, Math.min(0.95, cell.intensity));
    
    // Get base color based on view mode
    let baseColor;
    switch (viewMode) {
      case 'inflows':
        baseColor = '34, 197, 94'; // green for inflows
        break;
      case 'outflows':
        baseColor = '239, 68, 68'; // red for outflows
        break;
      default: // net flow
        const isPositive = cell.value >= 0;
        baseColor = isPositive ? '124, 58, 237' : '147, 51, 234'; // violet/purple
    }
    
    if (isActual) {
      // Actual data: solid background color
      return {
        backgroundColor: `rgba(${baseColor}, ${baseOpacity})`,
        borderColor: `rgba(${baseColor}, ${Math.min(1.0, baseOpacity + 0.2)})`,
        borderWidth: '1px'
      };
    } else {
      // Forecast data: transparent background with colored border
      return {
        backgroundColor: 'transparent',
        borderColor: `rgba(${baseColor}, ${baseOpacity})`,
        borderWidth: '3px'
      };
    }
  };

  // Calculate summary statistics for 2025
  const summaryStats = useMemo(() => {
    if (heatmapData.length === 0) return null;

    const values = heatmapData.map(cell => cell.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const bestMonth = heatmapData.find(cell => cell.value === maxValue);
    const worstMonth = heatmapData.find(cell => cell.value === minValue);
    
    return {
      bestMonth: bestMonth ? { month: bestMonth.month, value: bestMonth.value } : null,
      worstMonth: worstMonth ? { month: worstMonth.month, value: worstMonth.value } : null,
      averageGeneration: values.reduce((sum, val) => sum + val, 0) / values.length,
      positiveMonths: values.filter(val => val > 0).length
    };
  }, [heatmapData]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FireIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Rendimiento Mensual de Flujo de Caja
              </h3>
              <p className="text-sm text-white/80">
                {currentYear}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <HelpIcon 
              topic={helpTopics['dashboard.heatmap'] || helpTopics['dashboard.cashflow']} 
              size="sm" 
              className="text-white hover:text-gray-200"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* View Mode Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setViewMode('net')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${ 
              viewMode === 'net'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Flujo Neto
          </button>
          <button
            onClick={() => setViewMode('inflows')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${ 
              viewMode === 'inflows'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Solo Entradas
          </button>
          <button
            onClick={() => setViewMode('outflows')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${ 
              viewMode === 'outflows'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Solo Salidas
          </button>
        </div>

        {heatmapData.length > 0 ? (
          <div className="space-y-6">
            {/* Heatmap Grid - Two Rows for 2025 */}
            <div className="space-y-6 mb-6">
              {/* First Row: Jan-Jun */}
              <div className="flex justify-center">
                <div className="flex space-x-3">
                  {monthNames.slice(0, 6).map((month, index) => {
                    const cell = getCellData(month);
                    const monthIndex = index;
                    const isActual = monthIndex <= 7; // Jan-Aug are actual
                    
                    return (
                      <div key={month} className="flex flex-col items-center">
                        {/* Month Label */}
                        <div className="text-sm font-medium text-gray-700 mb-2 w-16 text-center">
                          {month}
                        </div>
                        
                        {/* Square Heatmap Cell */}
                        <div className="relative">
                          <div
                            className="h-16 w-16 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg group relative overflow-hidden"
                            style={getCellStyle(cell, isActual)}
                            title={cell?.label || ''}
                          >
                            {/* Forecast indicator */}
                            {!isActual && (
                              <div className="absolute top-1 right-1 w-3 h-3 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-gray-600">F</span>
                              </div>
                            )}
                            
                            {/* Value display */}
                            {cell && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                <span className={`text-xs font-bold text-center drop-shadow-sm leading-tight ${
                                  isActual ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {viewMode === 'net' && cell.value < 0 ? '-' : ''}{Math.abs(cell.value) > 1000000 
                                    ? `${Math.round(Math.abs(cell.value) / 1000000)}M`
                                    : Math.abs(cell.value) > 1000
                                    ? `${Math.round(Math.abs(cell.value) / 1000)}K`
                                    : Math.round(Math.abs(cell.value))
                                  }
                                </span>
                              </div>
                            )}
                            
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                              {cell?.label || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Second Row: Jul-Dec */}
              <div className="flex justify-center">
                <div className="flex space-x-3">
                  {monthNames.slice(6, 12).map((month, index) => {
                    const cell = getCellData(month);
                    const monthIndex = index + 6; // Adjust for second row
                    const isActual = monthIndex <= 7; // Jan-Aug are actual
                    
                    return (
                      <div key={month} className="flex flex-col items-center">
                        {/* Month Label */}
                        <div className="text-sm font-medium text-gray-700 mb-2 w-16 text-center">
                          {month}
                        </div>
                        
                        {/* Square Heatmap Cell */}
                        <div className="relative">
                          <div
                            className="h-16 w-16 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg group relative overflow-hidden"
                            style={getCellStyle(cell, isActual)}
                            title={cell?.label || ''}
                          >
                            {/* Forecast indicator */}
                            {!isActual && (
                              <div className="absolute top-1 right-1 w-3 h-3 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-gray-600">F</span>
                              </div>
                            )}
                            
                            {/* Value display */}
                            {cell && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                <span className={`text-xs font-bold text-center drop-shadow-sm leading-tight ${
                                  isActual ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {viewMode === 'net' && cell.value < 0 ? '-' : ''}{Math.abs(cell.value) > 1000000 
                                    ? `${Math.round(Math.abs(cell.value) / 1000000)}M`
                                    : Math.abs(cell.value) > 1000
                                    ? `${Math.round(Math.abs(cell.value) / 1000)}K`
                                    : Math.round(Math.abs(cell.value))
                                  }
                                </span>
                              </div>
                            )}
                            
                            {/* Tooltip on hover */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                              {cell?.label || ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-4 bg-gray-50 rounded-lg px-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Baseline</span>
                <div className="flex space-x-1">
                  {[0.4, 0.6, 0.8, 0.95].map((opacity, index) => {
                    let color;
                    switch (viewMode) {
                      case 'inflows':
                        color = `rgba(34, 197, 94, ${opacity})`; // green
                        break;
                      case 'outflows':
                        color = `rgba(239, 68, 68, ${opacity})`; // red
                        break;
                      default:
                        color = `rgba(124, 58, 237, ${opacity})`; // violet
                    }
                    return (
                      <div
                        key={index}
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      ></div>
                    );
                  })}
                </div>
                <span className="text-sm font-medium text-gray-700">Excellent</span>
              </div>
              
              <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded border">
                <div className="w-4 h-4 bg-white bg-opacity-80 rounded-full flex items-center justify-center border">
                  <span className="text-xs font-bold text-purple-700">F</span>
                </div>
                <span className="text-sm text-gray-600">Datos de pronóstico</span>
              </div>
            </div>

            {/* Summary Insights */}
            {summaryStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-100 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">
                    Mejores Rendimientos 2025
                  </h4>
                  <div className="space-y-1 text-sm text-purple-700">
                    {summaryStats.bestMonth && (
                      <p>
                        • Mejor mes: {summaryStats.bestMonth.month} ({formatValue(summaryStats.bestMonth.value)})
                      </p>
                    )}
                    {viewMode === 'net' && (
                      <p>
                        • Meses positivos: {summaryStats.positiveMonths} de 12
                      </p>
                    )}
                    <p>
                      • Promedio mensual: {formatValue(summaryStats.averageGeneration)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-100 border border-indigo-200 rounded-lg">
                  <h4 className="font-medium text-indigo-800 mb-2">
                    Áreas de Atención 2025
                  </h4>
                  <div className="space-y-1 text-sm text-indigo-700">
                    {summaryStats.worstMonth && (
                      <p>
                        • Mes más desafiante: {summaryStats.worstMonth.month} ({formatValue(summaryStats.worstMonth.value)})
                      </p>
                    )}
                    <p>
                      • Meses negativos: {12 - summaryStats.positiveMonths} de 12
                    </p>
                    <p>
                      • Enfoque en Jul-Sep para mejoras
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FireIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 mb-2">
              No hay datos para mostrar
            </p>
            <p className="text-xs text-gray-400">
              Los datos del mapa de calor no están disponibles para 2025
            </p>
          </div>
        )}
      </div>
    </div>
  );
}