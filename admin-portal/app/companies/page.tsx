"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Company {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  industry: string | null;
  country: string | null;
  timezone: string;
  baseCurrency: string;
  fiscalYearStart: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

interface Organization {
  id: string;
  name: string;
  isActive: boolean;
}

export default function CompaniesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await apiRequest('/api/companies');
      const result = await response.json();
      
      if (result.success) {
        setCompanies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    router.push('/companies/new');
  };

  const handleEditCompany = (company: Company) => {
    router.push(`/companies/${company.id}/edit`);
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;

    setDeleteLoading(true);
    try {
      const response = await apiRequest(`/api/companies/${selectedCompany.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Company "${selectedCompany.name}" has been deactivated`);
        setShowDeleteModal(false);
        setSelectedCompany(null);
        fetchCompanies();
      } else {
        toast.error(result.error || 'Failed to deactivate company');
      }
    } catch (error) {
      console.error('Failed to deactivate company:', error);
      toast.error('Network error - please try again');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  const columns = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'organizationName', label: 'Organization', sortable: true },
    { key: 'industry', label: 'Industry', render: (value: string | null) => value || '-' },
    { key: 'country', label: 'Country', render: (value: string | null) => value || '-' },
    { key: 'baseCurrency', label: 'Currency', sortable: true },
    { key: 'userCount', label: 'Users', sortable: true },
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
      render: (_: any, row: Company) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditCompany(row);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit Company"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(row);
            }}
            className="text-red-600 hover:text-red-900"
            title="Deactivate Company"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];


  return (
    <DashboardLayout
      title="Companies"
      description="Manage companies across all organizations"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Companies</h2>
            <p className="text-gray-600">
              {companies.length} companies total
            </p>
          </div>
          <Button
            onClick={handleCreateCompany}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Company</span>
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={companies}
          loading={loading}
          searchable
          searchPlaceholder="Search companies..."
          emptyMessage="No companies found"
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Deactivate Company"
          message={`Are you sure you want to deactivate "${selectedCompany?.name}"? This will not delete the company but will make it inactive.`}
          confirmText="Deactivate"
          confirmVariant="danger"
          loading={deleteLoading}
        />
        
        <ToastContainer />
      </div>
    </DashboardLayout>
  );
}