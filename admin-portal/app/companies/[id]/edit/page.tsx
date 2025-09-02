"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useToast } from '@/components/ui/Toast';
import { apiRequest } from '@/lib/api';
import CompanyForm, { CompanyFormData } from '@/shared/components/CompanyForm';
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface Company {
  id: string;
  name: string;
  taxId: string | null;
  industry: string | null;
  country: string | null;
  locale: string | null;
  baseCurrency: string;
  timezone: string | null;
  fiscalYearStart: number | null;
  displayUnits: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const companyId = params.id as string;

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const response = await apiRequest(`/api/companies/${companyId}`);
      const result = await response.json();
      
      if (result.success) {
        setCompany(result.data);
      } else {
        toast.error('Failed to load company details');
        router.push('/companies');
      }
    } catch (error) {
      console.error('Failed to fetch company:', error);
      toast.error('Failed to load company details');
      router.push('/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: CompanyFormData) => {
    setSaving(true);
    
    try {
      const response = await apiRequest(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Company updated successfully!');
        router.push('/companies');
      } else {
        toast.error(result.error || 'Failed to update company');
      }
    } catch (error) {
      console.error('Company update error:', error);
      toast.error('Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/companies');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout 
          title="Loading..."
          description="Loading company details"
        >
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading company details...</span>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!company) {
    return (
      <ProtectedRoute>
        <DashboardLayout 
          title="Company Not Found"
          description="The requested company could not be found"
        >
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Company not found</p>
            <button
              onClick={() => router.push('/companies')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Companies
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const initialData = {
    name: company.name || '',
    taxId: company.taxId || '',
    industry: company.industry || '',
    country: company.country || '',
    locale: company.locale || 'en-US',
    baseCurrency: company.baseCurrency || 'USD',
    timezone: company.timezone || 'UTC',
    fiscalYearStart: company.fiscalYearStart?.toString() || '1',
    displayUnits: company.displayUnits || 'normal',
    contactEmail: company.contactEmail || '',
    contactPhone: company.contactPhone || '',
    address: company.address || '',
    website: company.website || '',
    organizationId: company.organizationId
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        title="Edit Company"
        description={`Update ${company.name} details`}
      >
        <div className="space-y-6">
          {/* Page Header with back button */}
          <div className="flex items-center">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Companies
            </button>
            
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Company</h2>
              </div>
            </div>
          </div>

          <CompanyForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={saving}
            mode="edit"
            locale="en-US"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}