"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Subcategory {
  id: string;
  value: string;
  label: string;
  mainCategories: string[];
  isActive: boolean;
  source: 'company' | 'organization';
  isOverride?: boolean;
  organizationSubcategoryId?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  source: 'company' | 'organization';
}

const mainCategories = [
  { value: 'revenue', label: 'Revenue', isInflow: true, isOutflow: false },
  { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold', isInflow: false, isOutflow: true },
  { value: 'operating_expenses', label: 'Operating Expenses', isInflow: false, isOutflow: true },
  { value: 'personnel_costs', label: 'Personnel Costs', isInflow: false, isOutflow: true },
  { value: 'financial_income', label: 'Financial Income', isInflow: true, isOutflow: false },
  { value: 'financial_expenses', label: 'Financial Expenses', isInflow: false, isOutflow: true },
  { value: 'taxes', label: 'Taxes', isInflow: false, isOutflow: true },
  { value: 'extraordinary_items', label: 'Extraordinary Items', isInflow: true, isOutflow: true }
];

// Helper function to determine flow type from mainCategories
const getFlowType = (subcategoryMainCategories: string[]) => {
  if (!subcategoryMainCategories || subcategoryMainCategories.length === 0) {
    return 'unknown';
  }

  const hasInflow = subcategoryMainCategories.some(category => 
    mainCategories.find(c => c.value === category)?.isInflow
  );
  const hasOutflow = subcategoryMainCategories.some(category => 
    mainCategories.find(c => c.value === category)?.isOutflow
  );

  if (hasInflow && hasOutflow) {
    return 'mixed';
  } else if (hasInflow) {
    return 'inbound';
  } else if (hasOutflow) {
    return 'outbound';
  } else {
    return 'unknown';
  }
};

// Helper function to get flow type badge
const getFlowTypeBadge = (flowType: string, locale?: string) => {
  const colors = {
    inbound: 'bg-green-100 text-green-800',
    outbound: 'bg-red-100 text-red-800',
    mixed: 'bg-blue-100 text-blue-800',
    unknown: 'bg-gray-100 text-gray-800'
  };

  const labels = {
    inbound: locale?.startsWith('es') ? 'Entrada' : 'Inbound',
    outbound: locale?.startsWith('es') ? 'Salida' : 'Outbound',
    mixed: locale?.startsWith('es') ? 'Mixto' : 'Mixed',
    unknown: locale?.startsWith('es') ? 'Desconocido' : 'Unknown'
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[flowType as keyof typeof colors]}`}>
      {labels[flowType as keyof typeof labels]}
    </span>
  );
};

function TemplateManagePage({ params }: { params: { templateId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [newSubcategory, setNewSubcategory] = useState({ 
    label: '', 
    flowType: 'inbound' as 'inbound' | 'outbound' | 'mixed'
  });
  const [editSubcategory, setEditSubcategory] = useState({ 
    label: '', 
    flowType: 'inbound' as 'inbound' | 'outbound' | 'mixed'
  });

  const templateId = params.templateId;

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchTemplate(companyId);
      fetchSubcategories(companyId);
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router, templateId]);

  const fetchTemplate = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/subcategory-templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplate({
            ...data.data,
            source: 'company'
          });
        }
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar plantilla' : 'Failed to load template');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const fetchSubcategories = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/subcategories/by-template/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubcategories(data.data || []);
        }
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar subcategorías' : 'Failed to load subcategories');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin/subcategory-templates');
  };

  // Auto-generate value from label
  const generateValue = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .trim();
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategory.label.trim()) return;
    
    try {
      // Map flow type to main categories
      const mainCategoriesForFlow = getMainCategoriesForFlowType(newSubcategory.flowType);
      const autoGeneratedValue = generateValue(newSubcategory.label);
      
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyTemplateId: templateId,
          value: autoGeneratedValue,
          label: newSubcategory.label,
          mainCategories: mainCategoriesForFlow,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewSubcategory({ label: '', flowType: 'inbound' });
        fetchSubcategories(selectedCompanyId);
        toast.success(locale?.startsWith('es') ? 'Subcategoría añadida' : 'Subcategory added');
      } else {
        const errorData = await response.json();
        toast.error(
          locale?.startsWith('es') ? 'Error al añadir subcategoría' : 'Failed to add subcategory',
          errorData.error
        );
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleEditSubcategory = async () => {
    if (!editSubcategory.label.trim() || !editingSubcategory) return;
    
    try {
      // Map flow type to main categories
      const mainCategoriesForFlow = getMainCategoriesForFlowType(editSubcategory.flowType);
      const autoGeneratedValue = generateValue(editSubcategory.label);
      
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategories/${editingSubcategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: autoGeneratedValue,
          label: editSubcategory.label,
          mainCategories: mainCategoriesForFlow,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingSubcategory(null);
        setEditSubcategory({ label: '', flowType: 'inbound' });
        fetchSubcategories(selectedCompanyId);
        toast.success(locale?.startsWith('es') ? 'Subcategoría actualizada' : 'Subcategory updated');
      } else {
        const errorData = await response.json();
        toast.error(
          locale?.startsWith('es') ? 'Error al actualizar subcategoría' : 'Failed to update subcategory',
          errorData.error
        );
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta subcategoría?' : 'Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategories/${subcategoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSubcategories(selectedCompanyId);
        toast.success(locale?.startsWith('es') ? 'Subcategoría eliminada' : 'Subcategory deleted');
      } else {
        toast.error(locale?.startsWith('es') ? 'Error al eliminar subcategoría' : 'Failed to delete subcategory');
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const openEditModal = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    const flowType = getFlowType(subcategory.mainCategories);
    setEditSubcategory({
      label: subcategory.label,
      flowType: flowType === 'unknown' ? 'mixed' : flowType as "inbound" | "outbound" | "mixed"
    });
    setShowEditModal(true);
  };

  const getMainCategoriesForFlowType = (flowType: 'inbound' | 'outbound' | 'mixed') => {
    switch (flowType) {
      case 'inbound':
        return ['revenue', 'financial_income'];
      case 'outbound':
        return ['cost_of_goods_sold', 'operating_expenses', 'personnel_costs', 'financial_expenses', 'taxes'];
      case 'mixed':
        return ['extraordinary_items'];
      default:
        return [];
    }
  };

  // Sort subcategories by flow type (inbound first, then outbound, then mixed)
  const sortedSubcategories = [...subcategories].sort((a, b) => {
    const flowA = getFlowType(a.mainCategories);
    const flowB = getFlowType(b.mainCategories);
    
    const order = { inbound: 0, outbound: 1, mixed: 2, unknown: 3 };
    const orderA = order[flowA as keyof typeof order] ?? 3;
    const orderB = order[flowB as keyof typeof order] ?? 3;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    return a.label.localeCompare(b.label);
  });

  return (
    <AppLayout showFooter={true}>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {locale?.startsWith('es') ? 'Volver a plantillas' : 'Back to templates'}
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Gestionar Plantilla' : 'Manage Template'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {template?.name || 'Loading...'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                {locale?.startsWith('es') ? 'Añadir Subcategoría' : 'Add Subcategory'}
              </Button>
            </div>
          </div>

          {/* Subcategories List */}
          <div className="grid gap-4">
            {loading ? (
              <Card>
                <CardBody className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cargando subcategorías...' : 'Loading subcategories...'}
                  </p>
                </CardBody>
              </Card>
            ) : error ? (
              <Card>
                <CardBody className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={() => fetchSubcategories(selectedCompanyId)}>
                    {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                  </Button>
                </CardBody>
              </Card>
            ) : sortedSubcategories.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {locale?.startsWith('es')
                      ? 'No hay subcategorías'
                      : 'No subcategories found'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {locale?.startsWith('es')
                      ? 'Añade subcategorías a esta plantilla'
                      : 'Add subcategories to this template'}
                  </p>
                  <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    {locale?.startsWith('es') ? 'Añadir Primera Subcategoría' : 'Add First Subcategory'}
                  </Button>
                </CardBody>
              </Card>
            ) : (
              sortedSubcategories.map((subcategory) => (
                <div key={subcategory.id} className="flex items-center justify-between py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{subcategory.label}</span>
                        {getFlowTypeBadge(getFlowType(subcategory.mainCategories), locale)}
                        {subcategory.source === 'organization' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {locale?.startsWith('es') ? 'Org' : 'Org'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {subcategory.source === 'company' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(subcategory)}
                          title={locale?.startsWith('es') ? 'Editar' : 'Edit'}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteSubcategory(subcategory.id)}
                          title={locale?.startsWith('es') ? 'Eliminar' : 'Delete'}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Subcategory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Añadir Subcategoría' : 'Add Subcategory'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Etiqueta' : 'Label'}
                </label>
                <input
                  type="text"
                  value={newSubcategory.label}
                  onChange={(e) => setNewSubcategory({...newSubcategory, label: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Nombre de la subcategoría' : 'Subcategory name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Tipo de Flujo' : 'Flow Type'}
                </label>
                <select
                  value={newSubcategory.flowType}
                  onChange={(e) => setNewSubcategory({...newSubcategory, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inbound">{locale?.startsWith('es') ? 'Entrada' : 'Inbound'}</option>
                  <option value="outbound">{locale?.startsWith('es') ? 'Salida' : 'Outbound'}</option>
                  <option value="mixed">{locale?.startsWith('es') ? 'Mixto' : 'Mixed'}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setNewSubcategory({ label: '', flowType: 'inbound' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleAddSubcategory}
                disabled={!newSubcategory.label.trim()}
              >
                {locale?.startsWith('es') ? 'Añadir' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Editar Subcategoría' : 'Edit Subcategory'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Etiqueta' : 'Label'}
                </label>
                <input
                  type="text"
                  value={editSubcategory.label}
                  onChange={(e) => setEditSubcategory({...editSubcategory, label: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Nombre de la subcategoría' : 'Subcategory name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Tipo de Flujo' : 'Flow Type'}
                </label>
                <select
                  value={editSubcategory.flowType}
                  onChange={(e) => setEditSubcategory({...editSubcategory, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inbound">{locale?.startsWith('es') ? 'Entrada' : 'Inbound'}</option>
                  <option value="outbound">{locale?.startsWith('es') ? 'Salida' : 'Outbound'}</option>
                  <option value="mixed">{locale?.startsWith('es') ? 'Mixto' : 'Mixed'}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSubcategory(null);
                  setEditSubcategory({ label: '', flowType: 'inbound' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleEditSubcategory}
                disabled={!editSubcategory.label.trim()}
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

export default function TemplateManagePageWrapper({ params }: { params: { templateId: string } }) {
  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <TemplateManagePage params={params} />
    </ProtectedRoute>
  );
}