import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { platformAdminService } from '../services/platformAdminService'

interface CreateCompanyModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateCompanyModal({ onClose, onSuccess }: CreateCompanyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    email: '',
    industry: '',
    description: '',
    subscriptionTier: 'basic',
    userLimit: 5,
    allowedEmailDomains: '',
    adminEmail: '',
    adminPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name || !formData.adminEmail || !formData.adminPassword) {
      setError('Company name, admin email, and admin password are required')
      return
    }

    if (formData.adminPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      const domains = formData.allowedEmailDomains
        ? formData.allowedEmailDomains.split(',').map(d => d.trim()).filter(Boolean)
        : []

      await platformAdminService.createCompany({
        ...formData,
        userLimit: formData.subscriptionTier === 'enterprise' ? undefined : formData.userLimit,
        allowedEmailDomains: domains
      })

      onSuccess()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  const subscriptionTiers = [
    { value: 'basic', label: 'Basic', userLimit: 5 },
    { value: 'standard', label: 'Standard', userLimit: 10 },
    { value: 'premium', label: 'Premium', userLimit: 25 },
    { value: 'enterprise', label: 'Enterprise', userLimit: null }
  ]

  const handleTierChange = (tier: string) => {
    const selectedTier = subscriptionTiers.find(t => t.value === tier)
    setFormData({
      ...formData,
      subscriptionTier: tier,
      userLimit: selectedTier?.userLimit || 5
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Company</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Company Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* Subscription Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Tier
                </label>
                <select
                  value={formData.subscriptionTier}
                  onChange={(e) => handleTierChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {subscriptionTiers.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label} {tier.userLimit && `(${tier.userLimit} users)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Limit
                </label>
                <input
                  type="number"
                  value={formData.subscriptionTier === 'enterprise' ? '' : formData.userLimit}
                  onChange={(e) => setFormData({ ...formData, userLimit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formData.subscriptionTier === 'enterprise'}
                  placeholder={formData.subscriptionTier === 'enterprise' ? 'Unlimited' : ''}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed Email Domains
              </label>
              <input
                type="text"
                value={formData.allowedEmailDomains}
                onChange={(e) => setFormData({ ...formData, allowedEmailDomains: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example.com, company.org (comma separated)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to allow any email domain
              </p>
            </div>
          </div>

          {/* Admin Account */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Admin Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email *
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password *
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Minimum 6 characters
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}