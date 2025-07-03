"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading } = useAuth();
  const { locale } = useLocale();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(locale?.startsWith('es') ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError(locale?.startsWith('es') ? 'La contraseña debe tener al menos 8 caracteres' : 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const result = await signup({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      organizationName: formData.organizationName,
      locale
    });
    
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || (locale?.startsWith('es') ? 'Error al crear cuenta' : 'Error creating account'));
    }
    
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Image/Pattern */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-green-600 via-blue-700 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        <div className="relative flex-1 flex items-center justify-center p-12">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold text-white mb-6">
              {locale?.startsWith('es') 
                ? 'Únete a Warren'
                : 'Join Warren'}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {locale?.startsWith('es')
                ? 'La plataforma líder en análisis financiero automatizado para empresas latinoamericanas.'
                : 'The leading automated financial analysis platform for Latin American companies.'}
            </p>
            <div className="space-y-4">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white">
                  {locale?.startsWith('es') ? 'Procesamiento automático con IA' : 'AI-powered automatic processing'}
                </span>
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white">
                  {locale?.startsWith('es') ? 'Seguridad de nivel empresarial' : 'Enterprise-level security'}
                </span>
              </div>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white">
                  {locale?.startsWith('es') ? 'Soporte 24/7 en español' : '24/7 support in Spanish'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Warren</h1>
                <p className="text-xs text-gray-500">Financial Parser</p>
              </div>
            </Link>
          </div>

          {/* Welcome message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              {locale?.startsWith('es') ? 'Crear cuenta nueva' : 'Create new account'}
            </h2>
            <p className="mt-2 text-center text-gray-600">
              {locale?.startsWith('es') 
                ? 'Comienza tu prueba gratuita de 30 días' 
                : 'Start your 30-day free trial'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Nombre' : 'First Name'}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={locale?.startsWith('es') ? 'Juan' : 'John'}
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Apellido' : 'Last Name'}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={locale?.startsWith('es') ? 'Pérez' : 'Doe'}
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {locale?.startsWith('es') ? 'Correo electrónico' : 'Email address'}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder={locale?.startsWith('es') ? 'tu@empresa.com' : 'you@company.com'}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                {locale?.startsWith('es') ? 'Nombre de la empresa' : 'Company name'}
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder={locale?.startsWith('es') ? 'Mi Empresa S.A.' : 'My Company Inc.'}
                value={formData.organizationName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {locale?.startsWith('es') ? 'Contraseña' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {locale?.startsWith('es') ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {locale?.startsWith('es') ? 'Confirmar contraseña' : 'Confirm password'}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Card variant="flat" className="bg-red-50 border-red-200">
                <CardBody className="py-3">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </CardBody>
              </Card>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                {loading 
                  ? (locale?.startsWith('es') ? 'Creando cuenta...' : 'Creating account...')
                  : (locale?.startsWith('es') ? 'Crear Cuenta' : 'Create Account')
                }
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {locale?.startsWith('es') ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition">
                  {locale?.startsWith('es') ? 'Iniciar sesión' : 'Sign in'}
                </Link>
              </p>
            </div>

            {/* Terms and conditions */}
            <p className="text-xs text-gray-500 text-center mt-4">
              {locale?.startsWith('es') 
                ? 'Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.'
                : 'By creating an account, you agree to our terms of service and privacy policy.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}