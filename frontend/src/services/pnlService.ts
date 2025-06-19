import axios from 'axios'

import { API_BASE_URL } from '../config/api'

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

export const pnlService = {
  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return api.post('/pnl/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  getDashboard: () => api.get('/pnl/dashboard'),
  
  getMetrics: () => api.get('/pnl/metrics'),
  
  getLineItems: () => api.get('/pnl/line-items'),
  
  clearData: () => api.delete('/pnl/clear'),
}