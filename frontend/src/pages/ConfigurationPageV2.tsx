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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
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
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-8">
          {/* Company Logo */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-8 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <PhotoIcon className="h-5 w-5 mr-2 text-violet-600" />
              Company Logo
            </h3>
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                {formData.logo ? (
                  <div className="relative group">
                    <img 
                      src={formData.logo} 
                      alt="Company logo"
                      className="h-32 w-32 object-cover rounded-2xl shadow-lg border-2 border-white group-hover:shadow-xl transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-2xl transition-all duration-300"></div>
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-300 flex flex-col items-center justify-center group hover:border-violet-400 transition-all">
                    <PhotoIcon className="h-12 w-12 text-gray-400 group-hover:text-violet-500 transition-colors mb-2" />
                    <span className="text-xs text-gray-500">No logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex items-center space-x-3">
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-lg cursor-pointer transition-all border border-gray-300 shadow-md hover:scale-105"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 text-violet-600" />
                    <span className="font-medium">{formData.logo ? 'Change Logo' : 'Upload Logo'}</span>
                  </label>
                  {formData.logo && (
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                      className="px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-700 flex items-start">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5" />
                    <span>Recommended: Square image (1:1 ratio), minimum 200x200px, PNG or JPG format</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-violet-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>
          </div>


          {/* Module-Specific Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Cog6ToothIcon className="h-5 w-5 mr-2 text-violet-600" />
              Module-Specific Settings
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* P&L Settings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                  <CalculatorIcon className="h-5 w-5 mr-2 text-emerald-600" />
                  P&L Dashboard Settings
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Currency</label>
                      <select
                        value={formData.pnlCurrency}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnlCurrency: e.target.value as Currency }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <option key={code} value={code}>
                            {info.name} ({code})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-500 italic">Currency of your P&L data in Excel</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Unit Scale</label>
                      <select
                        value={formData.pnlUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, pnlUnit: e.target.value as Unit }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {Object.entries(UNITS).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-500 italic">Unit scale of your P&L data in Excel</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 space-y-3 border border-emerald-100">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableCurrencyConversion}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableCurrencyConversion: e.target.checked }))}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded transition-all"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable currency conversion</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showCurrencySelector}
                        onChange={(e) => setFormData(prev => ({ ...prev, showCurrencySelector: e.target.checked }))}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded transition-all"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show currency/unit selector</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cash Flow Settings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 mr-2 text-violet-600" />
                  Cash Flow Dashboard Settings
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Currency</label>
                      <select
                        value={formData.cashflowCurrency}
                        onChange={(e) => setFormData(prev => ({ ...prev, cashflowCurrency: e.target.value as Currency }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <option key={code} value={code}>
                            {info.name} ({code})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-500 italic">Currency of your Cash Flow data in Excel</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Unit Scale</label>
                      <select
                        value={formData.cashflowUnit}
                        onChange={(e) => setFormData(prev => ({ ...prev, cashflowUnit: e.target.value as Unit }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {Object.entries(UNITS).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-gray-500 italic">Unit scale of your Cash Flow data in Excel</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 space-y-3 border border-violet-100">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableCurrencyConversion}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableCurrencyConversion: e.target.checked }))}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded transition-all"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable currency conversion</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showCurrencySelector}
                        onChange={(e) => setFormData(prev => ({ ...prev, showCurrencySelector: e.target.checked }))}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded transition-all"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show currency/unit selector</span>
                    </label>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2 text-violet-600" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <GlobeAltIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="https://company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="123 Business St, City, Country"
                />
              </div>
            </div>
          </div>

          {/* Brand Colors & Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Brand Colors */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-violet-600" />
                Brand Colors
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="h-12 w-12 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all font-mono text-sm"
                      placeholder="#7CB342"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Secondary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="h-12 w-12 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all font-mono text-sm"
                      placeholder="#2E7D32"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <DocumentIcon className="h-5 w-5 mr-2 text-violet-600" />
                Company Description
              </h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-all resize-none"
                placeholder="Brief description of your company, mission, and values..."
              />
              <p className="mt-2 text-xs text-gray-500">Maximum 500 characters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100 shadow-sm">
        <div className="flex items-start">
          <div className="p-2 bg-violet-100 rounded-xl mr-4">
            <SparklesIcon className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-violet-900 mb-3">Configuration Tips</h4>
            <ul className="text-sm text-violet-700 space-y-2">
              <li className="flex items-start">
                <span className="text-violet-400 mr-2">•</span>
                <span>Upload your company logo for a personalized experience across all dashboards</span>
              </li>
              <li className="flex items-start">
                <span className="text-violet-400 mr-2">•</span>
                <span>Configure module-specific currency and unit settings for accurate data display</span>
              </li>
              <li className="flex items-start">
                <span className="text-violet-400 mr-2">•</span>
                <span>Set your brand colors to customize the visual appearance of your dashboards</span>
              </li>
              <li className="flex items-start">
                <span className="text-violet-400 mr-2">•</span>
                <span>All changes are saved automatically when you click "Save Changes"</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}