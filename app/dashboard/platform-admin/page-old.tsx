"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlusIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  DocumentTextIcon,
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Stats {
  totalOrganizations: number;
  totalCompanies: number;
  totalUsers: number;
  activeUsers: number;
}

interface Activity {
  id: string;
  type: 'company_created' | 'user_added' | 'template_created' | 'system_update';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'info';
}

function PlatformAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 1,
    totalCompanies: 2,
    totalUsers: 5,
    activeUsers: 4
  });

  const [activities] = useState<Activity[]>([
    {
      id: '1',
      type: 'company_created',
      title: locale?.startsWith('es') ? 'Nueva empresa creada' : 'New company created',
      description: 'Comercializadora XYZ',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'success'
    },
    {
      id: '2',
      type: 'user_added',
      title: locale?.startsWith('es') ? 'Usuario agregado' : 'User added',
      description: 'user@demo.com',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      status: 'info'
    },
    {
      id: '3',
      type: 'template_created',
      title: locale?.startsWith('es') ? 'Plantilla creada' : 'Template created',
      description: locale?.startsWith('es') ? 'Estado de Resultados Estándar' : 'Standard Income Statement',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status: 'success'
    }
  ]);

  const quickActions = [
    {
      title: locale?.startsWith('es') ? 'Administrar Organizaciones' : 'Manage Organizations',
      description: locale?.startsWith('es') ? 'Ver y gestionar todas las organizaciones' : 'View and manage all organizations',
      icon: BuildingOfficeIcon,
      action: () => router.push('/dashboard/platform-admin/organizations'),
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: locale?.startsWith('es') ? 'Crear Organización' : 'Create Organization',
      description: locale?.startsWith('es') ? 'Agregar nueva organización al sistema' : 'Add new organization to the system',
      icon: PlusIcon,
      action: () => router.push('/dashboard/platform-admin/organizations/new'),
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600'
    },
    {
      title: locale?.startsWith('es') ? 'Análisis del Sistema' : 'System Analytics',
      description: locale?.startsWith('es') ? 'Ver métricas y uso del sistema' : 'View system metrics and usage',
      icon: ChartBarIcon,
      action: () => router.push('/dashboard/platform-admin/analytics'),
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: locale?.startsWith('es') ? 'Configuración' : 'Settings',
      description: locale?.startsWith('es') ? 'Configuración del sistema' : 'System configuration',
      icon: CogIcon,
      action: () => router.push('/dashboard/platform-admin/settings'),
      color: 'gray',
      gradient: 'from-gray-500 to-gray-600'
    }
  ];

  const statCards = [
    {
      title: locale?.startsWith('es') ? 'Organizaciones' : 'Organizations',
      value: stats.totalOrganizations,
      icon: BuildingOfficeIcon,
      color: 'blue',
      gradient: 'from-blue-600 to-purple-600',
      trend: '+12%',
      onClick: () => router.push('/dashboard/platform-admin/organizations')
    },
    {
      title: locale?.startsWith('es') ? 'Empresas Totales' : 'Total Companies',
      value: stats.totalCompanies,
      icon: BuildingOfficeIcon,
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      trend: '+23%',
      onClick: () => router.push('/dashboard/platform-admin/companies')
    },
    {
      title: locale?.startsWith('es') ? 'Usuarios Totales' : 'Total Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      trend: '+18%',
      onClick: () => router.push('/dashboard/platform-admin/users')
    },
    {
      title: locale?.startsWith('es') ? 'Usuarios Activos' : 'Active Users',
      value: stats.activeUsers,
      icon: UserGroupIcon,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      trend: '+5%',
      onClick: () => router.push('/dashboard/platform-admin/users?filter=active')
    }
  ];

  const systemHealth = [
    {
      name: locale?.startsWith('es') ? 'Servidor API' : 'API Server',
      status: 'operational',
      uptime: '99.9%',
      icon: ServerIcon
    },
    {
      name: locale?.startsWith('es') ? 'Base de Datos' : 'Database',
      status: 'operational',
      uptime: '99.8%',
      icon: CircleStackIcon
    },
    {
      name: locale?.startsWith('es') ? 'Procesador de Archivos' : 'File Processor',
      status: 'operational',
      uptime: '100%',
      icon: CpuChipIcon
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'company_created':
        return BuildingOfficeIcon;
      case 'user_added':
        return UserGroupIcon;
      case 'template_created':
        return DocumentTextIcon;
      case 'system_update':
        return CogIcon;
    }
  };

  const getActivityStatusColor = (status: Activity['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return locale?.startsWith('es') ? 'hace un momento' : 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return locale?.startsWith('es') ? `hace ${minutes} minuto${minutes > 1 ? 's' : ''}` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return locale?.startsWith('es') ? `hace ${hours} hora${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return locale?.startsWith('es') ? `hace ${days} día${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section with Gradient */}
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="relative">
            <h1 className="text-4xl font-bold mb-2">
              {locale?.startsWith('es') ? 'Panel de Administración de Plataforma' : 'Platform Administration'}
            </h1>
            <p className="text-blue-100 text-lg">
              {locale?.startsWith('es') 
                ? `Bienvenido de vuelta, ${user?.firstName}. Gestiona todas las organizaciones del sistema Warren.`
                : `Welcome back, ${user?.firstName}. Manage all organizations in the Warren system.`}
            </p>
          </div>
        </div>

        {/* Stats Grid with Clickable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={index} 
              className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={stat.onClick}
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 text-sm">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">{stat.trend}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions and System Health */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">✨</span>
                {locale?.startsWith('es') ? 'Acciones Rápidas' : 'Quick Actions'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={action.action}
                  >
                    <CardBody className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${action.gradient} group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">🏥</span>
                  {locale?.startsWith('es') ? 'Salud del Sistema' : 'System Health'}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {systemHealth.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <service.icon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{service.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">Uptime: {service.uptime}</span>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`}></div>
                          <span className="text-sm font-medium text-green-600">
                            {locale?.startsWith('es') ? 'Operativo' : 'Operational'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-gray-600" />
                    {locale?.startsWith('es') ? 'Actividad Reciente' : 'Recent Activity'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/platform-admin/activity')}
                  >
                    {locale?.startsWith('es') ? 'Ver todo' : 'View all'}
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div 
                        key={activity.id} 
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => console.log('Navigate to activity details')}
                      >
                        <div className={`p-2 rounded-lg ${getActivityStatusColor(activity.status)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PlatformAdminPage() {
  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN]}>
      <PlatformAdminDashboard />
    </ProtectedRoute>
  );
}