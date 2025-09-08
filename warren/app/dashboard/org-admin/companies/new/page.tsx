"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";
import CompanyForm, { CompanyFormData } from '@/shared/components/CompanyForm';

export default function NewCompanyPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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
        // Success - redirect to org admin dashboard
        router.push('/dashboard/org-admin');
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
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}