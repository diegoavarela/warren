import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Check screenshot mode or demo mode first, before any auth checks
  const isScreenshotMode = window.location.search.includes('screenshot=true') || 
                          sessionStorage.getItem('screenshotMode') === 'true'
  const isDemoMode = window.location.search.includes('demo=true') || 
                     window.location.pathname.startsWith('/demo')

  // Early return for demo/screenshot modes to avoid calling useAuth
  if (isScreenshotMode || isDemoMode) {
    return <>{children}</>
  }

  // Only call useAuth if not in demo/screenshot mode
  return <AuthenticatedRoute>{children}</AuthenticatedRoute>
}

function AuthenticatedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vortex-green"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}