"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { UsageData } from '@/shared/types/usage';
import { fetchOrganizationUsageForAdmin } from '@/shared/lib/usage-api';

interface Tier {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: string;
  isActive: boolean;
}

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
  createdAt: string;
  updatedAt: string;
  userCount: number;
  companyCount: number;
}

function UsageCell({ organizationId }: { organizationId: string }) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const result = await fetchOrganizationUsageForAdmin(organizationId);
        
        if (result.success && result.data) {
          setUsageData(result.data);
        } else {
          setError(result.error || 'Failed to fetch usage');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse h-4 bg-gray-200 rounded w-16"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-xs">
        Error loading usage
      </div>
    );
  }

  if (!usageData) {
    return (
      <div className="text-gray-400 text-xs">
        No data
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const userPercentage = usageData.users.max > 0 
    ? Math.round((usageData.users.current / usageData.users.max) * 100)
    : 0;

  const getUsersColor = () => {
    if (userPercentage >= 100) return 'text-red-600';
    if (userPercentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCreditsColor = () => {
    const creditsUsedPercentage = usageData.aiCredits.monthly > 0 
      ? (usageData.aiCredits.used / usageData.aiCredits.monthly) * 100
      : 0;
    
    if (creditsUsedPercentage >= 90) return 'text-red-600';
    if (creditsUsedPercentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="flex flex-col space-y-1 min-w-[120px]">
      <div className={`text-xs font-medium ${getUsersColor()}`}>
        {usageData.users.current}/{usageData.users.max} users ({userPercentage}%)
      </div>
      <div className={`text-xs ${getCreditsColor()}`}>
        {formatCurrency(usageData.aiCredits.balance)} credits
      </div>
      {usageData.aiCredits.estimatedDaysRemaining !== null && 
       usageData.aiCredits.estimatedDaysRemaining <= 30 && (
        <div className="text-xs text-orange-600">
          ~{usageData.aiCredits.estimatedDaysRemaining}d left
        </div>
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    tier: 'starter',
    locale: 'en-US',
    baseCurrency: 'USD',
    timezone: 'UTC',
    fiscalYearStart: 1,
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    fetchTiers();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await apiRequest('/api/organizations');
      const result = await response.json();
      
      if (result.success) {
        setOrganizations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await apiRequest('/api/tiers');
      const result = await response.json();
      
      if (result.success) {
        // Filter only active tiers
        const activeTiers = result.data.filter((tier: Tier) => tier.isActive);
        setTiers(activeTiers);
      }
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subdomain: '',
      tier: '',
      locale: 'en-US',
      baseCurrency: 'USD',
      timezone: 'UTC',
      fiscalYearStart: 1,
    });
  };

  const handleCreate = async () => {
    if (!formData.tier) {
      toast.error('Validation Error', 'Please select a tier for the organization');
      return;
    }

    setFormLoading(true);
    try {
      const response = await apiRequest('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowCreateModal(false);
        resetForm();
        fetchOrganizations();
        toast.success('Organization Created', 'Organization created successfully');
      } else {
        toast.error('Creation Failed', result.error || 'Failed to create organization');
      }
    } catch (error) {
      toast.error('Creation Failed', 'Failed to create organization');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;
    
    if (!formData.tier) {
      toast.error('Validation Error', 'Please select a tier for the organization');
      return;
    }

    setFormLoading(true);
    try {
      const response = await apiRequest(`/api/organizations/${selectedOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedOrg(null);
        resetForm();
        fetchOrganizations();
        toast.success('Organization Updated', 'Organization updated successfully');
      } else {
        toast.error('Update Failed', result.error || 'Failed to update organization');
      }
    } catch (error) {
      toast.error('Update Failed', 'Failed to update organization');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;

    setFormLoading(true);
    try {
      const response = await apiRequest(`/api/organizations/${selectedOrg.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedOrg(null);
        fetchOrganizations();
      } else {
        toast.error('Deactivation Failed', result.error || 'Failed to deactivate organization');
      }
    } catch (error) {
      toast.error('Deactivation Failed', 'Failed to deactivate organization');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      subdomain: org.subdomain || '',
      tier: org.tier,
      locale: org.locale,
      baseCurrency: org.baseCurrency,
      timezone: org.timezone,
      fiscalYearStart: org.fiscalYearStart,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (org: Organization) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'subdomain', label: 'Subdomain', render: (value: string | null) => value || '-' },
    { 
      key: 'tier', 
      label: 'Tier', 
      sortable: true,
      render: (value: string) => {
        const tier = tiers.find(t => t.name === value);
        if (!tier) {
          return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              {value || 'No Tier'}
            </span>
          );
        }

        // Define tier-specific colors
        const getTierColors = (tierName: string) => {
          const name = tierName.toLowerCase();
          if (name.includes('standard+') || name.includes('standard_plus')) {
            return 'bg-purple-100 text-purple-800 border border-purple-200';
          } else if (name.includes('advanced') || name.includes('premium')) {
            return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
          } else if (name.includes('standard')) {
            return 'bg-blue-100 text-blue-800 border border-blue-200';
          } else {
            return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
          }
        };

        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColors(tier.name)}`}>
              {tier.displayName}
            </span>
            <span className="text-xs text-gray-500">
              ${parseFloat(tier.priceMonthly).toFixed(0)}/mo
            </span>
          </div>
        );
      }
    },
    { key: 'userCount', label: 'Users', sortable: true },
    { key: 'companyCount', label: 'Companies', sortable: true },
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
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (_: any, row: Organization) => (
        <UsageCell organizationId={row.id} />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Organization) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/organizations/${row.id}`);
            }}
            className="text-green-600 hover:text-green-900"
            title="View organization details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit organization"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(row);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete organization"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organization Name *
        </label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subdomain
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={formData.subdomain}
          onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tier
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.tier}
            onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
            required
          >
            <option value="">Select a tier...</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.name}>
                {tier.displayName} - ${parseFloat(tier.priceMonthly).toFixed(0)}/month
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.baseCurrency}
            onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="ARS">ARS</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Locale
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.locale}
            onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
          >
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español (España)</option>
            <option value="es-MX">Español (México)</option>
            <option value="es-AR">Español (Argentina)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiscal Year Start
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.fiscalYearStart}
            onChange={(e) => setFormData({ ...formData, fiscalYearStart: parseInt(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Organizations"
      description="Manage platform organizations"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Organizations</h2>
            <p className="text-gray-600">
              {organizations.length} organizations total
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Organization</span>
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={organizations}
          loading={loading}
          searchable
          searchPlaceholder="Search organizations..."
          emptyMessage="No organizations found"
          onRowClick={(row) => router.push(`/organizations/${row.id}`)}
        />

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Organization"
          description="Add a new organization to the platform"
        >
          <div className="space-y-6">
            {formFields}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                loading={formLoading}
              >
                Create Organization
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Organization"
          description={`Update ${selectedOrg?.name} details`}
        >
          <div className="space-y-6">
            {formFields}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                loading={formLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Deactivate Organization"
          message={`Are you sure you want to deactivate "${selectedOrg?.name}"? This will not delete the organization but will make it inactive.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={formLoading}
        />
      </div>
      
      <ToastContainer
        toasts={toast.toasts}
        onClose={toast.removeToast}
        position="top-right"
      />
    </DashboardLayout>
  );
}