import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

console.log('Cashflow Service API URL:', API_BASE_URL)

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

export const cashflowService = {
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/cashflow/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  uploadExcel: (formData: FormData) => {
    return api.post('/cashflow/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  getDashboard: () => api.get('/cashflow/dashboard'),
  
  getMetrics: () => api.get('/cashflow/metrics'),
  
  getRunwayAnalysis: () => api.get('/cashflow/analysis/runway'),
  
  getBurnRateAnalysis: () => api.get('/cashflow/analysis/burn-rate'),
  
  getScenarioAnalysis: (scenarios: any) => api.post('/cashflow/analysis/scenario', scenarios),
  
  getWaterfallData: (period?: number) => api.get('/cashflow/analysis/waterfall', { params: { period } }),
  
  getOperationalData: () => api.get('/cashflow/operational'),
  
  getBankingData: () => api.get('/cashflow/banking'),
  
  getTaxesData: () => api.get('/cashflow/taxes'),
  
  getInvestmentsData: () => api.get('/cashflow/investments'),
}