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

export const authService = {
  // Multi-tenant authentication
  login: (email: string, password: string) =>
    api.post('/v2/auth/login', { email, password }),
  
  logout: () => api.post('/v2/auth/logout'),
  
  getProfile: () => api.get('/v2/auth/profile'),

  // 2FA endpoints
  setup2FA: () => api.post('/v2/auth/2fa/setup'),
  
  verify2FA: (code: string) => api.post('/v2/auth/2fa/verify', { code }),
  
  disable2FA: (code: string) => api.post('/v2/auth/2fa/disable', { code }),

  // Legacy endpoints (for backward compatibility)
  legacyLogin: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  legacyLogout: () => api.post('/auth/logout'),
  
  legacyGetProfile: () => api.get('/auth/me'),
}