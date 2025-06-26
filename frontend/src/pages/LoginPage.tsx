import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { 
  EyeIcon, 
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { VortexLogo } from '../components/VortexLogo'

export function LoginPage() {
  const { user, login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  if (user) {
    return <Navigate to="/home" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    t('auth.features.cashflow'),
    t('auth.features.excelImport'),
    t('auth.features.dashboards'),
    t('auth.features.scenarioPlanning')
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Back to home */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('auth.backToHome')}
          </button>

          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-lg opacity-25"></div>
                <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 font-mono text-lg leading-tight">
                  <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                  <div className="text-xs">│W││A││R││R││E││N│</div>
                  <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
                </div>
              </div>
              <div className="ml-3">
                <VortexLogo variant="iso" size="md" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
            </h2>
            <p className="text-gray-600">
              {isSignUp 
                ? t('auth.createAccountSubtitle')
                : t('auth.signInSubtitle')
              }
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">{error}</div>
              </div>
            )}

            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    {t('auth.rememberMe')}
                  </label>
                </div>

                {!isSignUp && (
                  <button
                    type="button"
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isSignUp ? t('auth.creatingAccount') : t('auth.signingIn')}
                </div>
              ) : (
                <>
                  {isSignUp ? t('auth.createAccountButton') : t('auth.signIn')}
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </>
              )}
            </button>


            {/* Toggle Sign In/Sign Up */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                className="ml-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                {isSignUp ? t('auth.signIn') : t('auth.createAccountButton')}
              </button>
            </div>

            {/* Demo Credentials for Sign In */}
            {!isSignUp && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <SparklesIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-blue-900">{t('auth.demoAccount')}</p>
                    <div className="mt-2 text-sm text-blue-700 space-y-2">
                      <div>
                        <p className="font-semibold text-blue-800 mb-1">Company Admin:</p>
                        <p><span className="font-medium">{t('auth.email')}:</span> admin@vort-ex.com</p>
                        <p><span className="font-medium">{t('auth.password')}:</span> vortex123</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-800 mb-1">Platform Admin:</p>
                        <p><span className="font-medium">{t('auth.email')}:</span> platform@warren.ai</p>
                        <p><span className="font-medium">{t('auth.password')}:</span> Admin123!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6">
              {t('auth.transformTitle')}
            </h2>
            <p className="text-xl text-violet-100 mb-8">
              {t('auth.transformSubtitle')}
            </p>
            
            {/* Feature List */}
            <ul className="space-y-4 mb-12">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <CheckIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-violet-100">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Demo Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <p className="text-violet-100 mb-4">
                <strong>{t('auth.tryDemo')}:</strong> {t('auth.demoDescription')}
              </p>
              <div className="flex items-center text-violet-200">
                <SparklesIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">{t('auth.demoCredentialsProvided')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}