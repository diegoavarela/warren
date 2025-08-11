"use client";

import React, { useState, useMemo } from 'react';
import { 
  AdjustmentsHorizontalIcon,
  PlayIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';
import '@/lib/utils/chartSetup';

interface ScenarioParameters {
  inflowChange: number;
  outflowChange: number;
  startingMonth: number;
  duration: number;
}

interface ScenarioResult {
  monthlyProjections: Array<{
    month: string;
    inflow: number;
    outflows: number;
    netCashFlow: number;
    endingBalance: number;
  }>;
  summary: {
    endingCash: number;
    totalInflow: number;
    totalOutflows: number;
    netCashFlow: number;
    monthsOfRunway: number | null;
    runOutMonth: string | null;
  };
}

interface CashFlowScenarioPlanningProps {
  historicalData: any[];
  currentBalance: number;
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
}

export function CashFlowScenarioPlanning({ 
  historicalData,
  currentBalance,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false
}: CashFlowScenarioPlanningProps) {
  const [scenarios, setScenarios] = useState({
    base: { inflowChange: 0, outflowChange: 0, startingMonth: 0, duration: 12 },
    optimistic: { inflowChange: 15, outflowChange: -10, startingMonth: 0, duration: 12 },
    pessimistic: { inflowChange: -20, outflowChange: 15, startingMonth: 0, duration: 12 }
  });
  
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'optimistic' | 'pessimistic'>('base');
  const [showResults, setShowResults] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'comparison'>('config');

  // Calculate baseline metrics from historical data
  const baselineMetrics = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { avgInflow: 0, avgOutflow: 0, avgNetFlow: 0 };
    }

    const recentData = historicalData.slice(-3); // Last 3 months
    const avgInflow = recentData.reduce((sum, d) => sum + (d.totalInflows || 0), 0) / recentData.length;
    const avgOutflow = recentData.reduce((sum, d) => sum + (d.totalOutflows || 0), 0) / recentData.length;
    const avgNetFlow = avgInflow - avgOutflow;

    return { avgInflow, avgOutflow, avgNetFlow };
  }, [historicalData]);

  // Run scenario calculations
  const results = useMemo(() => {
    if (!showResults) return null;

    const calculateScenario = (params: ScenarioParameters): ScenarioResult => {
      const monthlyProjections = [];
      let currentCash = currentBalance;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const modifiedInflow = baselineMetrics.avgInflow * (1 + params.inflowChange / 100);
      const modifiedOutflow = baselineMetrics.avgOutflow * (1 + params.outflowChange / 100);
      const netFlow = modifiedInflow - modifiedOutflow;
      
      let totalInflow = 0;
      let totalOutflows = 0;
      let runOutMonth = null;
      let monthsOfRunway = null;

      for (let i = 0; i < params.duration; i++) {
        const monthIndex = (new Date().getMonth() + i) % 12;
        const month = monthNames[monthIndex];
        
        totalInflow += modifiedInflow;
        totalOutflows += modifiedOutflow;
        currentCash += netFlow;

        monthlyProjections.push({
          month: `${month} ${new Date().getFullYear() + Math.floor((new Date().getMonth() + i) / 12)}`,
          inflow: modifiedInflow,
          outflows: modifiedOutflow,
          netCashFlow: netFlow,
          endingBalance: currentCash
        });

        // Check for runway calculation
        if (currentCash <= 0 && !runOutMonth) {
          runOutMonth = `${month} ${new Date().getFullYear() + Math.floor((new Date().getMonth() + i) / 12)}`;
          monthsOfRunway = i + 1;
        }
      }

      return {
        monthlyProjections,
        summary: {
          endingCash: currentCash,
          totalInflow,
          totalOutflows,
          netCashFlow: netFlow * params.duration,
          monthsOfRunway,
          runOutMonth
        }
      };
    };

    return {
      base: calculateScenario(scenarios.base),
      optimistic: calculateScenario(scenarios.optimistic),
      pessimistic: calculateScenario(scenarios.pessimistic)
    };
  }, [scenarios, showResults, baselineMetrics, currentBalance]);

  const updateScenario = (
    scenario: 'base' | 'optimistic' | 'pessimistic',
    field: keyof ScenarioParameters,
    value: number
  ) => {
    setScenarios(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [field]: value
      }
    }));
  };

  const getChartData = () => {
    if (!results) return null;

    const currentResult = results[selectedScenario];
    const labels = currentResult.monthlyProjections.map(p => p.month);

    return {
      labels,
      datasets: [
        {
          label: locale?.startsWith('es') ? 'Balance de Efectivo' : 'Cash Balance',
          data: currentResult.monthlyProjections.map(p => p.endingBalance),
          borderColor: selectedScenario === 'optimistic' ? '#10B981' : 
                      selectedScenario === 'pessimistic' ? '#EF4444' : '#6366F1',
          backgroundColor: selectedScenario === 'optimistic' ? 'rgba(16, 185, 129, 0.1)' : 
                          selectedScenario === 'pessimistic' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: selectedScenario === 'optimistic' ? '#10B981' : 
                               selectedScenario === 'pessimistic' ? '#EF4444' : '#6366F1',
        },
        // Add zero line for reference
        {
          label: locale?.startsWith('es') ? 'Línea de Cero' : 'Zero Line',
          data: new Array(labels.length).fill(0),
          borderColor: '#DC2626',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatValue(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatValue(value)
        },
        grid: {
          color: (context: any) => {
            return context.tick.value === 0 ? '#DC2626' : 'rgba(0, 0, 0, 0.05)';
          },
          lineWidth: (context: any) => {
            return context.tick.value === 0 ? 2 : 1;
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45
        }
      }
    }
  };

  const resetScenarios = () => {
    setScenarios({
      base: { inflowChange: 0, outflowChange: 0, startingMonth: 0, duration: 12 },
      optimistic: { inflowChange: 15, outflowChange: -10, startingMonth: 0, duration: 12 },
      pessimistic: { inflowChange: -20, outflowChange: 15, startingMonth: 0, duration: 12 }
    });
    setShowResults(false);
  };

  const runScenarios = () => {
    setShowResults(true);
    setActiveTab('results');
  };

  const getScenarioColor = (scenario: string) => {
    switch (scenario) {
      case 'optimistic': return 'bg-green-500';
      case 'pessimistic': return 'bg-red-500';
      default: return 'bg-indigo-500';
    }
  };

  const getScenarioName = (scenario: string) => {
    if (locale?.startsWith('es')) {
      switch (scenario) {
        case 'optimistic': return 'Optimista';
        case 'pessimistic': return 'Pesimista';
        default: return 'Base';
      }
    }
    switch (scenario) {
      case 'optimistic': return 'Optimistic';
      case 'pessimistic': return 'Pessimistic';
      default: return 'Base';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {locale?.startsWith('es') ? 'Planificación de Escenarios' : 'Scenario Planning'}
              </h3>
              <p className="text-sm text-white/80">
                {locale?.startsWith('es') 
                  ? 'Modela diferentes escenarios de flujo de caja' 
                  : 'Model different cash flow scenarios'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <HelpIcon 
              topic={helpTopics['dashboard.scenarioPlanning'] || helpTopics['dashboard.cashflow']} 
              size="sm" 
              className="text-white hover:text-gray-200"
            />
            <button
              onClick={resetScenarios}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title={locale?.startsWith('es') ? 'Reiniciar escenarios' : 'Reset scenarios'}
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={runScenarios}
              className="flex items-center px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {locale?.startsWith('es') ? 'Ejecutar' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Compact Baseline Info - Above Tabs */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <QuestionMarkCircleIcon className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              {locale?.startsWith('es') ? 'Base (3m avg):' : 'Baseline (3m avg):'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
            <div>
              <span className="font-medium">{locale?.startsWith('es') ? 'In:' : 'In:'} </span>
              {formatValue(baselineMetrics.avgInflow)}
            </div>
            <div>
              <span className="font-medium">{locale?.startsWith('es') ? 'Out:' : 'Out:'} </span>
              {formatValue(baselineMetrics.avgOutflow)}
            </div>
            <div>
              <span className="font-medium">{locale?.startsWith('es') ? 'Bal:' : 'Bal:'} </span>
              {formatValue(currentBalance)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
              activeTab === 'config'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {locale?.startsWith('es') ? 'Configurar' : 'Configure'}
          </button>
          <button
            onClick={() => setActiveTab('results')}
            disabled={!showResults}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
              activeTab === 'results' && showResults
                ? 'bg-white text-gray-900 shadow-sm'
                : showResults 
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            {locale?.startsWith('es') ? 'Resultados' : 'Results'}
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            disabled={!showResults}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
              activeTab === 'comparison' && showResults
                ? 'bg-white text-gray-900 shadow-sm'
                : showResults
                ? 'text-gray-600 hover:text-gray-900'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            {locale?.startsWith('es') ? 'Comparar' : 'Compare'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {activeTab === 'config' && (
            <div className="space-y-4">

              {/* Compact Scenario Inputs */}
              {(['base', 'optimistic', 'pessimistic'] as const).map(scenario => (
                <div key={scenario} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center text-sm">
                    <span className={`w-2 h-2 rounded-full mr-2 ${getScenarioColor(scenario)}`}></span>
                    {getScenarioName(scenario)}
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Entradas %' : 'Inflow %'}
                      </label>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="5"
                        value={scenarios[scenario].inflowChange}
                        onChange={(e) => updateScenario(scenario, 'inflowChange', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Salidas %' : 'Outflow %'}
                      </label>
                      <input
                        type="number"
                        min="-100"
                        max="200"
                        step="5"
                        value={scenarios[scenario].outflowChange}
                        onChange={(e) => updateScenario(scenario, 'outflowChange', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Meses' : 'Months'}
                      </label>
                      <select
                        value={scenarios[scenario].duration}
                        onChange={(e) => updateScenario(scenario, 'duration', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 h-8"
                      >
                        {[6, 12, 18, 24].map(months => (
                          <option key={months} value={months}>{months}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'results' && showResults && results && (
            <div className="space-y-4">
              {/* Scenario Selector */}
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                {(['base', 'optimistic', 'pessimistic'] as const).map(scenario => (
                  <button
                    key={scenario}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`flex-1 py-1 px-2 text-sm rounded font-medium transition-all ${
                      selectedScenario === scenario
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {getScenarioName(scenario)}
                  </button>
                ))}
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${
                  results[selectedScenario].summary.endingCash >= 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-xs text-gray-600 mb-1">
                    {locale?.startsWith('es') ? 'Balance Final' : 'Ending Cash'}
                  </p>
                  <p className={`text-lg font-bold ${
                    results[selectedScenario].summary.endingCash >= 0 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {formatValue(results[selectedScenario].summary.endingCash)}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">
                    {locale?.startsWith('es') ? 'Runway' : 'Runway'}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {results[selectedScenario].summary.monthsOfRunway !== null
                      ? `${results[selectedScenario].summary.monthsOfRunway}m`
                      : locale?.startsWith('es') ? '∞' : '∞'}
                  </p>
                </div>
              </div>

              {/* Compact Chart */}
              <div className="h-56 sm:h-64">
                {getChartData() && <Line data={getChartData()!} options={chartOptions} />}
              </div>

              {/* Warning for negative scenarios */}
              {results[selectedScenario].summary.endingCash < 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        {locale?.startsWith('es') ? '⚠️ Riesgo de Liquidez' : '⚠️ Liquidity Risk'}
                      </p>
                      <p className="text-xs text-amber-800 mt-1">
                        {locale?.startsWith('es') 
                          ? 'Balance negativo proyectado'
                          : 'Negative balance projected'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comparison' && showResults && results && (
            <div className="space-y-4">
              {/* Scenario Comparison Table */}
              <div className="space-y-3">
                {(['optimistic', 'base', 'pessimistic'] as const).map(scenario => (
                  <div key={scenario} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <span className={`w-3 h-3 rounded-full ${getScenarioColor(scenario)}`}></span>
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {getScenarioName(scenario)}
                        </span>
                        <p className="text-xs text-gray-500">
                          {scenarios[scenario].inflowChange >= 0 ? '+' : ''}{scenarios[scenario].inflowChange}% / {scenarios[scenario].outflowChange >= 0 ? '+' : ''}{scenarios[scenario].outflowChange}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        results[scenario].summary.endingCash >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatValue(results[scenario].summary.endingCash)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {results[scenario].summary.monthsOfRunway !== null
                          ? `${results[scenario].summary.monthsOfRunway}m runway`
                          : locale?.startsWith('es') ? 'Positivo' : 'Positive'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary insights */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  {locale?.startsWith('es') ? 'Resumen' : 'Summary'}
                </h4>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>
                    • {locale?.startsWith('es') 
                      ? `Mejor caso: ${formatValue(results.optimistic.summary.endingCash)}`
                      : `Best case: ${formatValue(results.optimistic.summary.endingCash)}`}
                  </p>
                  <p>
                    • {locale?.startsWith('es')
                      ? `Peor caso: ${formatValue(results.pessimistic.summary.endingCash)}`
                      : `Worst case: ${formatValue(results.pessimistic.summary.endingCash)}`}
                  </p>
                  <p>
                    • {locale?.startsWith('es')
                      ? `Diferencia: ${formatValue(results.optimistic.summary.endingCash - results.pessimistic.summary.endingCash)}`
                      : `Spread: ${formatValue(results.optimistic.summary.endingCash - results.pessimistic.summary.endingCash)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state for results tabs when no results */}
          {(activeTab === 'results' || activeTab === 'comparison') && !showResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PlayIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 mb-2">
                {locale?.startsWith('es') ? 'No hay resultados todavía' : 'No results yet'}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {locale?.startsWith('es') 
                  ? 'Configura los escenarios y ejecuta el análisis'
                  : 'Configure scenarios and run analysis'}
              </p>
              <button
                onClick={() => setActiveTab('config')}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              >
                {locale?.startsWith('es') ? 'Ir a Configuración' : 'Go to Configuration'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}