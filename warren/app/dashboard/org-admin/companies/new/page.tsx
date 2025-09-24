"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";
import CompanyForm, { CompanyFormData } from '@/shared/components/CompanyForm';

export default function NewCompanyPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { hasFeature } = useFeatures();
  const [loading, setLoading] = useState(false);
  const [connectToQuickBooks, setConnectToQuickBooks] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  const quickbooksEnabled = hasFeature('quickbooks_integration');

  const handleSubmit = async (formData: CompanyFormData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organizationId: user?.organizationId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const companyId = data.company?.id;
        setCreatedCompanyId(companyId);

        // If user wants to connect to QuickBooks, redirect to OAuth flow
        if (connectToQuickBooks && companyId && quickbooksEnabled) {
          window.location.href = `/api/quickbooks/connect?companyId=${companyId}`;
        } else {
          // Success - redirect to org admin dashboard
          router.push('/dashboard/org-admin');
        }
      } else {
        // Handle error
        alert(data.error || 'Failed to create company');
      }
    } catch (error) {
      console.error('Company creation error:', error);
      alert('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN, ROLES.ORGANIZATION_ADMIN]}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {locale?.startsWith('es') ? 'Volver' : 'Back'}
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Nueva Empresa' : 'New Company'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es') 
                ? 'Completa la información para crear una nueva empresa'
                : 'Fill in the information to create a new company'}
            </p>
          </div>

          <CompanyForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            mode="create"
            organizationId={user?.organizationId}
            locale={locale || 'en-US'}
          />

          {/* QuickBooks Integration Option */}
          {quickbooksEnabled && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LinkIcon className="w-5 h-5 mr-2" />
                    {locale?.startsWith('es') ? 'Integración con QuickBooks' : 'QuickBooks Integration'}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="connectToQuickBooks"
                      checked={connectToQuickBooks}
                      onChange={(e) => setConnectToQuickBooks(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="connectToQuickBooks" className="text-sm font-medium text-gray-700">
                      {locale?.startsWith('es')
                        ? 'Conectar con QuickBooks después de crear la empresa'
                        : 'Connect to QuickBooks after creating the company'}
                    </label>
                  </div>
                  {connectToQuickBooks && (
                    <p className="mt-2 text-sm text-gray-500">
                      {locale?.startsWith('es')
                        ? 'Serás redirigido a QuickBooks para autorizar el acceso a tus datos financieros.'
                        : "You'll be redirected to QuickBooks to authorize access to your financial data."}
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}