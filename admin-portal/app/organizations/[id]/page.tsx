"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { UserEditForm } from '@/components/UserEditForm';
import { TwoFactorAuthSetup } from '@/components/TwoFactorAuthSetup';
import { CompanyEditForm } from '@/components/CompanyEditForm';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { INDUSTRIES, COUNTRIES, CURRENCIES, FISCAL_YEAR_STARTS } from '@/shared/constants';
import { 
  ArrowLeftIcon, 
  BuildingStorefrontIcon, 
  UsersIcon, 
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  CheckCircleIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  subdomain: string | null;
  tier: string;
  locale: string;
  baseCurrency: string;
  timezone: string;
  fiscalYearStart: number;
  isActive: boolean;
  // Security settings
  requireTwoFactor: boolean;
  sessionTimeout: number;
  // Notification settings
  notifyNewUsers: boolean;
  notifyNewCompanies: boolean;
  createdAt: string;
  updatedAt: string;
  companyCount: number;
  userCount: number;
}

interface Company {
  id: string;
  name: string;
  industry: string | null;
  country: string | null;
  baseCurrency: string;
  fiscalYearStart: number;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  pnlConfigCount: number;
  cashflowConfigCount: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  locale: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const orgId = params.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings form states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState<Organization | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form states
  const [userFormData, setUserFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    locale: 'en-US',
  });

  useEffect(() => {
    fetchOrganization();
  }, [orgId]);

  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, orgId]);

  // Initialize settings form data when organization changes
  useEffect(() => {
    if (organization) {
      setSettingsFormData({...organization});
      setHasUnsavedChanges(false);
    }
  }, [organization]);

  const fetchOrganization = async () => {
    try {
      const response = await apiRequest(`/api/organizations/${orgId}`);
      const result = await response.json();
      
      if (result.success) {
        setOrganization(result.data);
      } else {
        router.push('/organizations');
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      router.push('/organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const response = await apiRequest(`/api/companies?organizationId=${orgId}`);
      const result = await response.json();
      
      if (result.success) {
        setCompanies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiRequest(`/api/users?organizationId=${orgId}`);
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  };


  const handleCreateUser = async () => {
    if (!userFormData.email || !userFormData.firstName || !userFormData.lastName) {
      toast.error('Validation Error', 'All fields are required');
      return;
    }

    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          ...userFormData,
          organizationId: orgId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowCreateUserModal(false);
        setUserFormData({
          email: '',
          firstName: '',
          lastName: '',
          role: 'user',
          locale: 'en-US',
        });
        fetchUsers();
        fetchOrganization(); // Refresh stats
        toast.success('User Created', `User created with temporary password: ${result.data.tempPassword}`);
      } else {
        toast.error('Failed to Create User', result.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to Create User', 'Failed to create user');
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;

    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowPasswordModal(false);
        toast.success('Password Reset', `Password reset. New temporary password: ${result.data.tempPassword}`);
      } else {
        toast.error('Password Reset Failed', result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Password Reset Failed', 'Failed to reset password');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    setActionLoading(true);
    
    try {
      const action = user.isActive ? 'deactivate' : 'activate';
      const endpoint = user.isActive ? `/api/users/${user.id}` : `/api/users/${user.id}`;
      const method = user.isActive ? 'DELETE' : 'PUT';
      const body = user.isActive ? {} : { isActive: true };

      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh users list
        fetchUsers();
        toast.success('User Updated', `User ${action}d successfully`);
      } else {
        toast.error('Update Failed', result.error || `Failed to ${action} user`);
      }
    } catch (error) {
      toast.error('Update Failed', 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (updatedUserData: Partial<User>) => {
    if (!selectedUser) return;

    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUserData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowEditUserModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh users list
        toast.success('User Updated', 'User updated successfully');
      } else {
        toast.error('Update Failed', result.error || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Update Failed', 'Failed to update user');
    }
  };

  const handleEditCompany = async (updatedCompanyData: Partial<Company>) => {
    if (!selectedCompany) return;

    try {
      const response = await apiRequest(`/api/companies/${selectedCompany.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedCompanyData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowEditCompanyModal(false);
        setSelectedCompany(null);
        fetchCompanies(); // Refresh companies list
        fetchOrganization(); // Refresh stats
        toast.success('Company Updated', 'Company updated successfully');
      } else {
        toast.error('Update Failed', result.error || 'Failed to update company');
      }
    } catch (error) {
      toast.error('Update Failed', 'Failed to update company');
    }
  };

  // Settings form handlers
  const handleSettingsChange = (field: keyof Organization, value: any) => {
    if (!settingsFormData) return;
    
    const updatedData = { ...settingsFormData, [field]: value };
    setSettingsFormData(updatedData);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!settingsFormData || !organization) return;
    
    setSettingsLoading(true);
    try {
      const response = await apiRequest(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: settingsFormData.name,
          subdomain: settingsFormData.subdomain,
          locale: settingsFormData.locale,
          baseCurrency: settingsFormData.baseCurrency,
          timezone: settingsFormData.timezone,
          fiscalYearStart: settingsFormData.fiscalYearStart,
          isActive: settingsFormData.isActive,
          // Security settings
          requireTwoFactor: settingsFormData.requireTwoFactor,
          sessionTimeout: settingsFormData.sessionTimeout,
          // Notification settings
          notifyNewUsers: settingsFormData.notifyNewUsers,
          notifyNewCompanies: settingsFormData.notifyNewCompanies,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setOrganization(result.data);
        setHasUnsavedChanges(false);
        toast.success('Settings Updated', 'Organization settings updated successfully');
      } else {
        toast.error('Update Failed', result.error || 'Failed to update organization settings');
      }
    } catch (error) {
      toast.error('Update Failed', 'Failed to update organization settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelSettings = () => {
    if (organization) {
      setSettingsFormData({...organization});
      setHasUnsavedChanges(false);
    }
  };

  const handleResetSettings = () => {
    if (organization) {
      setSettingsFormData({...organization});
      setHasUnsavedChanges(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: CogIcon },
    { id: 'companies', name: 'Companies', icon: BuildingStorefrontIcon, count: organization?.companyCount },
    { id: 'users', name: 'Users', icon: UsersIcon, count: organization?.userCount },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ];

  const companyColumns = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'industry', label: 'Industry', render: (value: string | null) => value || '-' },
    { key: 'country', label: 'Country', render: (value: string | null) => value || '-' },
    { key: 'baseCurrency', label: 'Currency', sortable: true },
    { 
      key: 'pnlConfigCount', 
      label: 'P&L Configs', 
      render: (value: number) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    { 
      key: 'cashflowConfigCount', 
      label: 'Cash Flow Configs', 
      render: (value: number) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
          {value}
        </span>
      )
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created', 
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const userColumns = [
    { key: 'firstName', label: 'Name', sortable: true, render: (value: string, row: User) => `${row.firstName} ${row.lastName}` },
    { key: 'email', label: 'Email', sortable: true },
    { 
      key: 'role', 
      label: 'Role', 
      render: (role: string) => {
        const colors = {
          'org_admin': 'bg-blue-100 text-blue-800',
          'company_admin': 'bg-green-100 text-green-800',
          'user': 'bg-gray-100 text-gray-800'
        };
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[role as keyof typeof colors] || colors.user}`}>
            {role.replace('_', ' ')}
          </span>
        );
      }
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (value: boolean, row: User) => (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Active' : 'Inactive'}
          </span>
          {row.isEmailVerified ? (
            <span className="text-xs text-green-600">✓ Verified</span>
          ) : (
            <span className="text-xs text-orange-600">⚠ Unverified</span>
          )}
        </div>
      )
    },
    { 
      key: 'lastLoginAt', 
      label: 'Last Login', 
      sortable: true,
      render: (value: string | null) => value ? new Date(value).toLocaleDateString() : 'Never'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: User) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(row);
              setShowEditUserModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit user"
            disabled={actionLoading}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleUserStatus(row);
            }}
            className={`${row.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
            title={row.isActive ? 'Deactivate user' : 'Activate user'}
            disabled={actionLoading}
          >
            {row.isActive ? <TrashIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(row);
              setShowPasswordModal(true);
            }}
            className="text-green-600 hover:text-green-900"
            title="Reset password"
            disabled={actionLoading}
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(row);
              setShow2faModal(true);
            }}
            className="text-purple-600 hover:text-purple-900"
            title="Setup 2FA"
            disabled={actionLoading}
          >
            <ShieldCheckIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Organization Details">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading organization...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout title="Organization Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">Organization not found</p>
          <Button onClick={() => router.push('/organizations')} className="mt-4">
            Back to Organizations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={organization.name}
      description="Organization management and settings"
    >
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Organizations', href: '/organizations' },
            { label: organization.name },
          ]}
        />

        {/* Organization Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Tier</h3>
              <p className="text-2xl font-semibold text-gray-900 capitalize">{organization.tier}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Companies</h3>
              <p className="text-2xl font-semibold text-gray-900">{organization.companyCount}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Users</h3>
              <p className="text-2xl font-semibold text-gray-900">{organization.userCount}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                organization.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {organization.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 text-gray-900 rounded-full px-2 py-1 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Subdomain:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.subdomain || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Currency:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.baseCurrency}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Locale:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.locale}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Timezone:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.timezone}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Fiscal Year Start:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(0, organization.fiscalYearStart - 1).toLocaleString('default', { month: 'long' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Created:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(organization.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Companies</h3>
                  <p className="text-gray-600">Companies belonging to {organization.name}</p>
                </div>
                <Button
                  onClick={() => router.push(`/companies/new?organizationId=${organization.id}&returnUrl=${encodeURIComponent(`/organizations/${organization.id}`)}`)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create Company</span>
                </Button>
              </div>

              <DataTable
                columns={companyColumns}
                data={companies}
                loading={companiesLoading}
                searchable
                searchPlaceholder="Search companies..."
                emptyMessage="No companies found in this organization"
                onRowClick={(company: Company) => {
                  setSelectedCompany(company);
                  setShowEditCompanyModal(true);
                }}
              />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Users</h3>
                  <p className="text-gray-600">Users belonging to {organization.name}</p>
                </div>
                <Button
                  onClick={() => setShowCreateUserModal(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create User</span>
                </Button>
              </div>

              <DataTable
                columns={userColumns}
                data={users}
                loading={usersLoading}
                searchable
                searchPlaceholder="Search users..."
                emptyMessage="No users found in this organization"
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Settings</h3>
                  <p className="text-gray-600">Manage security, notifications, and general settings for {organization.name}</p>
                </div>

                <div className="space-y-6">
                  {/* General Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                      <CogIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-base font-medium text-gray-900">General</h4>
                        <p className="text-sm text-gray-600">Basic organization settings</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.name || ''}
                            onChange={(e) => handleSettingsChange('name', e.target.value)}
                            placeholder="Organization name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.subdomain || ''}
                            onChange={(e) => handleSettingsChange('subdomain', e.target.value || null)}
                            placeholder="Optional subdomain"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.locale || 'en-US'}
                            onChange={(e) => handleSettingsChange('locale', e.target.value)}
                          >
                            <option value="en-US">English (US)</option>
                            <option value="es-MX">Español (México)</option>
                            <option value="es-ES">Español (España)</option>
                            <option value="es-AR">Español (Argentina)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.baseCurrency || 'USD'}
                            onChange={(e) => handleSettingsChange('baseCurrency', e.target.value)}
                          >
                            <option value="USD">USD ($)</option>
                            <option value="MXN">MXN ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="CAD">CAD ($)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.timezone || 'UTC'}
                            onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/Mexico_City">America/Mexico_City</option>
                            <option value="America/New_York">America/New_York</option>
                            <option value="America/Los_Angeles">America/Los_Angeles</option>
                            <option value="Europe/London">Europe/London</option>
                            <option value="Europe/Madrid">Europe/Madrid</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year Start</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.fiscalYearStart || 1}
                            onChange={(e) => handleSettingsChange('fiscalYearStart', parseInt(e.target.value))}
                          >
                            {FISCAL_YEAR_STARTS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={settingsFormData?.isActive ? 'active' : 'inactive'}
                            onChange={(e) => handleSettingsChange('isActive', e.target.value === 'active')}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                      <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <h4 className="text-base font-medium text-gray-900">Security</h4>
                        <p className="text-sm text-gray-600">Security and access settings</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <ShieldCheckIcon className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="text-sm font-medium text-gray-900">Require Two-Factor Authentication</label>
                            <p className="text-xs text-gray-600">Require all users to enable 2FA</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={settingsFormData?.requireTwoFactor || false}
                            onChange={(e) => handleSettingsChange('requireTwoFactor', e.target.checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <KeyIcon className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="text-sm font-medium text-gray-900">Session Timeout</label>
                            <p className="text-xs text-gray-600">Automatically log users out after inactivity</p>
                          </div>
                        </div>
                        <select
                          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={settingsFormData?.sessionTimeout || 86400}
                          onChange={(e) => handleSettingsChange('sessionTimeout', parseInt(e.target.value))}
                        >
                          <option value="3600">1 hour</option>
                          <option value="14400">4 hours</option>
                          <option value="28800">8 hours</option>
                          <option value="86400">24 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                      <div className="w-5 h-5 text-purple-600">🔔</div>
                      <div>
                        <h4 className="text-base font-medium text-gray-900">Notifications</h4>
                        <p className="text-sm text-gray-600">Notification preferences</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <UsersIcon className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="text-sm font-medium text-gray-900">New User Notifications</label>
                            <p className="text-xs text-gray-600">Notify when new users join the organization</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={settingsFormData?.notifyNewUsers || false}
                            onChange={(e) => handleSettingsChange('notifyNewUsers', e.target.checked)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <BuildingStorefrontIcon className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="text-sm font-medium text-gray-900">New Company Notifications</label>
                            <p className="text-xs text-gray-600">Notify when new companies are created</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={settingsFormData?.notifyNewCompanies || false}
                            onChange={(e) => handleSettingsChange('notifyNewCompanies', e.target.checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {hasUnsavedChanges && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 text-yellow-600">⚠️</div>
                          <span className="text-sm text-yellow-800 font-medium">You have unsaved changes</span>
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelSettings}
                            disabled={settingsLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetSettings}
                            disabled={settingsLoading}
                          >
                            Reset
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveSettings}
                            disabled={settingsLoading}
                          >
                            {settingsLoading ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasUnsavedChanges && (
                    <div className="flex justify-end pt-4">
                      <p className="text-sm text-gray-500">
                        Organization settings are editable. Make changes and save them.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Create User Modal */}
        <Modal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          title="Create User"
          description={`Add a new user to ${organization.name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={userFormData.firstName}
                  onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={userFormData.lastName}
                  onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="org_admin">Organization Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locale
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={userFormData.locale}
                  onChange={(e) => setUserFormData({ ...userFormData, locale: e.target.value })}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español (España)</option>
                  <option value="es-MX">Español (México)</option>
                  <option value="es-AR">Español (Argentina)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateUserModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit User Modal */}
        {selectedUser && (
          <Modal
            isOpen={showEditUserModal}
            onClose={() => {
              setShowEditUserModal(false);
              setSelectedUser(null);
            }}
            title="Edit User"
            size="md"
          >
            <UserEditForm
              user={selectedUser}
              organizationId={orgId}
              onSubmit={handleEditUser}
              onCancel={() => {
                setShowEditUserModal(false);
                setSelectedUser(null);
              }}
            />
          </Modal>
        )}

        {/* Password Reset Modal */}
        <ConfirmModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onConfirm={handlePasswordReset}
          title="Reset Password"
          message={`Reset password for "${selectedUser?.firstName} ${selectedUser?.lastName}"? A new temporary password will be generated.`}
          confirmText="Reset Password"
          confirmVariant="primary"
        />

        {/* 2FA Setup Modal */}
        {selectedUser && (
          <TwoFactorAuthSetup
            user={selectedUser}
            isOpen={show2faModal}
            onClose={() => {
              setShow2faModal(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              fetchUsers(); // Refresh users to show updated 2FA status
              toast.success('2FA Setup Complete', '2FA has been successfully configured');
            }}
          />
        )}

        {/* Edit Company Modal */}
        {selectedCompany && (
          <Modal
            isOpen={showEditCompanyModal}
            onClose={() => {
              setShowEditCompanyModal(false);
              setSelectedCompany(null);
            }}
            title="Edit Company"
            size="xl"
          >
            <CompanyEditForm
              company={selectedCompany}
              onSubmit={handleEditCompany}
              onCancel={() => {
                setShowEditCompanyModal(false);
                setSelectedCompany(null);
              }}
              isLoading={actionLoading}
            />
          </Modal>
        )}
      </div>
      
      <ToastContainer
        toasts={toast.toasts}
        onClose={toast.removeToast}
        position="top-right"
      />
    </DashboardLayout>
  );
}