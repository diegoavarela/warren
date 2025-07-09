"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { ROLES } from '@/lib/auth/rbac';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building2, Users, Plus, Settings, Trash2, Search } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

interface Company {
  id: string;
  name: string;
  organizationId: string;
  taxId?: string;
  industry?: string;
  isActive: boolean;
  createdAt: string;
}

function OrgAdminDashboard() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const locale = user?.locale || organization?.locale || 'en-US';
  const { t } = useTranslation(locale);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/companies');
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      const data = await response.json();
      // Filter companies to ensure they belong to the user's organization
      const filteredCompanies = (data.data || []).filter((company: Company) => {
        const belongsToUserOrg = company.organizationId === organization?.id;
        if (!belongsToUserOrg) {
          console.warn(`⚠️ Company ${company.name} (${company.id}) has wrong organizationId: ${company.organizationId}, expected: ${organization?.id}`);
        }
        return belongsToUserOrg;
      });
      setCompanies(filteredCompanies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${companyName}? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete company');
      }

      // Refresh the companies list
      await fetchCompanies();
      
      // Show success message (using alert for simplicity, could use toast)
      alert(`Company ${companyName} has been deleted successfully.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete company');
    }
  };

  const handleCreateCompany = () => {
    router.push('/dashboard/org-admin/companies/new');
  };

  const handleSelectCompany = (companyId: string) => {
    // Store the selected company in session storage for company admin context
    sessionStorage.setItem('selectedCompanyId', companyId);
    router.push('/dashboard/company-admin');
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.taxId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout showFooter={true}>
      <div className="max-w-6xl mx-auto p-4">
        {/* Compact Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {organization?.name || 'Loading...'}
                </h1>
                <span className="text-sm text-gray-500 font-mono">
                  ID: {organization?.id?.slice(0, 8)}...
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.firstName}! You manage this organization and its companies.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase">Your Role</span>
              <p className="text-sm font-medium text-gray-900">Organization Admin</p>
              <p className="text-xs text-gray-500">{organization?.locale || 'en-US'} • {organization?.baseCurrency || 'USD'}</p>
            </div>
          </div>
        </div>

        {/* Companies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle>Companies ({companies.length})</CardTitle>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button variant="primary" onClick={handleCreateCompany}>
                <Plus className="mr-2 h-4 w-4" />
                Create Company
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading companies...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchCompanies} variant="outline" className="mt-4">
                  Retry
                </Button>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No companies yet</p>
                <p className="text-sm text-gray-500">Create your first company to get started</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No companies found</p>
                <p className="text-sm text-gray-500">Try a different search term</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between group"
                    onClick={() => handleSelectCompany(company.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Tax ID: {company.taxId || 'ABC'} • {company.industry || 'Tecnología'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCompany(company.id);
                        }}
                      >
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(company.id, company.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function OrgAdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not org admin
  useEffect(() => {
    if (user && user.role !== ROLES.ORG_ADMIN && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  return (
    <ProtectedRoute>
      <OrgAdminDashboard />
    </ProtectedRoute>
  );
}