import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const platformAdminService = {
  // Get platform statistics
  getStats: () => api.get('/v2/platform/stats'),

  // Company management
  getCompanies: () => api.get('/v2/platform/companies'),
  
  createCompany: (data: {
    name: string
    website?: string
    email?: string
    industry?: string
    description?: string
    subscriptionTier?: string
    userLimit?: number
    allowedEmailDomains?: string[]
    adminEmail: string
    adminPassword: string
  }) => api.post('/v2/platform/companies', data),
  
  updateCompany: (companyId: string, data: any) => 
    api.put(`/v2/platform/companies/${companyId}`, data),
  
  deleteCompany: (companyId: string) => 
    api.delete(`/v2/platform/companies/${companyId}`),
  
  getCompanyStats: (companyId: string) => 
    api.get(`/v2/platform/companies/${companyId}/stats`),
}