import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { PnLDashboardPage } from './pages/PnLDashboardPage'
import { ConfigurationPageV2 } from './pages/ConfigurationPageV2'
import { AdminPage } from './pages/AdminPage'
import { TermsPage } from './pages/TermsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { CookiesPage } from './pages/CookiesPage'
import { DebugPage } from './pages/DebugPage'
import { ScreenshotPage } from './pages/ScreenshotPage'
import { ScreenshotInstructions } from './pages/ScreenshotInstructions'
import ScreenshotGallery from './pages/ScreenshotGallery'
import { RequestLicensePage } from './pages/RequestLicensePage'
import { AnalysisPage } from './pages/AnalysisPage'
import { AnalysisPageTest } from './pages/AnalysisPageTest'
import { AnalysisPageFixed } from './pages/AnalysisPageFixed'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/request-license" element={<RequestLicensePage />} />
        <Route path="/test" element={<div style={{padding: '20px', fontSize: '24px', color: 'green'}}>React App is Working! ✅</div>} />
        <Route path="/home" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/cashflow" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/demo/cashflow" element={
          <Layout>
            <DashboardPage />
          </Layout>
        } />
        <Route path="/pnl" element={
          <ProtectedRoute>
            <Layout>
              <PnLDashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/demo/pnl" element={
          <Layout>
            <PnLDashboardPage />
          </Layout>
        } />
        <Route path="/configuration" element={
          <ProtectedRoute>
            <Layout>
              <ConfigurationPageV2 />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/debug" element={
          <ProtectedRoute>
            <DebugPage />
          </ProtectedRoute>
        } />
        <Route path="/screenshot" element={
          <ProtectedRoute>
            <ScreenshotPage />
          </ProtectedRoute>
        } />
        <Route path="/screenshot-instructions" element={
          <ProtectedRoute>
            <ScreenshotInstructions />
          </ProtectedRoute>
        } />
        <Route path="/screenshot-gallery" element={
          <ProtectedRoute>
            <ScreenshotGallery />
          </ProtectedRoute>
        } />
        <Route path="/analysis" element={
          <ProtectedRoute>
            <Layout>
              <AnalysisPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/demo/analysis" element={
          <Layout>
            <AnalysisPageFixed />
          </Layout>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App