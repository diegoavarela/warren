"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';
import { 
  InformationCircleIcon, 
  UsersIcon, 
  CogIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  enabled: boolean;
  enabledAt?: string;
}

interface FeatureFormData {
  key: string;
  name: string;
  description: string;
  category: string;
  priceMonthly: string;
  priceDisplay: string;
  isPublic: boolean;
  isBaseline: boolean;
  requirements: string;
  setupTime: string;
  icon: string;
}

interface FeatureFormTabsProps {
  formData: FeatureFormData;
  setFormData: (data: FeatureFormData) => void;
  organizations: Organization[];
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
  onToggleOrganization?: (orgId: string) => void;
  onBulkToggle?: (enabled: boolean, orgIds?: string[]) => void;
  organizationsLoading?: boolean;
}

export function FeatureFormTabs({
  formData,
  setFormData,
  organizations,
  onSave,
  onCancel,
  loading,
  isEdit,
  onToggleOrganization,
  onBulkToggle,
  organizationsLoading
}: FeatureFormTabsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [orgSearch, setOrgSearch] = useState('');
  const [visibleOrgs, setVisibleOrgs] = useState(20);

  const tabs = [
    {
      id: 'general',
      name: 'General Info',
      icon: InformationCircleIcon,
      count: null
    },
    {
      id: 'access',
      name: 'Organization Access',
      icon: UsersIcon,
      count: organizations.filter(org => org.enabled).length
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      count: null
    }
  ];

  // Filter organizations based on search
  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const displayedOrgs = filteredOrgs.slice(0, visibleOrgs);

  const toggleOrganization = (orgId: string) => {
    if (onToggleOrganization) {
      onToggleOrganization(orgId);
    }
  };

  const loadMoreOrgs = () => {
    setVisibleOrgs(prev => prev + 20);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
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
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AI_CHAT"
                  required
                  disabled={isEdit}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (cannot be changed after creation)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AI Financial Chat"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Chat with AI about your financial data..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Export">Export</option>
                  <option value="Insights">Insights</option>
                  <option value="Integration">Integration</option>
                  <option value="Customization">Customization</option>
                  <option value="Documentation">Documentation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Display
                </label>
                <input
                  type="text"
                  value={formData.priceDisplay}
                  onChange={(e) => setFormData({ ...formData, priceDisplay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="$500/month or Contact for pricing"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <input
                  type="text"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Requires 6+ months of data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Time
                </label>
                <input
                  type="text"
                  value={formData.setupTime}
                  onChange={(e) => setFormData({ ...formData, setupTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="24 hours"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Organization Access</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage which organizations have access to this feature
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {organizations.filter(org => org.enabled).length} of {organizations.length} enabled
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex space-x-3">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (onBulkToggle) {
                    const orgIds = filteredOrgs.map(org => org.id);
                    onBulkToggle(true, orgIds);
                  }
                }}
                className="text-sm"
              >
                Enable All {orgSearch && `(${filteredOrgs.length})`}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (onBulkToggle) {
                    const orgIds = filteredOrgs.map(org => org.id);
                    onBulkToggle(false, orgIds);
                  }
                }}
                className="text-sm"
              >
                Disable All {orgSearch && `(${filteredOrgs.length})`}
              </Button>
            </div>

            {/* Organizations List */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {organizationsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading organizations...</p>
                </div>
              ) : displayedOrgs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {orgSearch ? `No organizations found matching "${orgSearch}"` : 'No organizations available'}
                </div>
              ) : (
                <>
                  {displayedOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {org.name}
                        </div>
                        {org.enabled && org.enabledAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Enabled on {new Date(org.enabledAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <label className="flex items-center ml-4">
                        <input
                          type="checkbox"
                          checked={org.enabled}
                          onChange={() => toggleOrganization(org.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {org.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>
                  ))}
                  
                  {/* Load More */}
                  {filteredOrgs.length > visibleOrgs && (
                    <div className="p-4 text-center border-t border-gray-200 bg-gray-50">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={loadMoreOrgs}
                      >
                        Load More ({filteredOrgs.length - visibleOrgs} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Feature Settings</h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure global settings for this feature
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                    Public Feature
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, this feature is visible to all organizations and can be purchased directly from the marketplace.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="isBaseline"
                  checked={formData.isBaseline}
                  onChange={(e) => setFormData({ ...formData, isBaseline: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="isBaseline" className="text-sm font-medium text-gray-700">
                    Baseline Feature
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Baseline features are always enabled for all organizations and cannot be disabled. These are core features included in the base plan.
                  </p>
                </div>
              </div>
            </div>

            {(formData.isPublic || formData.isBaseline) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">
                      {formData.isBaseline ? 'Baseline Feature Settings' : 'Public Feature Settings'}
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {formData.isBaseline 
                        ? 'This feature will be automatically enabled for all organizations and cannot be disabled by users.'
                        : 'This feature will appear in the public marketplace and can be purchased by any organization.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          loading={loading}
          disabled={!formData.name.trim() || !formData.key.trim()}
        >
          {isEdit ? 'Update Feature' : 'Create Feature'}
        </Button>
      </div>
    </div>
  );
}