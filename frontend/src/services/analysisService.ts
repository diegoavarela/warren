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

export interface AnalysisQuery {
  query: string
  context?: string
  includeCharts?: boolean
}

export interface ChartSpecification {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'waterfall' | 'combo'
  title: string
  description: string
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      type?: string
      borderColor?: string
      backgroundColor?: string
      yAxisID?: string
    }[]
  }
  options?: any
}

export interface TableSpecification {
  title: string
  headers: string[]
  rows: (string | number)[][]
  summary?: string
}

export interface AnalysisResponse {
  type: 'text' | 'chart' | 'table' | 'mixed'
  textResponse?: string
  charts?: ChartSpecification[]
  tables?: TableSpecification[]
  metadata: {
    confidence: 'high' | 'medium' | 'low'
    dataSources: string[]
    limitations?: string[]
    dataPoints?: number
  }
  error?: string
}

export interface DataSummary {
  pnl: {
    hasData: boolean
    monthsAvailable: number
    dateRange: { start: string; end: string } | null
    metrics: {
      revenue: boolean
      costs: boolean
      margins: boolean
      personnelCosts: boolean
      ebitda: boolean
    }
    lastUpload: Date | null
  }
  cashflow: {
    hasData: boolean
    monthsAvailable: number
    dateRange: { start: string; end: string } | null
    metrics: {
      cashPosition: boolean
      bankBalances: boolean
      investments: boolean
      inflows: boolean
      outflows: boolean
    }
    lastUpload: Date | null
  }
}

export const analysisService = {
  // Process an AI analysis query
  analyzeQuery: async (query: AnalysisQuery): Promise<AnalysisResponse> => {
    const response = await api.post('/analysis/query', query)
    return response.data.data
  },

  // Get summary of available data
  getDataSummary: async (): Promise<DataSummary> => {
    const response = await api.get('/analysis/data-summary')
    return response.data.data
  },

  // Get suggested queries based on available data
  getSuggestedQueries: async (): Promise<{ suggestions: string[]; totalSuggestions: number }> => {
    const response = await api.get('/analysis/suggestions')
    return response.data.data
  },

  // Check if specific data is available
  checkDataAvailability: async (requiredMetrics: string[]): Promise<{
    available: string[]
    missing: string[]
    isComplete: boolean
  }> => {
    const response = await api.post('/analysis/check-availability', { requiredMetrics })
    return response.data.data
  },

  // Get file upload history
  getUploadHistory: async (): Promise<{
    id: number
    fileType: 'cashflow' | 'pnl'
    filename: string
    uploadDate: string
    status: string
    isValid: boolean
    monthsAvailable: number
    periodStart: string | null
    periodEnd: string | null
  }[]> => {
    const response = await api.get('/analysis/uploads')
    return response.data.data
  }
}