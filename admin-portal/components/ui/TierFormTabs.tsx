"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';
import { 
  InformationCircleIcon, 
  CreditCardIcon, 
  UsersIcon,
  CogIcon,
  StarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

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

interface TierFormTabsProps {
  formData: TierFormData;
  setFormData: (data: TierFormData) => void;
  features: FeatureFlag[];
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
  featuresLoading?: boolean;
}

export function TierFormTabs({
  formData,
  setFormData,
  features,
  onSave,
  onCancel,
  loading,
  isEdit,
  featuresLoading
}: TierFormTabsProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [featureSearch, setFeatureSearch] = useState('');

  const tabs = [
    {
      id: 'basic',
      name: 'Basic Info',
      icon: InformationCircleIcon,
      count: null
    },
    {
      id: 'pricing',
      name: 'Pricing & Limits',
      icon: CreditCardIcon,
      count: null
    },
    {
      id: 'features',
      name: 'Features',
      icon: StarIcon,
      count: formData.features.length
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      count: null
    }
  ];

  const handleFeatureToggle = (featureKey: string) => {
    const newFeatures = formData.features.includes(featureKey)
      ? formData.features.filter(f => f !== featureKey)
      : [...formData.features, featureKey];
    
    setFormData({ ...formData, features: newFeatures });
  };

  // Filter features based on search
  const filteredFeatures = features.filter(feature =>
    feature.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
    feature.key.toLowerCase().includes(featureSearch.toLowerCase()) ||
    feature.category.toLowerCase().includes(featureSearch.toLowerCase())
  );

  // Group features by category
  const featuresByCategory = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== null && (
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="standard, standard_plus, advanced"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for internal identification and API references
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Standard, Standard+, Advanced"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customer-facing name displayed in UI
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe this tier and its benefits..."
              />
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CreditCardIcon className="inline h-4 w-4 mr-1" />
                  Monthly Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CreditCardIcon className="inline h-4 w-4 mr-1" />
                  Annual Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.priceAnnual}
                  onChange={(e) => setFormData({ ...formData, priceAnnual: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typically 10-20% discount from monthly × 12
                </p>
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <UsersIcon className="inline h-4 w-4 mr-1" />
                  Max Users <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Hours
                </label>
                <input
                  type="number"
                  value={formData.setupHours || ''}
                  onChange={(e) => setFormData({ ...formData, setupHours: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Credits Monthly ($)
                </label>
                <input
                  type="number"
                  value={formData.aiCreditsMonthly}
                  onChange={(e) => setFormData({ ...formData, aiCreditsMonthly: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Feature Hours
                </label>
                <input
                  type="number"
                  value={formData.customFeatureHours}
                  onChange={(e) => setFormData({ ...formData, customFeatureHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Feature Selection</h3>
                <p className="text-sm text-gray-500">Select which features are included in this tier</p>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {featuresLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading features...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(featuresByCategory).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No features found. {featureSearch && "Try adjusting your search."}
                  </div>
                ) : (
                  Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center">
                        {category}
                        <span className="ml-2 text-xs text-gray-500">
                          ({categoryFeatures.length} feature{categoryFeatures.length !== 1 ? 's' : ''})
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryFeatures.map((feature) => (
                          <div key={feature.key} className="border border-gray-200 rounded-lg p-3">
                            <label className="flex items-start cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.features.includes(feature.key)}
                                onChange={() => handleFeatureToggle(feature.key)}
                                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">{feature.name}</span>
                                  {feature.priceDisplay && (
                                    <span className="text-xs text-blue-600 font-medium">{feature.priceDisplay}</span>
                                  )}
                                </div>
                                {feature.description && (
                                  <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                                )}
                                <div className="flex items-center mt-2">
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                    {feature.key}
                                  </span>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first in tier selection
                </p>
              </div>
              
              <div className="flex items-start">
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-2">
                    <span className="text-sm font-medium text-gray-700">Active</span>
                    <p className="text-xs text-gray-500">
                      Only active tiers are available for selection
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {isEdit ? 'Update Tier' : 'Create Tier'}
        </Button>
      </div>
    </form>
  );
}