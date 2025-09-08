"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { SafeDeleteModal } from '@/components/ui/SafeDeleteModal';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { TierFormTabs } from '@/components/ui/TierFormTabs';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  StarIcon,
  CreditCardIcon,
  UsersIcon,
  SparklesIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface Tier {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: string;
  priceAnnual: string;
  maxUsers: number;
  setupHours: number | null;
  aiCreditsMonthly: string;
  customFeatureHours: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  priceMonthly: number | null;
  priceDisplay: string | null;
  isActive: boolean;
}

interface TierFormData {
  name: string;
  displayName: string;
  description: string;
  priceMonthly: string;
  priceAnnual: string;
  maxUsers: number;
  setupHours: number | null;
  aiCreditsMonthly: string;
  customFeatureHours: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

const defaultFormData: TierFormData = {
  name: '',
  displayName: '',
  description: '',
  priceMonthly: '0',
  priceAnnual: '0',
  maxUsers: 1,
  setupHours: 0,
  aiCreditsMonthly: '0',
  customFeatureHours: 0,
  features: [],
  isActive: true,
  sortOrder: 0
};


export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [deletingTier, setDeletingTier] = useState<Tier | null>(null);
  const [formData, setFormData] = useState<TierFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/tiers');
      const data = await response.json();
      if (data.success) {
        setTiers(data.data || []);
      } else {
        toast.error(data.error || 'Failed to load tiers');
      }
    } catch (error) {
      console.error('Error loading tiers:', error);
      toast.error('Failed to load tiers');
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const response = await apiRequest('/api/feature-flags');
      const data = await response.json();
      if (data.success) {
        // Only include active features
        const activeFeatures = data.features.filter((feature: FeatureFlag) => feature.isActive);
        setFeatures(activeFeatures);
      } else {
        toast.error(data.error || 'Failed to load features');
      }
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTier(null);
    setFormData(defaultFormData);
    setShowModal(true);
    loadFeatures(); // Load features when opening modal
  };

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      displayName: tier.displayName,
      description: tier.description || '',
      priceMonthly: tier.priceMonthly,
      priceAnnual: tier.priceAnnual,
      maxUsers: tier.maxUsers,
      setupHours: tier.setupHours,
      aiCreditsMonthly: tier.aiCreditsMonthly,
      customFeatureHours: tier.customFeatureHours,
      features: tier.features || [],
      isActive: tier.isActive,
      sortOrder: tier.sortOrder
    });
    setShowModal(true);
    loadFeatures(); // Load features when opening modal
  };

  const handleDelete = (tier: Tier) => {
    setDeletingTier(tier);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      const url = editingTier ? `/api/tiers/${editingTier.id}` : '/api/tiers';
      const method = editingTier ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingTier ? 'Tier updated successfully' : 'Tier created successfully');
        setShowModal(false);
        loadTiers();
      } else {
        toast.error(data.error || 'Failed to save tier');
      }
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save tier');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTier) return;

    try {
      const response = await apiRequest(`/api/tiers/${deletingTier.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Tier deleted successfully');
        setShowDeleteModal(false);
        loadTiers();
      } else {
        toast.error(data.error || 'Failed to delete tier');
      }
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Failed to delete tier');
    }
  };


  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(0)}`;
  };

  const formatSetupHours = (hours: number | null) => {
    if (hours === null) return 'Unlimited';
    return `${hours} hours`;
  };

  const formatFeatures = (features: string[]) => {
    if (!features || features.length === 0) return 'None';
    return `${features.length} features`;
  };

  const columns = [
    { key: 'displayName', label: 'Name', sortable: true },
    { key: 'priceMonthly', label: 'Monthly Price', sortable: true },
    { key: 'priceAnnual', label: 'Annual Price', sortable: true },
    { key: 'maxUsers', label: 'Max Users', sortable: true },
    { key: 'setupHours', label: 'Setup Hours', sortable: false },
    { key: 'aiCreditsMonthly', label: 'AI Credits', sortable: true },
    { key: 'features', label: 'Features', sortable: false },
    { key: 'isActive', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = tiers.map(tier => ({
    ...tier,
    priceMonthly: formatPrice(tier.priceMonthly),
    priceAnnual: formatPrice(tier.priceAnnual),
    setupHours: formatSetupHours(tier.setupHours),
    aiCreditsMonthly: `$${parseFloat(tier.aiCreditsMonthly).toFixed(0)}`,
    features: formatFeatures(tier.features),
    isActive: tier.isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    ),
    actions: (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(tier)}
          className="text-blue-600 hover:text-blue-800"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDelete(tier)}
          className="text-red-600 hover:text-red-800"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  return (
    <DashboardLayout 
      title="Tier Management" 
      description="Manage subscription tiers, pricing, and features"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <StarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription Tiers</h1>
              <p className="text-gray-600">Configure pricing plans and feature access</p>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Tier</span>
          </Button>
        </div>

        {/* Tiers Table */}
        <Card>
          <CardBody>
            <DataTable
              data={tableData}
              columns={columns}
              loading={loading}
              emptyMessage="No tiers found. Create your first tier to get started."
            />
          </CardBody>
        </Card>

        {/* Create/Edit Tier Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTier ? 'Edit Tier' : 'Create New Tier'}
          size="xl"
        >
          <TierFormTabs
            formData={formData}
            setFormData={setFormData}
            features={features}
            onSave={handleSubmit}
            onCancel={() => setShowModal(false)}
            loading={submitting}
            isEdit={!!editingTier}
            featuresLoading={featuresLoading}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <SafeDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Tier"
          itemName={deletingTier?.displayName || ''}
          itemType="tier"
          warningMessage="This action cannot be undone."
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