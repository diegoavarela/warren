import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BuildingOfficeIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  PencilIcon,
  PhotoIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { configurationService, CompanyConfig, StructureDetectionResult } from '../services/configurationService'
import { Currency, Unit, CURRENCIES, UNITS } from '../interfaces/currency'

export const ConfigurationPageV2: React.FC = () => {
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true) // Always in edit mode
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    primaryColor: '#7CB342',
    secondaryColor: '#2E7D32',
    logo: '',
    enableCurrencyConversion: true,
    showCurrencySelector: true,
    // Module-specific settings
    pnlCurrency: 'ARS' as Currency,
    pnlUnit: 'thousands' as Unit,
    cashflowCurrency: 'ARS' as Currency,
    cashflowUnit: 'units' as Unit
  })

  useEffect(() => {
    loadCompany()
  }, [])

  const loadCompany = async () => {
    try {
      setLoading(true)
      const response = await configurationService.getCompanies()
      if (response.data.length > 0) {
        const activeCompany = response.data.find(c => c.isActive) || response.data[0]
        setCompany(activeCompany)
        // Populate form with existing data
        setFormData({
          name: activeCompany.name || '',
          industry: activeCompany.industry || '',
          website: activeCompany.website || '',
          email: activeCompany.email || '',
          phone: activeCompany.phone || '',
          address: activeCompany.address || '',
          description: activeCompany.description || '',
          primaryColor: activeCompany.primaryColor || '#7CB342',
          secondaryColor: activeCompany.secondaryColor || '#2E7D32',
          logo: activeCompany.logo || '',
          enableCurrencyConversion: activeCompany.currencySettings?.enableCurrencyConversion ?? true,
          showCurrencySelector: activeCompany.currencySettings?.showCurrencySelector ?? true,
          // Module-specific settings
          pnlCurrency: activeCompany.pnlSettings?.currency || 'ARS',
          pnlUnit: activeCompany.pnlSettings?.unit || 'thousands',
          cashflowCurrency: activeCompany.cashflowSettings?.currency || 'ARS',
          cashflowUnit: activeCompany.cashflowSettings?.unit || 'units'
        })
      } else {
        // Create a default company
        const newCompany = await configurationService.addCompany({
          name: 'My Company',
          currency: 'ARS',
          scale: 'thousands'
        })
        setCompany(newCompany.data)
      }
    } catch (err: any) {
      setError('Failed to load company configuration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!company) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const updateData = {
        ...formData,
        currencySettings: {
          defaultCurrency: formData.pnlCurrency, // Use P&L as default for now
          defaultUnit: formData.pnlUnit,
          enableCurrencyConversion: formData.enableCurrencyConversion,
          showCurrencySelector: formData.showCurrencySelector
        },
        pnlSettings: {
          currency: formData.pnlCurrency,
          unit: formData.pnlUnit,
          enableCurrencyConversion: formData.enableCurrencyConversion,
          showCurrencySelector: formData.showCurrencySelector
        },
        cashflowSettings: {
          currency: formData.cashflowCurrency,
          unit: formData.cashflowUnit,
          enableCurrencyConversion: formData.enableCurrencyConversion,
          showCurrencySelector: formData.showCurrencySelector
        }
      }
      
      const response = await configurationService.updateCompany(company.id, updateData)
      setCompany(response.data)
      setSuccess('Configuration saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save configuration')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setFormData(prev => ({ ...prev, logo: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Cog6ToothIcon className="h-8 w-8 mr-3 text-violet-600" />
          Company Configuration
        </h1>
        <p className="text-gray-600 mt-2">Configure your company details and Excel file structure</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center animate-fade-in">
          <XCircleIcon className="h-6 w-6 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center animate-fade-in">
          <CheckCircleIcon className="h-6 w-6 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="bg-white rounded-2xl shadow-lg">
        {/* Card Header with Save Button */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {formData.logo ? (
                <img 
                  src={formData.logo} 
                  alt="Company logo"
                  className="h-12 w-12 object-cover rounded-xl border border-gray-200"
                />
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-violet-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formData.name || 'Company Settings'}
                </h2>
                <p className="text-sm text-gray-500">Update your company information and preferences</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-8">
          {/* Company Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">Company Logo</label>
            <div className="flex items-center space-x-4">
              {formData.logo && (
                <img 
                  src={formData.logo} 
                  alt="Company logo preview"
                  className="h-20 w-20 object-cover rounded-xl border-2 border-gray-200"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 cursor-pointer transition-colors"
              >
                <PhotoIcon className="h-5 w-5" />
                <span>{formData.logo ? 'Change Logo' : 'Upload Logo'}</span>
              </label>
              {formData.logo && (
                <button
                  onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>
          </div>


          {/* Module-Specific Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Module-Specific Settings</h3>
            <div className="bg-gray-50 p-6 rounded-xl space-y-6">
              
              {/* P&L Settings */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                  <CalculatorIcon className="h-5 w-5 mr-2 text-emerald-600" />
                  P&L Dashboard Settings
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Currency</label>
                      <select
                        value={formData.pnlCurrency}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnlCurrency: e.target.value as Currency }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      >
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <option key={code} value={code}>
                            {info.name} ({code})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Currency of your P&L data in Excel</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Unit Scale</label>
                      <select
                        value={formData.pnlUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnlUnit: e.target.value as Unit }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      >
                        {Object.entries(UNITS).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Unit scale of your P&L data in Excel</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableCurrencyConversion}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableCurrencyConversion: e.target.checked }))}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable currency conversion</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showCurrencySelector}
                        onChange={(e) => setFormData(prev => ({ ...prev, showCurrencySelector: e.target.checked }))}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show currency/unit selector</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cash Flow Settings */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-violet-600" />
                  Cash Flow Dashboard Settings
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Currency</label>
                      <select
                        value={formData.cashflowCurrency}
                        onChange={(e) => setFormData(prev => ({ ...prev, cashflowCurrency: e.target.value as Currency }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      >
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <option key={code} value={code}>
                            {info.name} ({code})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Currency of your Cash Flow data in Excel</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Unit Scale</label>
                      <select
                        value={formData.cashflowUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, cashflowUnit: e.target.value as Unit }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      >
                        {Object.entries(UNITS).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Unit scale of your Cash Flow data in Excel</p>
                    </div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableCurrencyConversion}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableCurrencyConversion: e.target.checked }))}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable currency conversion</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showCurrencySelector}
                        onChange={(e) => setFormData(prev => ({ ...prev, showCurrencySelector: e.target.checked }))}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show currency/unit selector</span>
                    </label>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <GlobeAltIcon className="inline h-4 w-4 mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="https://company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PhoneIcon className="inline h-4 w-4 mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="inline h-4 w-4 mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="123 Business St, City, Country"
                />
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex space-x-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-mono"
                    placeholder="#7CB342"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex space-x-3">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-mono"
                    placeholder="#2E7D32"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              placeholder="Brief description of your company..."
            />
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-violet-50 rounded-xl p-6">
        <div className="flex items-start">
          <SparklesIcon className="h-6 w-6 text-violet-600 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-violet-900 mb-1">Configuration Tips</h4>
            <ul className="text-xs text-violet-700 space-y-1">
              <li>• Upload your company logo for a personalized experience</li>
              <li>• Configure Excel structure to enable automatic data import</li>
              <li>• Set your preferred currency and unit display options</li>
              <li>• All changes are saved automatically when you click "Save Changes"</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}