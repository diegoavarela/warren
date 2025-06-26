import React, { useState, useEffect } from 'react'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { platformAdminService } from '../services/platformAdminService'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { CreateCompanyModal } from '../components/CreateCompanyModal'
import { CompanyDetailsModal } from '../components/CompanyDetailsModal'

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

interface PlatformStats {
  total_companies: number
  active_companies: number
  total_users: number
  active_users: number
  users_with_2fa: number
  basic_companies: number
  standard_companies: number
  premium_companies: number
  enterprise_companies: number
}

export function PlatformAdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'platform_admin') {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [user, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, companiesRes] = await Promise.all([
        platformAdminService.getStats(),
        platformAdminService.getCompanies()
      ])
      setStats(statsRes.data.stats)
      setCompanies(companiesRes.data.companies)
      setFilteredCompanies(companiesRes.data.companies)
    } catch (error) {
      console.error('Failed to fetch platform data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = companies

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(company =>
        filterStatus === 'active' ? company.is_active : !company.is_active
      )
    }

    // Tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter(company => company.subscription_tier === filterTier)
    }

    setFilteredCompanies(filtered)
  }, [searchTerm, filterStatus, filterTier, companies])

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    fetchData()
  }

  const handleUpdateSuccess = () => {
    setSelectedCompany(null)
    fetchData()
  }

  const getTierColor = (tier: string) => {
    const colors = {
      basic: 'bg-gray-100 text-gray-800',
      standard: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800'
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading platform data...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
        <p className="text-gray-600 mt-2">Manage companies and monitor platform health</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_companies || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.active_companies || 0} active
              </p>
            </div>
            <BuildingOfficeIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.active_users || 0} active
              </p>
            </div>
            <UserGroupIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">2FA Adoption</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats && stats.total_users > 0
                  ? Math.round((stats.users_with_2fa / stats.total_users) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.users_with_2fa || 0} users
              </p>
            </div>
            <ChartBarIcon className="h-10 w-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subscription Mix</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{stats?.basic_companies || 0}</span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded">{stats?.standard_companies || 0}</span>
                <span className="text-xs bg-purple-100 px-2 py-1 rounded">{stats?.premium_companies || 0}</span>
                <span className="text-xs bg-yellow-100 px-2 py-1 rounded">{stats?.enterprise_companies || 0}</span>
              </div>
            </div>
            <CurrencyDollarIcon className="h-10 w-10 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Companies Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Company
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Tiers</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCompany(company)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.email || company.industry}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {company.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(company.subscription_tier)}`}>
                      {company.subscription_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {company.active_user_count} / {company.user_limit || '∞'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.user_count} total
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.last_activity ? formatDate(company.last_activity) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(company.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {selectedCompany && (
        <CompanyDetailsModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  )
}