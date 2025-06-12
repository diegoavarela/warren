import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface CompanyConfig {
  id: string
  name: string
  currency: string
  scale: string
  isActive: boolean
  createdAt: string
  lastUpdated?: string
  excelStructure?: ExcelStructure
  // Enhanced company information
  logo?: string // Base64 encoded logo
  website?: string
  address?: string
  phone?: string
  email?: string
  industry?: string
  description?: string
  primaryColor?: string
  secondaryColor?: string
}

export interface ExcelStructure {
  worksheetName: string
  headerRow: number
  dataStartRow: number
  monthColumns: { [key: string]: number }
  metricRows: { [key: string]: number }
  customMappings?: { [key: string]: any }
}

export interface StructureDetectionResult {
  worksheets: string[]
  headers: string[]
  potentialMetrics: { [key: string]: string }
  suggestedMapping: ExcelStructure
  confidence: number
}

export const configurationService = {
  // Company management
  async getCompanies(): Promise<{ data: CompanyConfig[] }> {
    const response = await api.get('/configuration/companies')
    return response.data
  },

  async getCompany(id: string): Promise<{ data: CompanyConfig }> {
    const response = await api.get(`/configuration/companies/${id}`)
    return response.data
  },

  async getActiveCompany(): Promise<{ data: CompanyConfig }> {
    const response = await api.get('/configuration/companies/active')
    return response.data
  },

  async addCompany(company: {
    name: string
    currency: string
    scale: string
  }): Promise<{ data: CompanyConfig }> {
    const response = await api.post('/configuration/companies', company)
    return response.data
  },

  async updateCompany(id: string, updates: Partial<CompanyConfig>): Promise<{ data: CompanyConfig }> {
    const response = await api.put(`/configuration/companies/${id}`, updates)
    return response.data
  },

  async deleteCompany(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/configuration/companies/${id}`)
    return response.data
  },

  async setActiveCompany(id: string): Promise<{ success: boolean }> {
    const response = await api.post(`/configuration/companies/${id}/activate`)
    return response.data
  },

  // Excel structure analysis
  async analyzeExcelStructure(file: File): Promise<{ data: StructureDetectionResult }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/configuration/analyze-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async saveExcelStructure(companyId: string, structure: ExcelStructure): Promise<{ success: boolean }> {
    const response = await api.post(`/configuration/companies/${companyId}/excel-structure`, {
      structure
    })
    return response.data
  }
}