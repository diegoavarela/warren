import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UploadPage } from './pages/UploadPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <Layout>
              <UploadPage />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App