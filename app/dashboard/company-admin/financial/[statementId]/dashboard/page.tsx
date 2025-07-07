'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MayResumenPyG } from '@/components/dashboard/MayResumenPyG';
import { PuntosClave } from '@/components/dashboard/PuntosClave';
import { RevenueGrowthAnalysis } from '@/components/dashboard/RevenueGrowthAnalysis';
import { PersonnelCostBreakdown } from '@/components/dashboard/PersonnelCostBreakdown';
import { CostStructure } from '@/components/dashboard/CostStructure';
import { PerformanceHeatMap } from '@/components/dashboard/PerformanceHeatMap';
import { TrendForecastChart } from '@/components/dashboard/TrendForecastChart';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ScaleIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  hasData: boolean;
  uploadedFileName?: string;
  currentMonth?: any;
  previousMonth?: any;
  yearToDate?: any;
  summary?: any;
  chartData?: any[];
}

function FinancialDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get company ID from session storage or user context
        const companyId = sessionStorage.getItem('selectedCompanyId') || user?.selectedCompanyId;
        
        if (!companyId) {
          setError('No se ha seleccionado una empresa');
          setLoading(false);
          return;
        }

        console.log('Fetching dashboard data for company:', companyId, 'statement:', params.statementId);

        // Fetch company details
        const companyResponse = await fetch(`/api/v1/companies/${companyId}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          setCompanyName(companyData.data.name);
        }

        const response = await fetch(
          `/api/v1/companies/${companyId}/financial-analytics?statementId=${params.statementId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(errorData.error?.message || 'Failed to fetch dashboard data');
        }

        const result = await response.json();
        console.log('Dashboard data received:', result);
        setDashboardData(result.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.selectedCompanyId, params.statementId]);

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">
                {locale?.startsWith('es') ? 'Cargando dashboard financiero...' : 'Loading financial dashboard...'}
              </p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error || !dashboardData?.hasData) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-6">{error || 'Dashboard no disponible'}</p>
              <button
                onClick={() => router.push('/dashboard/company-admin/financial')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {locale?.startsWith('es') ? 'Volver a la lista' : 'Back to list'}
              </button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const { currentMonth, previousMonth, chartData = [] } = dashboardData;

  // Ensure we have current month data
  if (!currentMonth) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-red-600 mb-4">No hay datos del período actual</p>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800"
              >
                Volver
              </button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentMonth.revenue, previousMonth?.revenue || 0);
  const profitGrowth = calculateGrowth(currentMonth.netIncome, previousMonth?.netIncome || 0);
  const ebitdaGrowth = calculateGrowth(currentMonth.ebitda, previousMonth?.ebitda || 0);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <button
                  onClick={() => router.push('/dashboard/company-admin/financial')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>{locale?.startsWith('es') ? 'Volver a estados financieros' : 'Back to financial statements'}</span>
                </button>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Panel de Pérdidas y Ganancias
                    </h1>
                    <p className="text-sm text-gray-600">
                      Análisis de rendimiento financiero e información
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                      Export Executive Report
                    </button>
                  </div>
                </div>
                
                {/* File Status Card */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">PL</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-900">
                      Super Estado de PyG
                    </h3>
                    <p className="text-xs text-green-700">
                      Actualmente cargado: {dashboardData.uploadedFileName || 'PnL_2024.xlsx'}
                    </p>
                  </div>
                </div>
              </div>

              {/* May Resumen de PyG - 5 KPI Cards */}
              <MayResumenPyG 
                currentMonth={currentMonth}
                previousMonth={previousMonth}
              />

              {/* Puntos Clave - Key Insights */}
              <PuntosClave 
                currentMonth={currentMonth}
                previousMonth={previousMonth}
                yearToDate={dashboardData.yearToDate}
              />

              {/* Main Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <RevenueGrowthAnalysis 
                  chartData={chartData}
                  currentMonth={currentMonth}
                  previousMonth={previousMonth}
                />
                
                <PersonnelCostBreakdown 
                  currentMonth={currentMonth}
                />
              </div>

              {/* Secondary Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <CostStructure 
                  currentMonth={currentMonth}
                />
                
                <PerformanceHeatMap 
                  chartData={chartData}
                />
              </div>

              {/* Trend Forecast */}
              <div className="mb-8">
                <TrendForecastChart 
                  chartData={chartData}
                />
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-lg shadow-md p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Margen Bruto</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(currentMonth.grossMargin || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Margen Operativo</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(currentMonth.operatingMargin || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Margen EBITDA</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(currentMonth.ebitdaMargin || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Margen Neto</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(currentMonth.netMargin || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function FinancialDashboardPageWrapper() {
  return <FinancialDashboardPage />;
}