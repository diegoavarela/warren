"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { SafeDeleteModal } from '@/components/ui/SafeDeleteModal';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { FeatureFormTabs } from '@/components/ui/FeatureFormTabs';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  FlagIcon,
  UsersIcon,
  BoltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  priceMonthly: number | null;
  priceDisplay: string | null;
  isPublic: boolean;
  isBaseline: boolean;
  isActive: boolean;
  requirements: string | null;
  setupTime: string | null;
  icon: string | null;
  createdAt: string;
  organizationCount?: number; // Number of orgs using this feature
}

interface OrganizationFeature {
  id: string;
  organizationId: string;
  organizationName: string;
  enabled: boolean;
  enabledAt: string | null;
}

export default function FeatureFlagsPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSafeDeleteModal, setShowSafeDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showOrganizationsModal, setShowOrganizationsModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureFlag | null>(null);
  const [selectedRowFeature, setSelectedRowFeature] = useState<FeatureFlag | null>(null);
  const [organizationFeatures, setOrganizationFeatures] = useState<OrganizationFeature[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string; enabled: boolean; enabledAt?: string }[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    category: 'General',
    priceMonthly: '',
    priceDisplay: '',
    isPublic: true,
    isBaseline: false,
    requirements: '',
    setupTime: '',
    icon: 'FlagIcon',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await apiRequest('/api/feature-flags');
      if (!response.ok) throw new Error('Failed to fetch features');
      const data = await response.json();
      setFeatures(data.features);
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationFeatures = async (featureId: string) => {
    setOrganizationsLoading(true);
    try {
      const response = await apiRequest(`/api/feature-flags?includeOrganizations=true&featureId=${featureId}`);
      if (!response.ok) throw new Error('Failed to fetch organization features');
      const data = await response.json();
      
      // Extract organizations for this feature
      const orgList = data.organizations ? data.organizations[featureId] || [] : [];
      
      // Convert to legacy format for backward compatibility
      const legacyFormat = orgList.map((org: any) => ({
        id: org.id,
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        enabled: org.enabled,
        enabledAt: org.enabledAt
      }));
      setOrganizationFeatures(legacyFormat);
    } catch (error) {
      console.error('Error fetching organization features:', error);
      setOrganizationFeatures([]); // Clear on error
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      category: 'General',
      priceMonthly: '',
      priceDisplay: '',
      isPublic: true,
      isBaseline: false,
      requirements: '',
      setupTime: '',
      icon: 'FlagIcon',
    });
    setShowCreateModal(true);
  };

  const handleRowClick = (feature: FeatureFlag) => {
    setSelectedRowFeature(feature);
    handleEdit(feature);
  };

  const handleEdit = (feature: FeatureFlag) => {
    try {
      setSelectedFeature(feature);
      setOrganizationFeatures([]); // Clear previous org data
      
      setFormData({
        key: feature.key,
        name: feature.name,
        description: feature.description || '',
        category: feature.category,
        priceMonthly: feature.priceMonthly?.toString() || '',
        priceDisplay: feature.priceDisplay || '',
        isPublic: feature.isPublic,
        isBaseline: feature.isBaseline,
        requirements: feature.requirements || '',
        setupTime: feature.setupTime || '',
        icon: feature.icon || 'FlagIcon',
      });
      
      // Show modal immediately
      setShowEditModal(true);
      
      // Load organization data in background after modal is shown
      setTimeout(async () => {
        try {
          const response = await apiRequest(`/api/feature-flags?includeOrganizations=true&featureId=${feature.id}`);
          if (response.ok) {
            const data = await response.json();
            // Extract organizations for this feature
            const orgList = data.organizations ? data.organizations[feature.id] || [] : [];
            
            // Convert API response to the format expected by FeatureFormTabs
            const orgData = orgList.map((org: any) => ({
              id: org.organizationId,
              name: org.organizationName,
              enabled: org.enabled,
              enabledAt: org.enabledAt || undefined
            }));
            setOrganizations(orgData);
            
            // Also update the organizationFeatures state for other modals (keeping backward compatibility)
            const legacyFormat = orgList.map((org: any) => ({
              id: org.id,
              organizationId: org.organizationId,
              organizationName: org.organizationName,
              enabled: org.enabled,
              enabledAt: org.enabledAt
            }));
            setOrganizationFeatures(legacyFormat);
          }
        } catch (error) {
          console.error('Error loading organization features:', error);
          setOrganizations([]);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error in handleEdit:', error);
      alert('Error opening edit modal: ' + (error as Error).message);
    }
  };

  const handleDelete = async (feature: FeatureFlag) => {
    setSelectedFeature(feature);
    // Fetch organizations using this feature
    await fetchOrganizationFeatures(feature.id);
    setShowSafeDeleteModal(true);
  };

  const handleViewOrganizations = async (feature: FeatureFlag) => {
    setSelectedFeature(feature);
    await fetchOrganizationFeatures(feature.id);
    setShowOrganizationsModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      const payload = {
        ...formData,
        priceMonthly: formData.priceMonthly && formData.priceMonthly.trim() !== '' ? formData.priceMonthly : null,
      };
      
      const url = selectedFeature 
        ? `/api/feature-flags/${selectedFeature.id}` 
        : '/api/feature-flags';
      
      const method = selectedFeature ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save feature');
      }
      
      await fetchFeatures();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedFeature(null);
    } catch (error) {
      console.error('Error saving feature:', error);
      alert((error as Error).message || 'Failed to save feature');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFeature) return;
    
    // Prevent deletion of baseline features
    if (selectedFeature.isBaseline) {
      alert('Baseline features cannot be deleted');
      return;
    }
    
    setDeleteLoading(true);
    try {
      const response = await apiRequest(`/api/feature-flags/${selectedFeature.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete feature');
      
      await fetchFeatures();
      setShowSafeDeleteModal(false);
      setSelectedFeature(null);
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Failed to delete feature');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleFeatureForOrg = async (orgFeature: OrganizationFeature) => {
    try {
      const response = await apiRequest(`/api/feature-flags/${selectedFeature?.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          organizationId: orgFeature.organizationId,
          enabled: !orgFeature.enabled,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to toggle feature');
      
      // Refresh organization features
      if (selectedFeature) {
        await fetchOrganizationFeatures(selectedFeature.id);
      }
    } catch (error) {
      console.error('Error toggling feature:', error);
      alert('Failed to toggle feature');
    }
  };

  const bulkEnableFeature = async (enable: boolean) => {
    if (!selectedFeature) return;
    
    try {
      const response = await apiRequest(`/api/feature-flags/${selectedFeature.id}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ enabled: enable }),
      });
      
      if (!response.ok) throw new Error(`Failed to ${enable ? 'enable' : 'disable'} feature`);
      
      // Refresh organization features
      await fetchOrganizationFeatures(selectedFeature.id);
      await fetchFeatures();
    } catch (error) {
      console.error(`Error ${enable ? 'enabling' : 'disabling'} feature:`, error);
      alert(`Failed to ${enable ? 'enable' : 'disable'} feature`);
    }
  };

  const handleToggleOrganization = async (orgId: string) => {
    if (!selectedFeature) return;
    
    const orgFeature = organizations.find(org => org.id === orgId);
    if (!orgFeature) return;

    try {
      const response = await apiRequest(`/api/feature-flags/${selectedFeature.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          organizationId: orgId,
          enabled: !orgFeature.enabled,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to toggle feature');
      
      // Get the actual updated data from the API response
      const result = await response.json();
      
      // Update local organizations state with the API response data
      setOrganizations(prevOrgs => 
        prevOrgs.map(org => 
          org.id === orgId 
            ? { 
                ...org, 
                enabled: result.organizationFeature.enabled,
                enabledAt: result.organizationFeature.enabledAt || undefined 
              }
            : org
        )
      );
      
      // Also update the organizationFeatures state for other modals
      setOrganizationFeatures(prev => 
        prev.map(orgFeature => 
          orgFeature.organizationId === orgId
            ? { ...orgFeature, enabled: result.organizationFeature.enabled, enabledAt: result.organizationFeature.enabledAt }
            : orgFeature
        )
      );
    } catch (error) {
      console.error('Error toggling feature:', error);
      alert('Failed to toggle feature');
    }
  };

  const handleBulkToggle = async (enable: boolean, orgIds?: string[]) => {
    if (!selectedFeature) return;
    
    try {
      if (orgIds && orgIds.length > 0) {
        // Bulk toggle specific organizations
        await Promise.all(orgIds.map(orgId => 
          apiRequest(`/api/feature-flags/${selectedFeature.id}/toggle`, {
            method: 'POST',
            body: JSON.stringify({
              organizationId: orgId,
              enabled: enable,
            }),
          })
        ));
      } else {
        // Bulk toggle all organizations
        const response = await apiRequest(`/api/feature-flags/${selectedFeature.id}/bulk`, {
          method: 'POST',
          body: JSON.stringify({ enabled: enable }),
        });
        
        if (!response.ok) throw new Error(`Failed to ${enable ? 'enable' : 'disable'} feature`);
      }
      
      // Refresh organization data
      const response = await apiRequest(`/api/feature-flags/${selectedFeature.id}/organizations`);
      if (response.ok) {
        const data = await response.json();
        const orgData = data.organizations.map((org: any) => ({
          id: org.organizationId,
          name: org.organizationName,
          enabled: org.enabled,
          enabledAt: org.enabledAt || undefined
        }));
        setOrganizations(orgData);
        setOrganizationFeatures(data.organizations);
      }
      
      await fetchFeatures();
    } catch (error) {
      console.error(`Error ${enable ? 'enabling' : 'disabling'} feature:`, error);
      alert(`Failed to ${enable ? 'enable' : 'disable'} feature`);
    }
  };

  const getStatusBadge = (feature: FeatureFlag) => {
    if (!feature) {
      return <span className="badge badge-gray">Unknown</span>;
    }
    if (feature.isBaseline) {
      return <span className="badge badge-blue">Baseline</span>;
    }
    if (!feature.isActive) {
      return <span className="badge badge-red">Disabled</span>;
    }
    if (!feature.isPublic) {
      return <span className="badge badge-purple">Private</span>;
    }
    return <span className="badge badge-green">Active</span>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Analytics': return '📊';
      case 'Export': return '📤';
      case 'Insights': return '🔍';
      case 'Integration': return '🔗';
      case 'Customization': return '🎨';
      case 'Documentation': return '📖';
      default: return '🏳️';
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Feature',
      width: '40%',
      render: (value: any, feature: FeatureFlag) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 text-lg">
            {getCategoryIcon(feature?.category || 'General')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">{feature?.name || 'Unknown Feature'}</div>
            <div className="text-xs text-gray-500 font-mono truncate">{feature?.key || 'N/A'}</div>
            <div className="text-sm text-gray-600 line-clamp-2">{feature?.description || 'No description'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '15%',
      render: (value: any, feature: FeatureFlag) => (
        <span className="badge badge-gray">{feature?.category || 'Unknown'}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      width: '15%',
      render: (value: any, feature: FeatureFlag) => (
        <span className="font-medium">
          {feature?.priceDisplay || (feature?.priceMonthly ? `$${feature.priceMonthly}/mo` : 'Free')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (value: any, feature: FeatureFlag) => getStatusBadge(feature),
    },
    {
      key: 'usage',
      label: 'Usage',
      width: '15%',
      render: (value: any, feature: FeatureFlag) => (
        <div className="flex items-center space-x-1">
          <UsersIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">{feature?.organizationCount || 0} orgs</span>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Feature Flags"
      description="Manage features and organization access"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <FlagIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Feature Management</h1>
              <p className="text-gray-600">Control feature access across all organizations</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {selectedRowFeature && !selectedRowFeature.isBaseline && (
              <Button 
                onClick={() => handleDelete(selectedRowFeature)} 
                variant="outline" 
                className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            )}
            <Button onClick={handleCreate} className="flex items-center space-x-2">
              <PlusIcon className="h-4 w-4" />
              <span>Add Feature</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-blue-600">{features.length}</div>
              <div className="text-sm text-gray-600">Total Features</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {features.filter(f => f.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Features</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {features.filter(f => !f.isPublic).length}
              </div>
              <div className="text-sm text-gray-600">Private Features</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {features.filter(f => f.isBaseline).length}
              </div>
              <div className="text-sm text-gray-600">Baseline Features</div>
            </CardBody>
          </Card>
        </div>

        {/* Features Table */}
        <Card>
          <CardBody>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading features...</p>
              </div>
            ) : (
              <DataTable
                data={features}
                columns={columns}
                searchable={true}
                searchPlaceholder="Search features..."
                onRowClick={handleRowClick}
                selectedRow={selectedRowFeature}
              />
            )}
          </CardBody>
        </Card>

        {/* Create/Edit Feature Modal */}
        {(showCreateModal || showEditModal) && (
          <Modal
            isOpen={showCreateModal || showEditModal}
            title={selectedFeature ? 'Edit Feature' : 'Create Feature'}
            onClose={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedFeature(null);
            }}
            size="lg"
          >
            <FeatureFormTabs
              formData={formData}
              setFormData={setFormData}
              organizations={organizations}
              onSave={handleSubmit}
              onCancel={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedFeature(null);
              }}
              loading={formLoading}
              isEdit={!!selectedFeature}
              onToggleOrganization={handleToggleOrganization}
              onBulkToggle={handleBulkToggle}
              organizationsLoading={organizationsLoading}
            />
          </Modal>
        )}

        {/* Organizations Modal */}
        {showOrganizationsModal && selectedFeature && (
          <Modal
            isOpen={showOrganizationsModal}
            title={`Organizations using "${selectedFeature.name}"`}
            onClose={() => setShowOrganizationsModal(false)}
            size="lg"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <div className="text-sm text-gray-600">
                  Manage feature access for all organizations
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => bulkEnableFeature(true)}
                  >
                    Enable for All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkEnableFeature(false)}
                  >
                    Disable for All
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {organizationFeatures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No organizations found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {organizationFeatures.map((orgFeature) => (
                      <div
                        key={orgFeature.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">{orgFeature.organizationName}</div>
                          {orgFeature.enabledAt && (
                            <div className="text-xs text-gray-500">
                              Enabled on {new Date(orgFeature.enabledAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={orgFeature.enabled}
                            onChange={() => toggleFeatureForOrg(orgFeature)}
                            className="toggle"
                          />
                          <span className="ml-2 text-sm">
                            {orgFeature.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Safe Delete Modal */}
        {showSafeDeleteModal && selectedFeature && (
          <SafeDeleteModal
            isOpen={showSafeDeleteModal}
            onClose={() => {
              setShowSafeDeleteModal(false);
              setSelectedFeature(null);
            }}
            onConfirm={handleDeleteConfirm}
            title="Delete Feature"
            itemName={selectedFeature.name}
            itemType="feature"
            warningMessage={
              selectedFeature.isBaseline 
                ? "This is a baseline feature and cannot be deleted." 
                : organizationFeatures.some(org => org.enabled)
                  ? "This feature is currently enabled for some organizations."
                  : undefined
            }
            affectedItems={organizationFeatures
              .filter(org => org.enabled)
              .map(org => ({ name: org.organizationName, type: "organization" }))
            }
            loading={deleteLoading}
          />
        )}

        {/* Old Delete Confirmation Modal - keeping for now */}
        {showDeleteModal && selectedFeature && (
          <ConfirmModal
            isOpen={showDeleteModal}
            title="Delete Feature"
            message={`Are you sure you want to delete "${selectedFeature.name}"? This will remove the feature and all organization access. This action cannot be undone.`}
            confirmText="Delete Feature"
            confirmVariant="danger"
            onConfirm={handleDeleteConfirm}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedFeature(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}