"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon, EyeIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  role: string;
  locale: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    organizationId: '',
    role: 'user',
    locale: 'en-US',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchOrganizations()]);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiRequest('/api/users');
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await apiRequest('/api/organizations');
      const result = await response.json();
      
      if (result.success) {
        // Only active organizations
        setOrganizations(result.data.filter((org: Organization) => org.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      organizationId: '',
      role: 'user',
      locale: 'en-US',
    });
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.organizationId) {
      alert('All fields are required');
      return;
    }

    setFormLoading(true);
    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
        
        // Show temporary password
        setTempPassword(result.data.tempPassword);
        setShowTempPasswordModal(true);
      } else {
        alert(result.error || 'Failed to create user');
      }
    } catch (error) {
      alert('Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser || !formData.email || !formData.firstName || !formData.lastName) {
      alert('All fields are required');
      return;
    }

    setFormLoading(true);
    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        alert(result.error || 'Failed to update user');
      }
    } catch (error) {
      alert('Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setFormLoading(true);
    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(result.error || 'Failed to deactivate user');
      }
    } catch (error) {
      alert('Failed to deactivate user');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;

    setFormLoading(true);
    try {
      const response = await apiRequest(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowPasswordModal(false);
        setTempPassword(result.data.tempPassword);
        setShowTempPasswordModal(true);
      } else {
        alert(result.error || 'Failed to reset password');
      }
    } catch (error) {
      alert('Failed to reset password');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      role: user.role,
      locale: user.locale,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'platform_admin': 'bg-red-100 text-red-800',
      'org_admin': 'bg-blue-100 text-blue-800',
      'company_admin': 'bg-green-100 text-green-800',
      'user': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[role as keyof typeof colors] || colors.user}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const columns = [
    { key: 'firstName', label: 'Name', sortable: true, render: (value: string, row: User) => `${row.firstName} ${row.lastName}` },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'organizationName', label: 'Organization', sortable: true },
    { key: 'role', label: 'Role', render: getRoleBadge },
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
      key: 'createdAt', 
      label: 'Created', 
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: User) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit user"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openPasswordModal(row);
            }}
            className="text-green-600 hover:text-green-900"
            title="Reset password"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(row);
            }}
            className="text-red-600 hover:text-red-900"
            title="Deactivate user"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const formFields = (
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
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organization *
        </label>
        <select
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={formData.organizationId}
          onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
        >
          <option value="">Select organization...</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="company_admin">Company Admin</option>
            <option value="org_admin">Organization Admin</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>

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
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="User Management"
      description="Manage platform users across all organizations"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            <p className="text-gray-600">
              {users.length} users total across {organizations.length} organizations
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
            <span>Create User</span>
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          searchable
          searchPlaceholder="Search users..."
          emptyMessage="No users found"
        />

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create User"
          description="Add a new user to the platform"
        >
          <div className="space-y-6">
            {formFields}
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> A temporary password will be generated. The user must verify their email and change their password on first login.
              </p>
            </div>
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
                Create User
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit User"
          description={`Update ${selectedUser?.firstName} ${selectedUser?.lastName} details`}
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

        {/* Password Reset Confirmation Modal */}
        <ConfirmModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onConfirm={handlePasswordReset}
          title="Reset Password"
          message={`Reset password for "${selectedUser?.firstName} ${selectedUser?.lastName}"? A new temporary password will be generated and their email verification will be reset.`}
          confirmText="Reset Password"
          confirmVariant="primary"
          loading={formLoading}
        />

        {/* Temporary Password Display Modal */}
        <Modal
          isOpen={showTempPasswordModal}
          onClose={() => setShowTempPasswordModal(false)}
          title="Temporary Password Generated"
          description="Please share this temporary password with the user"
          showCloseButton={false}
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center">
                <EyeIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">Temporary Password:</span>
              </div>
              <div className="mt-2 font-mono text-lg text-gray-900 bg-white p-2 rounded border select-all">
                {tempPassword}
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Important:</strong></p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Share this password securely with the user</li>
                <li>User must verify their email address</li>
                <li>User will be prompted to change password on first login</li>
                <li>This password will not be shown again</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowTempPasswordModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Deactivate User"
          message={`Are you sure you want to deactivate "${selectedUser?.firstName} ${selectedUser?.lastName}"? This will prevent them from logging in but will not delete their data.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={formLoading}
        />
      </div>
    </DashboardLayout>
  );
}