"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

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

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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

  const resetForm = () => {
    setFormData({
      name: '',
      subdomain: '',
      tier: 'starter',
      locale: 'en-US',
      baseCurrency: 'USD',
      timezone: 'UTC',
      fiscalYearStart: 1,
    });
  };

  const handleCreate = async () => {
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
      } else {
        alert(result.error || 'Failed to create organization');
      }
    } catch (error) {
      alert('Failed to create organization');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;

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
      } else {
        alert(result.error || 'Failed to update organization');
      }
    } catch (error) {
      alert('Failed to update organization');
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
        alert(result.error || 'Failed to deactivate organization');
      }
    } catch (error) {
      alert('Failed to deactivate organization');
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
    { key: 'tier', label: 'Tier', sortable: true },
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
          >
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
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
    </DashboardLayout>
  );
}