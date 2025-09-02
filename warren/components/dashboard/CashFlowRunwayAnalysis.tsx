"use client";

import React, { useState, useMemo } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { HelpIcon } from '../HelpIcon';
import { helpTopics } from '@/lib/help-content';

interface RunwayData {
  monthsRemaining: number | null;
  runwayDate: Date | null;
  currentBalance: number;
  averageBurnRate: number;
  burnRateTrend: 'accelerating' | 'decelerating' | 'stable';
  confidence: {
    conservative: number | null;
    moderate: number | null;
    optimistic: number | null;
  };
}

interface BurnRateDetails {
  threeMonthAverage: number;
  sixMonthAverage: number;
  twelveMonthAverage: number | null;
}

interface CashFlowRunwayAnalysisProps {
  historicalData: any[];
  currentBalance: number;
  formatValue: (value: number) => string;
  formatPercentage: (value: number) => string;
  locale?: string;
  fullWidth?: boolean;
}

export function CashFlowRunwayAnalysis({ 
  historicalData,
  currentBalance,
  formatValue,
  formatPercentage,
  locale = 'es-MX',
  fullWidth = false
}: CashFlowRunwayAnalysisProps) {
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Calculate runway analysis from historical data
  const { runwayData, burnRateDetails } = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { 
        runwayData: null, 
        burnRateDetails: { threeMonthAverage: 0, sixMonthAverage: 0, twelveMonthAverage: null } 
      };
    }

    // Calculate burn rates (positive means cash burn, negative means cash generation)
    const calculateBurnRates = (data: any[]) => {
      const lastThreeMonths = data.slice(-3);
      const lastSixMonths = data.slice(-6);
      const lastTwelveMonths = data.length >= 12 ? data.slice(-12) : null;

      const threeMonthBurn = lastThreeMonths.reduce((sum, d) => {
        const netFlow = (d.totalOutflows || 0) - (d.totalInflows || 0);
        return sum + netFlow;
      }, 0) / lastThreeMonths.length;

      const sixMonthBurn = lastSixMonths.reduce((sum, d) => {
        const netFlow = (d.totalOutflows || 0) - (d.totalInflows || 0);
        return sum + netFlow;
      }, 0) / lastSixMonths.length;

      const twelveMonthBurn = lastTwelveMonths ? 
        lastTwelveMonths.reduce((sum, d) => {
          const netFlow = (d.totalOutflows || 0) - (d.totalInflows || 0);
          return sum + netFlow;
        }, 0) / lastTwelveMonths.length : null;

      return {
        threeMonthAverage: Math.max(0, threeMonthBurn),
        sixMonthAverage: Math.max(0, sixMonthBurn), 
        twelveMonthAverage: twelveMonthBurn !== null ? Math.max(0, twelveMonthBurn) : null
      };
    };

    // Determine burn trend
    const determineBurnTrend = (burnRates: BurnRateDetails) => {
      const recent = burnRates.threeMonthAverage;
      const older = burnRates.sixMonthAverage;
      
      if (recent === 0 && older === 0) return 'stable';
      if (recent > older * 1.1) return 'accelerating';
      if (recent < older * 0.9) return 'decelerating';
      return 'stable';
    };

    const burnRates = calculateBurnRates(historicalData);
    const burnTrend = determineBurnTrend(burnRates);
    
    // Calculate weighted average burn rate (60% of 3-month, 40% of 6-month)
    const averageBurnRate = (burnRates.threeMonthAverage * 0.6) + (burnRates.sixMonthAverage * 0.4);
    
    // Calculate confidence scenarios
    const maxBurn = Math.max(burnRates.threeMonthAverage, burnRates.sixMonthAverage);
    const minBurn = Math.min(burnRates.threeMonthAverage, burnRates.sixMonthAverage);
    
    const conservativeBurn = maxBurn * 1.2; // 20% worse than worst
    const moderateBurn = averageBurnRate; // Weighted average
    const optimisticBurn = minBurn * 0.8; // 20% better than best
    
    // Calculate runway months for each scenario
    const calculateRunway = (burnRate: number) => {
      if (burnRate <= 0) return null; // Cash positive
      return Math.floor(currentBalance / burnRate);
    };

    const conservativeRunway = calculateRunway(conservativeBurn);
    const moderateRunway = calculateRunway(moderateBurn);
    const optimisticRunway = calculateRunway(optimisticBurn);

    // Calculate runway date
    const getRunwayDate = (months: number | null) => {
      if (!months) return null;
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
    };

    const runwayAnalysis: RunwayData = {
      monthsRemaining: moderateRunway,
      runwayDate: getRunwayDate(moderateRunway),
      currentBalance,
      averageBurnRate,
      burnRateTrend: burnTrend,
      confidence: {
        conservative: conservativeRunway,
        moderate: moderateRunway,
        optimistic: optimisticRunway
      }
    };

    return { runwayData: runwayAnalysis, burnRateDetails: burnRates };
  }, [historicalData, currentBalance]);

  if (!runwayData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">
              {locale?.startsWith('es') ? 'Datos insuficientes para análisis de runway' : 'Insufficient data for runway analysis'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  const getRunwayMonths = () => {
    return runwayData.confidence[selectedScenario];
  };

  const getRunwayDate = () => {
    const months = getRunwayMonths();
    if (!months || months <= 0) return null;
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
      case 'decelerating':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'decelerating':
        return 'text-green-600';
      case 'accelerating':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendText = (trend: string) => {
    if (locale?.startsWith('es')) {
      switch (trend) {
        case 'accelerating': return 'Acelerando';
        case 'decelerating': return 'Desacelerando';
        default: return 'Estable';
      }
    }
    return trend.charAt(0).toUpperCase() + trend.slice(1);
  };

  const currentMonths = getRunwayMonths();
  const isGeneratingCash = runwayData.averageBurnRate <= 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r px-6 py-4 ${
        isGeneratingCash ? 'from-green-500 to-emerald-600' : 
        currentMonths && currentMonths <= 6 ? 'from-red-500 to-red-600' :
        currentMonths && currentMonths <= 12 ? 'from-yellow-500 to-orange-600' :
        'from-blue-500 to-cyan-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {locale?.startsWith('es') ? 'Análisis de Runway' : 'Cash Runway Analysis'}
              </h3>
              <p className={`text-sm font-medium flex items-center space-x-1 text-white/90`}>
                {getTrendIcon(runwayData.burnRateTrend)}
                <span>{getTrendText(runwayData.burnRateTrend)}</span>
                <span className="text-white/70">
                  ({isGeneratingCash ? 
                    (locale?.startsWith('es') ? 'Generando' : 'Generating') :
                    (locale?.startsWith('es') ? 'Quemando' : 'Burning')
                  } cash)
                </span>
              </p>
            </div>
          </div>
          
          <HelpIcon 
            topic={helpTopics['dashboard.runway'] || helpTopics['dashboard.cashflow']} 
            size="sm" 
            className="text-white hover:text-gray-200"
          />
        </div>
      </div>

      <div className="p-6">
        {isGeneratingCash ? (
          <div className="space-y-4">
            {/* Cash Positive Status */}
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {locale?.startsWith('es') ? 'Estado Actual' : 'Current Status'}
                </span>
                <span className="text-2xl font-bold text-green-700">
                  {locale?.startsWith('es') ? 'Flujo Positivo' : 'Cash Positive'}
                </span>
              </div>
              
              <div className="mb-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="text-sm text-center text-green-700">
                  <span className="font-semibold">
                    {locale?.startsWith('es') ? 'Entradas > Salidas = Flujo Positivo ✓' : 'Inflow > Outflow = Cash Positive ✓'}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Generación Mensual' : 'Monthly Generation'}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    +{formatValue(Math.abs(runwayData.averageBurnRate))}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Current Balance */}
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">
                {locale?.startsWith('es') ? 'Balance Actual' : 'Current Balance'}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatValue(runwayData.currentBalance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Runway */}
            <div className={`p-4 rounded-xl border-2 ${
              currentMonths !== null && currentMonths <= 6 ? 'bg-red-50 border-red-200' : 
              currentMonths !== null && currentMonths <= 12 ? 'bg-yellow-50 border-yellow-200' : 
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {locale?.startsWith('es') ? 'Runway Actual' : 'Current Runway'}
                </span>
                <span className={`text-2xl font-bold ${
                  currentMonths !== null && currentMonths <= 6 ? 'text-red-700' :
                  currentMonths !== null && currentMonths <= 12 ? 'text-yellow-700' :
                  'text-green-700'
                }`}>
                  {currentMonths !== null ? 
                    `${currentMonths} ${locale?.startsWith('es') ? 'meses' : 'months'}` : 
                    '∞'}
                </span>
              </div>
              
              {currentMonths !== null && currentMonths > 0 && (
                <p className="text-sm text-gray-600 mb-3">
                  {locale?.startsWith('es') ? 'Hasta' : 'Until'} {formatDate(getRunwayDate())}
                </p>
              )}
              
              {/* Formula Display */}
              <div className="mb-3 p-3 bg-white/80 rounded-lg border border-gray-200">
                <div className="grid grid-cols-5 gap-2 items-center text-center">
                  <div>
                    <p className="text-xs text-gray-600">
                      {locale?.startsWith('es') ? 'Efectivo' : 'Current Cash'}
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatValue(runwayData.currentBalance)}
                    </p>
                  </div>
                  <div className="text-lg text-gray-500">÷</div>
                  <div>
                    <p className="text-xs text-gray-600">
                      {locale?.startsWith('es') ? 'Quema' : 'Burn Rate'}
                    </p>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatValue(runwayData.averageBurnRate)}
                    </p>
                  </div>
                  <div className="text-lg text-gray-500">=</div>
                  <div>
                    <p className="text-xs text-gray-600">Runway</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {currentMonths ?? '∞'} {locale?.startsWith('es') ? 'm' : 'mo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Analysis */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {locale?.startsWith('es') ? 'Análisis de Escenarios' : 'Scenario Analysis'}
                </span>
                <span className="text-xs text-gray-500">
                  {locale?.startsWith('es') ? 
                    'Ponderado: 60% × 3m + 40% × 6m' :
                    'Weighted: 60% × 3mo + 40% × 6mo'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedScenario('conservative')}
                  className={`p-3 rounded-lg text-xs font-medium transition-all border-2 ${
                    selectedScenario === 'conservative'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <div className="font-semibold">
                    {locale?.startsWith('es') ? 'Conservador' : 'Conservative'}
                  </div>
                  <div className="text-sm mt-1 font-normal">
                    {runwayData.confidence.conservative ?? '∞'} {locale?.startsWith('es') ? 'm' : 'mo'}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    {locale?.startsWith('es') ? 'Quema máx +20%' : 'Max burn +20%'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedScenario('moderate')}
                  className={`p-3 rounded-lg text-xs font-medium transition-all border-2 ${
                    selectedScenario === 'moderate'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <div className="font-semibold">
                    {locale?.startsWith('es') ? 'Moderado' : 'Moderate'}
                  </div>
                  <div className="text-sm mt-1 font-normal">
                    {runwayData.confidence.moderate ?? '∞'} {locale?.startsWith('es') ? 'm' : 'mo'}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    {locale?.startsWith('es') ? 'Prom. ponderado' : 'Weighted avg'}
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedScenario('optimistic')}
                  className={`p-3 rounded-lg text-xs font-medium transition-all border-2 ${
                    selectedScenario === 'optimistic'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <div className="font-semibold">
                    {locale?.startsWith('es') ? 'Optimista' : 'Optimistic'}
                  </div>
                  <div className="text-sm mt-1 font-normal">
                    {runwayData.confidence.optimistic ?? '∞'} {locale?.startsWith('es') ? 'm' : 'mo'}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    {locale?.startsWith('es') ? 'Quema mín -20%' : 'Min burn -20%'}
                  </div>
                </button>
              </div>
            </div>
            
            {/* Burn Rate Averages */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                {locale?.startsWith('es') ? 'Promedios Históricos' : 'Historical Averages'}
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Promedio 3 Meses' : '3-Month Average'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {burnRateDetails.threeMonthAverage === 0 ? 
                      (locale?.startsWith('es') ? 'Flujo Positivo' : 'Cash Positive') : 
                      formatValue(burnRateDetails.threeMonthAverage)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Promedio 6 Meses' : '6-Month Average'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {burnRateDetails.sixMonthAverage === 0 ? 
                      (locale?.startsWith('es') ? 'Flujo Positivo' : 'Cash Positive') : 
                      formatValue(burnRateDetails.sixMonthAverage)}
                  </span>
                </div>
                
                {burnRateDetails.twelveMonthAverage !== null && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">
                      {locale?.startsWith('es') ? 'Promedio 12 Meses' : '12-Month Average'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {burnRateDetails.twelveMonthAverage === 0 ? 
                        (locale?.startsWith('es') ? 'Flujo Positivo' : 'Cash Positive') : 
                        formatValue(burnRateDetails.twelveMonthAverage)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning for low runway */}
        {currentMonths !== null && currentMonths <= 6 && currentMonths > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {locale?.startsWith('es') ? '⚠️ Advertencia de Liquidez' : '⚠️ Low Cash Warning'}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {locale?.startsWith('es') ?
                    'Considera conseguir financiación o reducir gastos pronto' :
                    'Consider fundraising or reducing outflow soon'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashFlowRunwayAnalysis;