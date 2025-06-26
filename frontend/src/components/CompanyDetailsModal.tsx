import React, { useState, useEffect } from 'react'
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'
import { platformAdminService } from '../services/platformAdminService'

interface CompanyData {
  id: string
  name: string
  website?: string
  email?: string
  industry?: string
  subscription_tier: string
  user_limit: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  user_count: number
  active_user_count: number
  last_activity?: string
}

interface CompanyStats {
  id: string
  name: string
  subscription_tier: string
  user_limit: number | null
  total_users: number
  active_users: number
  admin_count: number
  users_with_2fa: number
  pending_invitations: number
  uploaded_files: number
  pnl_uploads: number
  last_activity?: string
}

interface CompanyDetailsModalProps {
  company: CompanyData
  onClose: () => void
  onUpdate: () => void
}

export function CompanyDetailsModal({ company, onClose, onUpdate }: CompanyDetailsModalProps) {
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: company.name,
    website: company.website || '',
    email: company.email || '',
    industry: company.industry || '',
    subscription_tier: company.subscription_tier,
    user_limit: company.user_limit || 0,
    is_active: company.is_active
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCompanyStats()
  }, [company.id])

  const fetchCompanyStats = async () => {
    try {
      setLoading(true)
      const response = await platformAdminService.getCompanyStats(company.id)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Failed to fetch company stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setError('')
    try {
      setSaving(true)
      await platformAdminService.updateCompany(company.id, formData)
      setEditing(false)
      onUpdate()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update company')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!window.confirm(`Are you sure you want to deactivate ${company.name}? This will disable access for all users.`)) {
      return
    }

    try {
      setSaving(true)
      await platformAdminService.deleteCompany(company.id)
      onUpdate()
      onClose()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to deactivate company')
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const subscriptionTiers = [
    { value: 'basic', label: 'Basic', userLimit: 5 },
    { value: 'standard', label: 'Standard', userLimit: 10 },
    { value: 'premium', label: 'Premium', userLimit: 25 },
    { value: 'enterprise', label: 'Enterprise', userLimit: null }
  ]

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Company Details</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Company Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={formData.subscription_tier}
                    onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {subscriptionTiers.map(tier => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
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
                    value={formData.subscription_tier === 'enterprise' ? '' : formData.user_limit}
                    onChange={(e) => setFormData({ ...formData, user_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={formData.subscription_tier === 'enterprise'}
                    placeholder={formData.subscription_tier === 'enterprise' ? 'Unlimited' : ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Website</p>
                  <p className="font-medium">{company.website || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{company.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Industry</p>
                  <p className="font-medium">{company.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{formatDate(company.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">{formatDate(company.updated_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          {!editing && stats && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_users} / {stats.user_limit || '∞'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.active_users} active
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.admin_count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.pending_invitations} pending invites
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">2FA Adoption</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_users > 0
                      ? Math.round((stats.users_with_2fa / stats.total_users) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.users_with_2fa} users
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Data Uploads</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.uploaded_files + stats.pnl_uploads}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.uploaded_files} cashflow, {stats.pnl_uploads} P&L
                  </p>
                </div>
              </div>
              {stats.last_activity && (
                <p className="mt-4 text-sm text-gray-600">
                  Last activity: {formatDate(stats.last_activity)}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            {editing ? (
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleDeactivate}
                  disabled={!company.is_active || saving}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deactivate Company
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}