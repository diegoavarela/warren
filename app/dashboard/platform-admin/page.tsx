"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface PlatformStats {
  totalOrganizations: number;
  totalCompanies: number;
  totalUsers: number;
}

function PlatformAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [stats, setStats] = useState<PlatformStats>({
    totalOrganizations: 0,
    totalCompanies: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  const fetchPlatformStats = async () => {
    try {
      const response = await fetch('/api/platform/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalOrganizations: data.totalOrganizations || 0,
          totalCompanies: data.totalCompanies || 0,
          totalUsers: data.totalUsers || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: locale?.startsWith('es') ? 'Organizaciones' : 'Organizations',
      value: stats.totalOrganizations,
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
      route: '/dashboard/platform-admin/organizations'
    },
    {
      title: locale?.startsWith('es') ? 'Empresas' : 'Companies',
      value: stats.totalCompanies,
      icon: BuildingOfficeIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600',
      route: '/dashboard/platform-admin/companies'
    },
    {
      title: locale?.startsWith('es') ? 'Usuarios Totales' : 'Total Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
      route: '/dashboard/platform-admin/users'
    }
  ];

  const quickActions = [
    {
      title: locale?.startsWith('es') ? 'Gestionar Organizaciones' : 'Manage Organizations',
      icon: BuildingOfficeIcon,
      action: () => router.push('/dashboard/platform-admin/organizations'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    {
      title: locale?.startsWith('es') ? 'Crear Organización' : 'Create Organization',
      icon: PlusIcon,
      action: () => router.push('/dashboard/platform-admin/organizations/new'),
      color: 'bg-emerald-600',
      hoverColor: 'hover:bg-emerald-700'
    }
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale || 'en-US').format(num);
  };

  return (
    <AppLayout showFooter={true}>
      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-100 opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-100 opacity-20 blur-3xl" />
        </div>
        
        <div className="relative p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {locale?.startsWith('es') 
                    ? `Bienvenido, ${user?.firstName}`
                    : `Welcome, ${user?.firstName}`}
                </h1>
                <p className="text-lg text-gray-600">
                  {locale?.startsWith('es') 
                    ? 'Panel de administración de plataforma'
                    : 'Platform administration panel'}
                </p>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600">
                      {locale?.startsWith('es') ? 'Sistema operativo' : 'System operational'}
                    </span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-600">
                    {new Date().toLocaleDateString(locale || 'en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 blur-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                onClick={() => router.push(stat.route)}
                className={`group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Card content */}
                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:bg-white/20 transition-all duration-300`}>
                      <Icon className={`w-6 h-6 ${stat.color} group-hover:text-white transition-all duration-300`} />
                    </div>
                    <div className="flex items-center space-x-1">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 group-hover:text-white transition-all duration-300" />
                      <span className="text-xs font-medium text-green-600 group-hover:text-white transition-all duration-300">
                        +12%
                      </span>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 group-hover:text-white transition-all duration-300">
                    {loading ? (
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                    ) : (
                      formatNumber(stat.value)
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 group-hover:text-white transition-all duration-300">
                    {stat.title}
                  </p>
                  
                  {/* View details link */}
                  <div className="mt-4 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-white">
                      {locale?.startsWith('es') ? 'Ver detalles' : 'View details'}
                    </span>
                    <svg className="w-4 h-4 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {locale?.startsWith('es') ? 'Acciones Rápidas' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={`group relative overflow-hidden ${action.color} ${action.hoverColor} text-white rounded-2xl p-8 transition-all transform hover:scale-[1.02] hover:shadow-2xl text-left`}
                >
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  
                  {/* Icon with background */}
                  <div className="relative mb-4">
                    <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors duration-300">
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>
                  
                  {/* Text content */}
                  <h3 className="font-semibold text-xl mb-2">{action.title}</h3>
                  <p className="text-sm text-white/80 group-hover:text-white/90 transition-colors">
                    {index === 0 
                      ? (locale?.startsWith('es') ? 'Ver y gestionar todas las organizaciones' : 'View and manage all organizations')
                      : (locale?.startsWith('es') ? 'Configurar una nueva organización' : 'Set up a new organization')
                    }
                  </p>
                  
                  {/* Arrow indicator */}
                  <div className="absolute bottom-4 right-4 transform translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white/60 group-hover:text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}

export default function PlatformAdminPage() {
  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN]}>
      <PlatformAdminDashboard />
    </ProtectedRoute>
  );
}