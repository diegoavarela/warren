import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/authService'

interface User {
  id: string
  email: string
  role: 'platform_admin' | 'company_admin' | 'company_employee'
  companyId?: string
  companyName?: string
  subscriptionTier?: string
  is2FAEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
  setup2FA: () => Promise<any>
  verify2FA: (code: string) => Promise<void>
  disable2FA: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth checks if in demo mode
    const isDemoMode = window.location.search.includes('demo=true')
    const isScreenshotMode = window.location.search.includes('screenshot=true') || 
                            sessionStorage.getItem('screenshotMode') === 'true'
    
    if (isDemoMode || isScreenshotMode) {
      setLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (token) {
      authService.getProfile()
        .then(response => {
          if (response.data.success) {
            setUser(response.data.user)
          } else {
            localStorage.removeItem('token')
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password)
    
    if (response.data.success) {
      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
    } else {
      throw new Error(response.data.error || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      // Call the logout endpoint to invalidate the session on the backend
      await authService.logout()
    } catch (error) {
      // Even if the API call fails, we still want to clear local state
      console.error('Logout API call failed:', error)
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Clear any cached data
      localStorage.removeItem('cashflow_data')
      localStorage.removeItem('pnl_data')
      localStorage.removeItem('uploaded_file')
      
      // Clear session storage as well
      sessionStorage.clear()
      
      setUser(null)
    }
  }

  const setup2FA = async () => {
    const response = await authService.setup2FA()
    return response.data
  }

  const verify2FA = async (code: string) => {
    const response = await authService.verify2FA(code)
    if (response.data.success) {
      // Update user state to reflect 2FA is now enabled
      setUser(prev => prev ? { ...prev, is2FAEnabled: true } : null)
    } else {
      throw new Error(response.data.error || '2FA verification failed')
    }
  }

  const disable2FA = async (code: string) => {
    const response = await authService.disable2FA(code)
    if (response.data.success) {
      // Update user state to reflect 2FA is now disabled
      setUser(prev => prev ? { ...prev, is2FAEnabled: false } : null)
    } else {
      throw new Error(response.data.error || '2FA disable failed')
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setup2FA, verify2FA, disable2FA }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}