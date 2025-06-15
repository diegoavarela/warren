import React, { useState, useEffect, useRef } from 'react'
import {
  CogIcon,
  BuildingOfficeIcon,
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  PhotoIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { configurationService, CompanyConfig, StructureDetectionResult } from '../services/configurationService'
import { Currency, Unit, CURRENCIES, UNITS } from '../interfaces/currency'


export const ConfigurationPage: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyConfig[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompanyConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showStructureMapping, setShowStructureMapping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Form states
  const [editingCompany, setEditingCompany] = useState<CompanyConfig | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyCurrency, setNewCompanyCurrency] = useState<Currency>('ARS')
  const [newCompanyScale, setNewCompanyScale] = useState<Unit>('thousands')
  
  // Enhanced form fields
  const [companyForm, setCompanyForm] = useState({
    name: '',
    currency: 'ARS',
    scale: 'thousands',
    website: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
    description: '',
    primaryColor: '#7CB342',
    secondaryColor: '#2E7D32',
    logo: '',
    // Currency settings
    defaultCurrency: 'ARS' as Currency,
    defaultUnit: 'thousands' as Unit,
    enableCurrencyConversion: true,
    showCurrencySelector: true
  })
  
  // File upload for structure detection
  const [structureFile, setStructureFile] = useState<File | null>(null)
  const [detectedStructure, setDetectedStructure] = useState<StructureDetectionResult | null>(null)
  const [mappingStep, setMappingStep] = useState<'upload' | 'detect' | 'configure' | 'save'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await configurationService.getCompanies()
      setCompanies(response.data)
      if (response.data.length > 0) {
        const activeCompany = response.data.find(c => c.isActive) || response.data[0]
        setSelectedCompany(activeCompany)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load company configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return

    try {
      const response = await configurationService.addCompany({
        name: newCompanyName.trim(),
        currency: newCompanyCurrency,
        scale: newCompanyScale
      })
      
      setCompanies([...companies, response.data])
      setNewCompanyName('')
      setShowAddForm(false)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add company')
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company configuration?')) {
      try {
        await configurationService.deleteCompany(companyId)
        setCompanies(companies.filter(c => c.id !== companyId))
        if (selectedCompany?.id === companyId) {
          setSelectedCompany(companies.find(c => c.id !== companyId) || null)
        }
        setError('')
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete company')
      }
    }
  }

  const handleSetActiveCompany = async (companyId: string) => {
    try {
      await configurationService.setActiveCompany(companyId)
      setCompanies(companies.map(c => ({
        ...c,
        isActive: c.id === companyId
      })))
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set active company')
    }
  }

  const handleEditCompany = (company: CompanyConfig) => {
    setEditingCompany(company)
    setCompanyForm({
      name: company.name || '',
      currency: company.currency || 'ARS',
      scale: company.scale || 'thousands',
      website: company.website || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      industry: company.industry || '',
      description: company.description || '',
      primaryColor: company.primaryColor || '#7CB342',
      secondaryColor: company.secondaryColor || '#2E7D32',
      logo: company.logo || '',
      // Currency settings
      defaultCurrency: company.defaultCurrency || company.currency as Currency || 'ARS',
      defaultUnit: company.defaultUnit || company.scale as Unit || 'thousands',
      enableCurrencyConversion: company.currencySettings?.enableCurrencyConversion ?? true,
      showCurrencySelector: company.currencySettings?.showCurrencySelector ?? true
    })
    setShowEditForm(true)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setCompanyForm(prev => ({ ...prev, logo: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveCompanyDetails = async () => {
    if (!editingCompany) return

    try {
      setLoading(true)
      const updateData = {
        ...companyForm,
        currencySettings: {
          defaultCurrency: companyForm.defaultCurrency,
          defaultUnit: companyForm.defaultUnit,
          enableCurrencyConversion: companyForm.enableCurrencyConversion,
          showCurrencySelector: companyForm.showCurrencySelector
        }
      }
      const response = await configurationService.updateCompany(editingCompany.id, updateData)
      
      setCompanies(companies.map(c => c.id === editingCompany.id ? response.data : c))
      if (selectedCompany?.id === editingCompany.id) {
        setSelectedCompany(response.data)
      }
      
      setShowEditForm(false)
      setEditingCompany(null)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update company')
    } finally {
      setLoading(false)
    }
  }


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStructureFile(e.target.files[0])
      setMappingStep('detect')
    }
  }

  const analyzeExcelStructure = async () => {
    if (!structureFile) return

    setLoading(true)
    try {
      const response = await configurationService.analyzeExcelStructure(structureFile)
      setDetectedStructure(response.data)
      setMappingStep('configure')
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze Excel structure')
    } finally {
      setLoading(false)
    }
  }

  const saveExcelStructure = async () => {
    if (!selectedCompany || !detectedStructure) return

    setLoading(true)
    try {
      await configurationService.saveExcelStructure(selectedCompany.id, detectedStructure.suggestedMapping)
      
      // Update the selected company with the new structure
      const updatedCompany = {
        ...selectedCompany,
        excelStructure: detectedStructure.suggestedMapping,
        lastUpdated: new Date().toISOString().split('T')[0]
      }
      setSelectedCompany(updatedCompany)
      setCompanies(companies.map(c => c.id === selectedCompany.id ? updatedCompany : c))
      
      // Close the mapping modal
      setShowStructureMapping(false)
      setMappingStep('upload')
      setStructureFile(null)
      setDetectedStructure(null)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save Excel structure')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CogIcon className="h-8 w-8 mr-3 text-blue-600" />
          Configuration Center
        </h1>
        <p className="text-gray-600 mt-2">Manage company configurations and Excel file structures</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
          <XCircleIcon className="h-6 w-6 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Add Company Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Company</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newCompanyCurrency}
                  onChange={(e) => setNewCompanyCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ARS">Argentine Peso (ARS)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="BRL">Brazilian Real (BRL)</option>
                </select>
                <select
                  value={newCompanyScale}
                  onChange={(e) => setNewCompanyScale(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="units">Units</option>
                  <option value="thousands">Thousands</option>
                  <option value="millions">Millions</option>
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddCompany}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Company List */}
          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCompany?.id === company.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCompany(company)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-500">
                        {company.currency} ({company.scale})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {company.isActive && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" title="Active Company" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditCompany(company)
                      }}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Edit Company"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCompany(company.id)
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete Company"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCompany ? (
            <>
              {/* Company Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    {selectedCompany.logo && (
                      <img 
                        src={selectedCompany.logo} 
                        alt={`${selectedCompany.name} logo`}
                        className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedCompany.name}</h2>
                      {selectedCompany.industry && (
                        <p className="text-sm text-gray-600">{selectedCompany.industry}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!selectedCompany.isActive && (
                      <button
                        onClick={() => handleSetActiveCompany(selectedCompany.id)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      onClick={() => setShowStructureMapping(true)}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5"
                    >
                      Configure Excel Structure
                    </button>
                  </div>
                </div>

                {/* Company Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Default Currency</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {CURRENCIES[selectedCompany.defaultCurrency as Currency]?.name || selectedCompany.currency}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Default Unit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {UNITS[selectedCompany.defaultUnit as Unit]?.label || selectedCompany.scale}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`text-lg font-semibold ${selectedCompany.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                      {selectedCompany.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                {/* Currency Settings */}
                {selectedCompany.currencySettings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Currency Conversion</p>
                      <p className={`text-lg font-semibold ${selectedCompany.currencySettings.enableCurrencyConversion ? 'text-green-600' : 'text-gray-500'}`}>
                        {selectedCompany.currencySettings.enableCurrencyConversion ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Currency Selector</p>
                      <p className={`text-lg font-semibold ${selectedCompany.currencySettings.showCurrencySelector ? 'text-green-600' : 'text-gray-500'}`}>
                        {selectedCompany.currencySettings.showCurrencySelector ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {(selectedCompany.website || selectedCompany.email || selectedCompany.phone || selectedCompany.address) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCompany.website && (
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <GlobeAltIcon className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600">Website</p>
                            <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:text-blue-800 font-medium">
                              {selectedCompany.website}
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedCompany.email && (
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                          <EnvelopeIcon className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <a href={`mailto:${selectedCompany.email}`} className="text-green-600 hover:text-green-800 font-medium">
                              {selectedCompany.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedCompany.phone && (
                        <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                          <PhoneIcon className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600">Phone</p>
                            <a href={`tel:${selectedCompany.phone}`} className="text-purple-600 hover:text-purple-800 font-medium">
                              {selectedCompany.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedCompany.address && (
                        <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                          <MapPinIcon className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-sm text-gray-600">Address</p>
                            <p className="text-orange-600 font-medium">{selectedCompany.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Brand Colors */}
                {(selectedCompany.primaryColor || selectedCompany.secondaryColor) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Brand Colors</h3>
                    <div className="flex space-x-4">
                      {selectedCompany.primaryColor && (
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-8 h-8 rounded-lg border border-gray-300"
                            style={{ backgroundColor: selectedCompany.primaryColor }}
                          ></div>
                          <div>
                            <p className="text-xs text-gray-600">Primary</p>
                            <p className="text-sm font-mono">{selectedCompany.primaryColor}</p>
                          </div>
                        </div>
                      )}
                      {selectedCompany.secondaryColor && (
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-8 h-8 rounded-lg border border-gray-300"
                            style={{ backgroundColor: selectedCompany.secondaryColor }}
                          ></div>
                          <div>
                            <p className="text-xs text-gray-600">Secondary</p>
                            <p className="text-sm font-mono">{selectedCompany.secondaryColor}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedCompany.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Description</h3>
                    <p className="text-gray-600 p-4 bg-gray-50 rounded-lg">{selectedCompany.description}</p>
                  </div>
                )}

                {selectedCompany.excelStructure && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Excel Configuration</h3>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Excel structure configured for worksheet: {selectedCompany.excelStructure.worksheetName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Excel Structure Mapping Modal */}
              {showStructureMapping && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Configure Excel Structure</h2>
                      <p className="text-gray-600 mt-1">Upload a sample Excel file to automatically detect structure</p>
                    </div>

                    <div className="p-6">
                      {mappingStep === 'upload' && (
                        <div className="text-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <ArrowUpTrayIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Sample Excel File</h3>
                          <p className="text-gray-600 mb-6">Upload a representative Excel file so we can detect the structure</p>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Select File
                          </button>
                        </div>
                      )}

                      {mappingStep === 'detect' && structureFile && (
                        <div className="text-center">
                          <DocumentIcon className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing: {structureFile.name}</h3>
                          <p className="text-gray-600 mb-6">We'll analyze the structure and suggest mappings</p>
                          <button
                            onClick={analyzeExcelStructure}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Analyze Structure
                          </button>
                        </div>
                      )}

                      {mappingStep === 'configure' && detectedStructure && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">Review Detected Structure</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-medium bg-gradient-to-r from-gray-700 to-purple-700 bg-clip-text text-transparent mb-3">Worksheets Found</h4>
                              <div className="space-y-2">
                                {detectedStructure.worksheets.map((sheet: string, index: number) => (
                                  <label key={index} className="flex items-center">
                                    <input type="radio" name="worksheet" value={sheet} className="mr-2" />
                                    <span className="text-sm text-gray-600">{sheet}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium bg-gradient-to-r from-gray-700 to-purple-700 bg-clip-text text-transparent mb-3">Detected Metrics</h4>
                              <div className="space-y-2">
                                {Object.entries(detectedStructure.potentialMetrics).map(([row, description]) => (
                                  <div key={row} className="flex items-center justify-between p-2 bg-gradient-to-br from-gray-50/50 to-purple-50/30 rounded-xl border border-gray-100">
                                    <span className="text-sm text-gray-600">{row}</span>
                                    <span className="text-xs text-gray-500">{description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <button
                              onClick={saveExcelStructure}
                              disabled={loading}
                              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button
                              onClick={() => setMappingStep('upload')}
                              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                              Start Over
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={() => {
                          setShowStructureMapping(false)
                          setMappingStep('upload')
                          setStructureFile(null)
                          setDetectedStructure(null)
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Company Edit Modal */}
              {showEditForm && editingCompany && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Edit Company Details</h2>
                      <p className="text-gray-600 mt-1">Update company information and branding</p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Logo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                        <div className="flex items-center space-x-4">
                          {companyForm.logo && (
                            <img 
                              src={companyForm.logo} 
                              alt="Company logo preview"
                              className="h-16 w-16 object-cover rounded-lg border border-gray-300"
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
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                          >
                            <PhotoIcon className="h-4 w-4" />
                            <span>Upload Logo</span>
                          </label>
                        </div>
                      </div>

                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                          <input
                            type="text"
                            value={companyForm.name}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                          <input
                            type="text"
                            value={companyForm.industry}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Technology, Finance, Manufacturing"
                          />
                        </div>
                      </div>

                      {/* Financial Settings */}
                      <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center">
                          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" />
                          Financial Display Settings
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                            <select
                              value={companyForm.defaultCurrency}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, defaultCurrency: e.target.value as Currency }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {Object.entries(CURRENCIES).map(([code, info]) => (
                                <option key={code} value={code}>
                                  {info.name} ({code})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit</label>
                            <select
                              value={companyForm.defaultUnit}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, defaultUnit: e.target.value as Unit }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {Object.entries(UNITS).map(([unit, info]) => (
                                <option key={unit} value={unit}>
                                  {info.label} {info.suffix && `(${info.suffix})`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={companyForm.enableCurrencyConversion}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, enableCurrencyConversion: e.target.checked }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Enable currency conversion in dashboards
                            </span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={companyForm.showCurrencySelector}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, showCurrencySelector: e.target.checked }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Show currency selector in dashboards
                            </span>
                          </label>
                        </div>

                        {/* Legacy settings for compatibility */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legacy Currency</label>
                            <select
                              value={companyForm.currency}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, currency: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="ARS">Argentine Peso (ARS)</option>
                              <option value="USD">US Dollar (USD)</option>
                              <option value="EUR">Euro (EUR)</option>
                              <option value="BRL">Brazilian Real (BRL)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legacy Scale</label>
                            <select
                              value={companyForm.scale}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, scale: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="units">Units</option>
                              <option value="thousands">Thousands</option>
                              <option value="millions">Millions</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                          <input
                            type="url"
                            value={companyForm.website}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="https://company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="contact@company.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input
                            type="text"
                            value={companyForm.address}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="123 Business St, City, Country"
                          />
                        </div>
                      </div>

                      {/* Brand Colors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Brand Color</label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={companyForm.primaryColor}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={companyForm.primaryColor}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              placeholder="#7CB342"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Brand Color</label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={companyForm.secondaryColor}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={companyForm.secondaryColor}
                              onChange={(e) => setCompanyForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              placeholder="#2E7D32"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={companyForm.description}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Brief description of the company..."
                        />
                      </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowEditForm(false)
                          setEditingCompany(null)
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCompanyDetails}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <BuildingOfficeIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">No Company Selected</h2>
              <p className="text-gray-600">Select a company from the list to view and edit its configuration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}