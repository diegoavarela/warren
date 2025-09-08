"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";

export default function AnalyticsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [dateRange, setDateRange] = useState('30d');
  
  // Mock data for charts
  const metrics = {
    totalDocuments: 1247,
    documentsGrowth: 23.5,
    activeUsers: 142,
    usersGrowth: 18.2,
    processingTime: 2.3,
    processingGrowth: -15.4,
    storageUsed: 67.8,
    storageGrowth: 12.1
  };

  const activityData = [
    { date: '2024-01-01', documents: 32, users: 12 },
    { date: '2024-01-02', documents: 45, users: 15 },
    { date: '2024-01-03', documents: 38, users: 18 },
    { date: '2024-01-04', documents: 52, users: 20 },
    { date: '2024-01-05', documents: 41, users: 16 },
    { date: '2024-01-06', documents: 35, users: 14 },
    { date: '2024-01-07', documents: 48, users: 22 }
  ];

  const topCompanies = [
    { name: 'Empresa Demo SA de CV', documents: 412, percentage: 33 },
    { name: 'Comercializadora XYZ', documents: 287, percentage: 23 },
    { name: 'Tech Solutions Ltd', documents: 201, percentage: 16 },
    { name: 'Global Services Inc', documents: 189, percentage: 15 },
    { name: 'Innovation Corp', documents: 158, percentage: 13 }
  ];

  const systemResources = [
    {
      name: locale?.startsWith('es') ? 'CPU' : 'CPU',
      usage: 45,
      status: 'healthy',
      icon: CpuChipIcon
    },
    {
      name: locale?.startsWith('es') ? 'Memoria' : 'Memory',
      usage: 68,
      status: 'warning',
      icon: ServerIcon
    },
    {
      name: locale?.startsWith('es') ? 'Almacenamiento' : 'Storage',
      usage: 72,
      status: 'warning',
      icon: CircleStackIcon
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    suffix = '' 
  }: { 
    title: string; 
    value: number | string; 
    growth: number; 
    icon: any;
    suffix?: string;
  }) => (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-gray-100">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
          <div className={`flex items-center text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growth >= 0 ? (
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
            )}
            <span>{Math.abs(growth)}%</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {value}{suffix}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </CardBody>
    </Card>
  );

  return (
    <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN, ROLES.ORGANIZATION_ADMIN]}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Análisis del Sistema' : 'System Analytics'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es') 
                    ? 'Métricas y estadísticas del sistema'
                    : 'System metrics and statistics'}
                </p>
              </div>
              
              {/* Date Range Selector */}
              <div className="flex items-center space-x-4">
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="7d">{locale?.startsWith('es') ? 'Últimos 7 días' : 'Last 7 days'}</option>
                  <option value="30d">{locale?.startsWith('es') ? 'Últimos 30 días' : 'Last 30 days'}</option>
                  <option value="90d">{locale?.startsWith('es') ? 'Últimos 90 días' : 'Last 90 days'}</option>
                  <option value="1y">{locale?.startsWith('es') ? 'Último año' : 'Last year'}</option>
                </select>
                
                <Button
                  variant="outline"
                  leftIcon={<DocumentArrowDownIcon className="w-4 h-4" />}
                >
                  {locale?.startsWith('es') ? 'Exportar' : 'Export'}
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title={locale?.startsWith('es') ? 'Documentos Procesados' : 'Documents Processed'}
              value={metrics.totalDocuments.toLocaleString()}
              growth={metrics.documentsGrowth}
              icon={DocumentTextIcon}
            />
            <MetricCard
              title={locale?.startsWith('es') ? 'Usuarios Activos' : 'Active Users'}
              value={metrics.activeUsers}
              growth={metrics.usersGrowth}
              icon={UserGroupIcon}
            />
            <MetricCard
              title={locale?.startsWith('es') ? 'Tiempo Promedio' : 'Avg Processing Time'}
              value={metrics.processingTime}
              growth={metrics.processingGrowth}
              icon={CpuChipIcon}
              suffix="s"
            />
            <MetricCard
              title={locale?.startsWith('es') ? 'Almacenamiento' : 'Storage Used'}
              value={metrics.storageUsed}
              growth={metrics.storageGrowth}
              icon={CircleStackIcon}
              suffix=" GB"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Activity Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Actividad del Sistema' : 'System Activity'}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {/* Simplified chart visualization */}
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {activityData.map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full space-y-1">
                          <div 
                            className="bg-blue-500 rounded-t"
                            style={{ height: `${(day.documents / 52) * 100}%` }}
                          ></div>
                          <div 
                            className="bg-green-500 rounded-t"
                            style={{ height: `${(day.users / 22) * 50}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center space-x-6 mt-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">
                        {locale?.startsWith('es') ? 'Documentos' : 'Documents'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">
                        {locale?.startsWith('es') ? 'Usuarios' : 'Users'}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {locale?.startsWith('es') ? 'Recursos del Sistema' : 'System Resources'}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {systemResources.map((resource, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <resource.icon className="w-4 h-4 text-gray-600 mr-2" />
                          <span className="text-sm font-medium text-gray-700">
                            {resource.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{resource.usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(resource.status)}`}
                          style={{ width: `${resource.usage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Top Companies */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>
                {locale?.startsWith('es') ? 'Empresas Más Activas' : 'Most Active Companies'}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {topCompanies.map((company, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {company.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {company.documents} {locale?.startsWith('es') ? 'documentos' : 'documents'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${company.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}