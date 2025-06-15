import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/authService'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
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
          setUser(response.data.user)
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
    localStorage.setItem('token', response.data.token)
    setUser(response.data.user)
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
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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