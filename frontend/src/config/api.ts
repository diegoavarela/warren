// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`
}