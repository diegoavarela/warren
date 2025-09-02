"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import CompanyForm, { CompanyFormData } from '@/shared/components/CompanyForm';
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

function NewCompanyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  // Get organization ID and return URL from URL params or user context
  useEffect(() => {
    const orgIdFromUrl = searchParams.get('organizationId');
    const returnUrlFromParams = searchParams.get('returnUrl');
    
    if (orgIdFromUrl) {
      setOrganizationId(orgIdFromUrl);
    } else if (user?.organizationId) {
      setOrganizationId(user.organizationId);
    }
    
    if (returnUrlFromParams) {
      setReturnUrl(decodeURIComponent(returnUrlFromParams));
    }
  }, [searchParams, user?.organizationId]);

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
          organizationId: organizationId || user?.organizationId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Company created successfully!');
        // Navigate back to return URL if provided, otherwise to companies list
        router.push(returnUrl || '/companies');
      } else {
        toast.error(data.error || 'Failed to create company');
      }
    } catch (error) {
      console.error('Company creation error:', error);
      toast.error('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to return URL if provided, otherwise go back
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.back();
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        title="New Company"
        description="Fill in the information to create a new company"
      >
        <div className="space-y-6">
          {/* Page Header with back button */}
          <div className="flex items-center">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </button>
            
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Company</h2>
              </div>
            </div>
          </div>

          <CompanyForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            mode="create"
            organizationId={organizationId || user?.organizationId}
            locale="en-US"
          />
        </div>
        <ToastContainer
          toasts={toast.toasts}
          onClose={toast.removeToast}
          position="top-right"
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function NewCompanyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">Loading...</div>}>
      <NewCompanyContent />
    </Suspense>
  );
}