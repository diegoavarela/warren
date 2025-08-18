"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { AIChat } from '@/components/dashboard/AIChat';
import { ArrowLeftIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
}

function FinancialChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    const companyName = sessionStorage.getItem('selectedCompanyName');
    
    console.log('🔍 CHAT PAGE DEBUG - Session storage values:');
    console.log('  selectedCompanyId:', companyId);
    console.log('  selectedCompanyName:', companyName);
    
    if (companyId) {
      setSelectedCompanyId(companyId);
      
      // Try to get company details
      if (companyName) {
        setSelectedCompany({
          id: companyId,
          name: companyName,
        });
      } else {
        // Fetch company details
        fetchCompanyDetails(companyId);
      }
    } else {
      // No company selected, redirect back to admin
      router.push('/dashboard/company-admin');
      return;
    }
    
    setLoading(false);
  }, [router]);

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedCompany(data.data);
          sessionStorage.setItem('selectedCompanyName', data.data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const handleBackToAdmin = () => {
    router.push('/dashboard/company-admin');
  };

  if (loading) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardBody className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {locale?.startsWith('es') ? 'Empresa no seleccionada' : 'No Company Selected'}
              </h3>
              <p className="text-gray-600 mb-6">
                {locale?.startsWith('es') 
                  ? 'Por favor selecciona una empresa para acceder al chat financiero.'
                  : 'Please select a company to access the financial chat.'}
              </p>
              <Button variant="primary" onClick={handleBackToAdmin}>
                {locale?.startsWith('es') ? 'Volver a Administración' : 'Back to Administration'}
              </Button>
            </CardBody>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showFooter={false}>
      <div className="h-screen flex flex-col">
        {/* Compact Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={handleBackToAdmin}
                className="mr-4"
                leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
              >
                {locale?.startsWith('es') ? 'Volver' : 'Back'}
              </Button>
              <div className="flex items-center">
                <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-purple-600 mr-2" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {locale?.startsWith('es') ? 'Chat Financiero con IA' : 'AI Financial Chat'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {selectedCompany.name} • {locale?.startsWith('es') ? 'Chat inteligente para análisis financiero' : 'Intelligent chat for financial analysis'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Company Info & Quick Actions */}
            <div className="flex items-center space-x-4">
              {/* Company Details */}
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium">{selectedCompany.name}</span>
                  {selectedCompany.industry && (
                    <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">{selectedCompany.industry}</span>
                  )}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                    router.push('/dashboard/company-admin/pnl');
                  }}
                  className="text-xs"
                >
                  {locale?.startsWith('es') ? 'P&L' : 'P&L'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                    router.push('/dashboard/company-admin/cashflow');
                  }}
                  className="text-xs"
                >
                  {locale?.startsWith('es') ? 'Cash Flow' : 'Cash Flow'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                    router.push('/upload');
                  }}
                  className="text-xs"
                >
                  {locale?.startsWith('es') ? 'Subir' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Height Chat Interface */}
        <div className="flex-1 min-h-0">
          <AIChat />
        </div>
      </div>
    </AppLayout>
  );
}

export default function FinancialChatPageRoute() {
  return (
    <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <FinancialChatPage />
    </ProtectedRoute>
  );
}