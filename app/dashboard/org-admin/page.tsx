"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { ROLES } from '@/lib/auth/rbac';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Building2, Users, Plus, Settings, Trash2 } from 'lucide-react';
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

  return (
    <AppLayout showFooter={true}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Organization</h2>
                <h1 className="text-3xl font-bold text-gray-900 mt-1">
                  {organization?.name || 'Loading...'}
                </h1>
                <p className="text-gray-600 mt-2">
                  Welcome back, {user?.firstName}! You manage this organization and its companies.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Organization ID</p>
                <p className="text-sm font-mono text-gray-700">{organization?.id?.slice(0, 8)}...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold">{companies.length}</div>
              <p className="text-xs text-muted-foreground">
                Active companies in your organization
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organization Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardBody>
              <div className="text-lg font-semibold">{organization?.locale || 'en-US'}</div>
              <p className="text-xs text-muted-foreground">
                Default Language & Currency: {organization?.baseCurrency || 'USD'}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold">Organization Admin</div>
              <p className="text-xs text-muted-foreground">
                Full access to manage companies
              </p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Companies</CardTitle>
                <CardDescription>
                  Manage companies within your organization
                </CardDescription>
              </div>
              <Button variant="primary" onClick={handleCreateCompany}>
                <Plus className="mr-2 h-4 w-4" />
                Create Company
              </Button>
            </div>
          </CardHeader>
          <CardBody>
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
            ) : (
              <div className="grid gap-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCompany(company.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-gray-600">
                          {company.taxId && `Tax ID: ${company.taxId} • `}
                          {company.industry || 'No industry specified'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">
                          Manage
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCompany(company.id, company.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            As an organization admin, you can create and manage companies, 
            but you need to be assigned to a specific company to access its data.
          </p>
        </div>
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