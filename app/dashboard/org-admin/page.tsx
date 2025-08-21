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
import { useLocale } from '@/contexts/LocaleContext';

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
  const { locale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Clear any selected company context when navigating to org admin
    sessionStorage.removeItem('selectedCompanyId');
    sessionStorage.removeItem('selectedCompanyName');
    
    fetchCompanies();
    if (organization?.id) {
      fetchUsers();
    }
  }, [organization?.id]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
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


  const fetchUsers = async () => {
    if (!organization?.id) return;
    
    try {
      setUsersLoading(true);
      const response = await fetch(`/api/organizations/${organization.id}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowEditModal(true);
  };

  const handleSaveCompany = async () => {
    if (!editingCompany) return;
    
    try {
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingCompany.name,
          taxId: editingCompany.taxId,
          industry: editingCompany.industry,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update company');
      }

      // Refresh the companies list
      await fetchCompanies();
      setShowEditModal(false);
      setEditingCompany(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update company');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${companyName}? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // If it's a 409 error with detailed information, show helpful dialog
        if (response.status === 409 && errorData.dataToRemove) {
          const { dataToRemove, alternativeAction } = errorData;
          
          let message = `Cannot delete "${companyName}" because it contains:\n\n`;
          
          if (dataToRemove.files?.count > 0) {
            message += `📁 ${dataToRemove.files.count} uploaded files:\n`;
            dataToRemove.files.items.forEach((file: any, i: number) => {
              if (i < 3) message += `  • ${file.name}\n`;
            });
            if (dataToRemove.files.count > 3) {
              message += `  • ... and ${dataToRemove.files.count - 3} more\n`;
            }
            message += `\n${dataToRemove.files.instructions}\n\n`;
          }
          
          if (dataToRemove.configurations?.count > 0) {
            message += `⚙️ ${dataToRemove.configurations.count} configurations:\n`;
            dataToRemove.configurations.items.forEach((config: any, i: number) => {
              if (i < 3) message += `  • ${config.name} (${config.type})\n`;
            });
            message += `\n${dataToRemove.configurations.instructions}\n\n`;
          }
          
          if (alternativeAction?.type === 'deactivate') {
            message += `💡 Alternative: You can deactivate this company instead.\n`;
            message += `This will hide it but preserve all data.\n\n`;
            message += `Would you like to deactivate "${companyName}" instead?`;
            
            const deactivate = window.confirm(message);
            if (deactivate) {
              // Deactivate the company
              try {
                const deactivateResponse = await fetch(`/api/companies/${companyId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isActive: false })
                });
                
                if (deactivateResponse.ok) {
                  await fetchCompanies();
                  alert(`Company "${companyName}" has been deactivated successfully.`);
                } else {
                  throw new Error('Failed to deactivate company');
                }
              } catch (err) {
                alert(`Failed to deactivate company: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            }
          } else {
            alert(message);
          }
        } else {
          // Generic error
          throw new Error(errorData.error || 'Failed to delete company');
        }
        return;
      }

      // Success - refresh and show message
      await fetchCompanies();
      alert(`Company "${companyName}" has been deleted successfully.`);
      
    } catch (err) {
      alert(`Failed to delete company: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreateCompany = () => {
    router.push('/dashboard/org-admin/companies/new');
  };

  const handleSelectCompany = (companyId: string) => {
    // Store the selected company in session storage for company admin context
    sessionStorage.setItem('selectedCompanyId', companyId);
    const company = companies.find(c => c.id === companyId);
    if (company) {
      sessionStorage.setItem('selectedCompanyName', company.name);
    }
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
        {/* Compact Header - Clickable for Settings */}
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/org-admin/settings')}
        >
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
              <Settings className="w-4 h-4 text-gray-400 mt-1 ml-auto" />
            </div>
          </div>
        </div>


        {/* Companies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle className="flex items-center gap-2 whitespace-nowrap">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span>{locale?.startsWith('es') ? 'Empresas' : 'Companies'} ({companies.length})</span>
                </CardTitle>
                {/* Search Bar - Simple */}
                <input
                  type="text"
                  placeholder={locale?.startsWith('es') ? '🔍 Buscar empresas...' : '🔍 Search companies...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button variant="primary" onClick={handleCreateCompany} className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>{locale?.startsWith('es') ? 'Crear Empresa' : 'Create Company'}</span>
                </div>
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
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCompany(company.id);
                        }}
                        className="whitespace-nowrap"
                      >
                        {locale?.startsWith('es') ? 'Gestionar' : 'Manage'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompany(company);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings className="w-4 h-4 text-gray-600" />
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

        {/* Users Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {locale?.startsWith('es') ? 'Usuarios' : 'Users'} ({users.length})
                </CardTitle>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/org-admin/users')}
                  className="whitespace-nowrap inline-flex items-center"
                >
                  {locale?.startsWith('es') ? 'Ver Todos' : 'View All'}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => router.push('/dashboard/org-admin/users/invite')}
                  className="whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>{locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}</span>
                  </div>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">
                  {locale?.startsWith('es') ? 'Cargando usuarios...' : 'Loading users...'}
                </p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  {locale?.startsWith('es') ? 'No hay usuarios' : 'No users yet'}
                </p>
                <p className="text-sm text-gray-500">
                  {locale?.startsWith('es') 
                    ? 'Invita tu primer usuario para comenzar'
                    : 'Invite your first user to get started'}
                </p>
                <Button 
                  variant="primary" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/org-admin/users/invite')}
                >
                  {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {users.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => router.push(`/dashboard/org-admin/users/${user.id}/edit`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {user.email} • {user.organizationRole === 'admin' 
                            ? (locale?.startsWith('es') ? 'Admin' : 'Admin')
                            : (locale?.startsWith('es') ? 'Usuario' : 'User')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.companyAccess?.length > 0 && (
                        <span>{user.companyAccess.length} {locale?.startsWith('es') ? 'empresas' : 'companies'}</span>
                      )}
                    </div>
                  </div>
                ))}
                {users.length > 3 && (
                  <div className="px-6 py-4 text-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push('/dashboard/org-admin/users')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {locale?.startsWith('es') 
                        ? `Ver todos los ${users.length} usuarios` 
                        : `View all ${users.length} users`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

      </div>

      {/* Edit Company Modal */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Editar Empresa' : 'Edit Company'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'RUT/Tax ID' : 'Tax ID'}
                </label>
                <input
                  type="text"
                  value={editingCompany.taxId || ''}
                  onChange={(e) => setEditingCompany({...editingCompany, taxId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Industria' : 'Industry'}
                </label>
                <input
                  type="text"
                  value={editingCompany.industry || ''}
                  onChange={(e) => setEditingCompany({...editingCompany, industry: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCompany(null);
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCompany}
              >
                {locale?.startsWith('es') ? 'Guardar' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
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