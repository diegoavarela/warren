// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001'

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`
}