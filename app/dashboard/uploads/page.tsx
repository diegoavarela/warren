"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { UploadHistory } from '@/components/UploadHistory';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { 
  CloudArrowUpIcon,
  FunnelIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

export default function UploadsHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'profit_loss' | 'cash_flow' | 'balance_sheet'>('all');

  useEffect(() => {
    // Get company ID from session storage if available
    const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
    if (storedCompanyId) {
      setSelectedCompanyId(storedCompanyId);
    }
  }, []);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    sessionStorage.setItem('selectedCompanyId', companyId);
  };

  const handleNewUpload = () => {
    if (selectedCompanyId) {
      sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    }
    router.push('/upload');
  };

  return (
    <ProtectedRoute requireRole={[ROLES.ORGANIZATION_ADMIN, ROLES.USER]}>
      <AppLayout showFooter={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                    {locale?.startsWith('es') ? 'Historial de Cargas' : 'Upload History'}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {locale?.startsWith('es') 
                      ? 'Gestiona y revisa todos los archivos cargados'
                      : 'Manage and review all uploaded files'}
                  </p>
                </div>
                <Button
                  variant="gradient"
                  onClick={handleNewUpload}
                  leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                >
                  {locale?.startsWith('es') ? 'Nueva Carga' : 'New Upload'}
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardBody>
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Company Selector */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {locale?.startsWith('es') ? 'Empresa' : 'Company'}
                      </label>
                      <CompanySelector
                        selectedCompanyId={selectedCompanyId}
                        onCompanyChange={handleCompanyChange}
                        className="w-full"
                      />
                    </div>

                    {/* Date Filter */}
                    <div className="md:w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {locale?.startsWith('es') ? 'Período' : 'Period'}
                      </label>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">{locale?.startsWith('es') ? 'Todo' : 'All Time'}</option>
                        <option value="7days">{locale?.startsWith('es') ? 'Últimos 7 días' : 'Last 7 days'}</option>
                        <option value="30days">{locale?.startsWith('es') ? 'Últimos 30 días' : 'Last 30 days'}</option>
                        <option value="90days">{locale?.startsWith('es') ? 'Últimos 90 días' : 'Last 90 days'}</option>
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="md:w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {locale?.startsWith('es') ? 'Tipo' : 'Type'}
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">{locale?.startsWith('es') ? 'Todos' : 'All Types'}</option>
                        <option value="profit_loss">{locale?.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss'}</option>
                        <option value="cash_flow">{locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow'}</option>
                        <option value="balance_sheet">{locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <FunnelIcon className="w-4 h-4" />
                        <span>{locale?.startsWith('es') ? 'Filtros activos' : 'Active filters'}</span>
                      </span>
                      {(dateFilter !== 'all' || typeFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setDateFilter('all');
                            setTypeFilter('all');
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {locale?.startsWith('es') ? 'Limpiar filtros' : 'Clear filters'}
                        </button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Upload History List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {locale?.startsWith('es') ? 'Archivos Cargados' : 'Uploaded Files'}
                </CardTitle>
                <CardDescription>
                  {selectedCompanyId
                    ? (locale?.startsWith('es') 
                        ? 'Mostrando archivos de la empresa seleccionada'
                        : 'Showing files for the selected company')
                    : (locale?.startsWith('es')
                        ? 'Selecciona una empresa para ver sus archivos'
                        : 'Select a company to view its files')
                  }
                </CardDescription>
              </CardHeader>
              <CardBody>
                {selectedCompanyId ? (
                  <UploadHistory 
                    companyId={selectedCompanyId} 
                    limit={50} 
                    showActions={true} 
                  />
                ) : (
                  <div className="text-center py-12">
                    <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {locale?.startsWith('es') 
                        ? 'Selecciona una empresa para ver su historial de cargas'
                        : 'Select a company to view its upload history'}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}