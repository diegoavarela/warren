"use client";

import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { KeyInsights } from './KeyInsights';
import { WarrenChart, CHART_CONFIGS, formatCurrency } from '../charts/WarrenChart';
import { 
  BanknotesIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface ExecutiveDashboardData {
  currentCashPosition: number;
  revenueGrowthYTD: number;
  cashRunwayMonths: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  grossProfit: number;
  grossMargin: number;
  operatingIncome: number;
  operatingMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  previousMonth?: {
    revenue: number;
    expenses: number;
    netIncome: number;
    cashFlow: number;
  };
}

interface ExecutiveDashboardProps {
  companyId?: string;
  currency?: string;
}

export function ExecutiveDashboard({ companyId, currency = '$' }: ExecutiveDashboardProps) {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData();
    } else {
      // Use mock data for now
      setData(getMockData());
      setLoading(false);
    }
  }, [companyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/companies/${companyId}/financial-analytics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const apiData = result.data;
        
        // Transform API data to dashboard format
        const dashboardData: ExecutiveDashboardData = {
          currentCashPosition: apiData.currentMonth?.revenue || 0,
          revenueGrowthYTD: calculateGrowthPercentage(
            apiData.yearToDate?.revenue || 0,
            apiData.previousMonth?.revenue || 0
          ),
          cashRunwayMonths: 6, // This would need to be calculated based on burn rate
          totalRevenue: apiData.currentMonth?.revenue || 0,
          totalExpenses: (apiData.currentMonth?.operatingExpenses || 0) + (apiData.currentMonth?.cogs || 0),
          netIncome: apiData.currentMonth?.netIncome || 0,
          cashFlow: apiData.currentMonth?.revenue - apiData.currentMonth?.operatingExpenses || 0,
          grossProfit: apiData.currentMonth?.grossProfit || 0,
          grossMargin: apiData.currentMonth?.grossMargin || 0,
          operatingIncome: apiData.currentMonth?.operatingIncome || 0,
          operatingMargin: apiData.currentMonth?.operatingMargin || 0,
          ebitda: apiData.currentMonth?.ebitda || 0,
          ebitdaMargin: apiData.currentMonth?.ebitdaMargin || 0,
          previousMonth: apiData.previousMonth ? {
            revenue: apiData.previousMonth.revenue,
            expenses: apiData.previousMonth.operatingExpenses + apiData.previousMonth.cogs,
            netIncome: apiData.previousMonth.netIncome,
            cashFlow: apiData.previousMonth.revenue - apiData.previousMonth.operatingExpenses
          } : undefined
        };
        
        setData(dashboardData);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      // Fallback to mock data
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): ExecutiveDashboardData => ({
    currentCashPosition: 2400000,
    revenueGrowthYTD: 18,
    cashRunwayMonths: 6,
    totalRevenue: 1350000,
    totalExpenses: 980000,
    netIncome: 370000,
    cashFlow: 270000,
    grossProfit: 810000,
    grossMargin: 60.0,
    operatingIncome: 330000,
    operatingMargin: 24.4,
    ebitda: 350000,
    ebitdaMargin: 25.9,
    previousMonth: {
      revenue: 1200000,
      expenses: 900000,
      netIncome: 300000,
      cashFlow: 240000
    }
  });

  const calculateGrowthPercentage = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="text-red-800 font-medium mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600 text-sm">{error || 'No data available'}</p>
      </div>
    );
  }

  const heroCards = [
    {
      title: 'Posición de Efectivo',
      value: formatCurrency(data.currentCashPosition),
      icon: <BanknotesIcon className="h-6 w-6" />,
      color: 'emerald' as const,
      subtitle: 'Liquidez actual',
      trend: 'up' as const,
      changePercent: 5.2
    },
    {
      title: 'Crecimiento de Ingresos',
      value: formatPercentage(data.revenueGrowthYTD),
      icon: <ArrowTrendingUpIcon className="h-6 w-6" />,
      color: 'blue' as const,
      subtitle: 'Año a la fecha',
      trend: data.revenueGrowthYTD > 0 ? 'up' as const : 'down' as const,
      changePercent: Math.abs(data.revenueGrowthYTD)
    },
    {
      title: 'Runway de Efectivo',
      value: `${data.cashRunwayMonths} Mo`,
      icon: <ClockIcon className="h-6 w-6" />,
      color: data.cashRunwayMonths > 6 ? 'emerald' as const : data.cashRunwayMonths > 3 ? 'orange' as const : 'rose' as const,
      subtitle: 'Meses restantes',
      trend: 'neutral' as const
    },
    {
      title: 'Flujo de Efectivo',
      value: formatCurrency(data.cashFlow),
      icon: <ChartBarIcon className="h-6 w-6" />,
      color: data.cashFlow > 0 ? 'emerald' as const : 'rose' as const,
      subtitle: 'Mes actual',
      trend: data.cashFlow > (data.previousMonth?.cashFlow || 0) ? 'up' as const : 'down' as const,
      changePercent: data.previousMonth?.cashFlow ? 
        calculateGrowthPercentage(data.cashFlow, data.previousMonth.cashFlow) : 0
    }
  ];

  const financialCards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(data.totalRevenue),
      previousValue: data.previousMonth?.revenue,
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      color: 'emerald' as const,
      trend: data.previousMonth?.revenue ? 
        (data.totalRevenue > data.previousMonth.revenue ? 'up' as const : 'down' as const) : 'neutral' as const,
      changePercent: data.previousMonth?.revenue ? 
        calculateGrowthPercentage(data.totalRevenue, data.previousMonth.revenue) : undefined
    },
    {
      title: 'Gastos Operacionales',
      value: formatCurrency(data.totalExpenses),
      previousValue: data.previousMonth?.expenses,
      icon: <ArrowTrendingDownIcon className="h-5 w-5" />,
      color: 'rose' as const,
      trend: data.previousMonth?.expenses ? 
        (data.totalExpenses < data.previousMonth.expenses ? 'up' as const : 'down' as const) : 'neutral' as const,
      changePercent: data.previousMonth?.expenses ? 
        calculateGrowthPercentage(data.totalExpenses, data.previousMonth.expenses) : undefined
    },
    {
      title: 'Utilidad Neta',
      value: formatCurrency(data.netIncome),
      previousValue: data.previousMonth?.netIncome,
      icon: <BanknotesIcon className="h-5 w-5" />,
      color: data.netIncome > 0 ? 'emerald' as const : 'rose' as const,
      trend: data.previousMonth?.netIncome ? 
        (data.netIncome > data.previousMonth.netIncome ? 'up' as const : 'down' as const) : 'neutral' as const,
      changePercent: data.previousMonth?.netIncome ? 
        calculateGrowthPercentage(data.netIncome, data.previousMonth.netIncome) : undefined
    },
    {
      title: 'EBITDA',
      value: formatCurrency(data.ebitda),
      subtitle: `${data.ebitdaMargin.toFixed(1)}% margen`,
      icon: <ChartBarIcon className="h-5 w-5" />,
      color: 'purple' as const,
      trend: 'up' as const,
      changePercent: 12.5
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section - Key Executive KPIs */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
            Métricas Ejecutivas
          </h2>
          <p className="text-gray-600 mt-1">Indicadores clave de rendimiento financiero</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {heroCards.map((card, index) => (
            <KPICard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              subtitle={card.subtitle}
              trend={card.trend}
              changePercent={card.changePercent}
              sparkle={true}
              large={false}
            />
          ))}
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Resumen Financiero</h3>
          <p className="text-gray-600 mt-1">Desempeño financiero del mes actual</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialCards.map((card, index) => (
            <KPICard
              key={index}
              title={card.title}
              value={card.value}
              previousValue={card.previousValue}
              icon={card.icon}
              color={card.color}
              subtitle={card.subtitle}
              trend={card.trend}
              changePercent={card.changePercent}
              currency={currency}
              sparkle={false}
            />
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Rendimiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{data.grossMargin.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Margen Bruto</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.operatingMargin.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Margen Operacional</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{data.ebitdaMargin.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Margen EBITDA</div>
          </div>
        </div>
      </div>

      {/* Key Insights Section */}
      <KeyInsights 
        data={{
          revenue: data.totalRevenue,
          expenses: data.totalExpenses,
          netIncome: data.netIncome,
          grossMargin: data.grossMargin,
          operatingMargin: data.operatingMargin,
          cashFlow: data.cashFlow,
          previousMonth: data.previousMonth
        }}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <WarrenChart
          data={getRevenueChartData()}
          config={{
            ...CHART_CONFIGS.revenue,
            height: 300
          }}
          title="Tendencia de Ingresos"
          subtitle="Últimos 6 meses"
          currency="$"
          formatValue={(value) => formatCurrency(value)}
        />

        {/* Cash Flow Chart */}
        <WarrenChart
          data={getCashFlowChartData()}
          config={{
            ...CHART_CONFIGS.cashFlow,
            height: 300
          }}
          title="Flujo de Efectivo"
          subtitle="Ingresos vs Gastos"
          currency="$"
          formatValue={(value) => formatCurrency(value)}
        />
      </div>
    </div>
  );

  // Helper functions for chart data
  function getRevenueChartData() {
    // Mock data - in real app this would come from API
    return [
      { month: 'Jul', revenue: 1100000 },
      { month: 'Ago', revenue: 1250000 },
      { month: 'Sep', revenue: 1180000 },
      { month: 'Oct', revenue: 1320000 },
      { month: 'Nov', revenue: 1280000 },
      { month: 'Dic', revenue: data?.totalRevenue || 0 }
    ];
  }

  function getCashFlowChartData() {
    // Mock data - in real app this would come from API
    return [
      { month: 'Jul', inflow: 1100000, outflow: 850000, net: 250000 },
      { month: 'Ago', inflow: 1250000, outflow: 920000, net: 330000 },
      { month: 'Sep', inflow: 1180000, outflow: 980000, net: 200000 },
      { month: 'Oct', inflow: 1320000, outflow: 950000, net: 370000 },
      { month: 'Nov', inflow: 1280000, outflow: 960000, net: 320000 },
      { month: 'Dic', inflow: data?.totalRevenue || 0, outflow: data?.totalExpenses || 0, net: data?.cashFlow || 0 }
    ];
  }
}