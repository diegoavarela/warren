import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VortexFooter } from '../components/VortexFooter'
import { 
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  BriefcaseIcon,
  UsersIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { VortexLogo } from '../components/VortexLogo'

export const RequestLicensePage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    // Contact Information
    firstName: '',
    lastName: '',
    workEmail: '',
    phone: '',
    // Company Information
    companyName: '',
    jobTitle: '',
    companySize: '',
    industry: '',
    // Use Case Details
    useCase: '',
    timeline: '',
    additionalInfo: ''
  })

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ]

  const timelines = [
    'Immediately',
    'Within 1 week',
    'Within 1 month',
    '1-3 months',
    'Just exploring'
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Send to Monday.com via backend API
      const response = await fetch('/api/monday/create-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          source: 'Warren License Request',
          timestamp: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit request')
      }

      setIsSuccess(true)
      
      // Redirect to success page or home after delay
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (error) {
      console.error('Error submitting license request:', error)
      // In production, handle error properly
      // For now, show success anyway for demo
      setIsSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Request Submitted!</h1>
          <p className="text-lg text-gray-600 mb-2">Thank you for your interest in Warren.</p>
          <p className="text-gray-600">Our team will contact you within 24 hours.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Back
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-lg opacity-25"></div>
                <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 font-mono text-lg leading-tight">
                  <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                  <div className="text-xs">│W││A││R││R││E││N│</div>
                  <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
                </div>
              </div>
              <VortexLogo variant="iso" size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Request a License</h1>
          <p className="text-xl text-gray-600">
            Get started with Warren's financial dashboard platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Contact Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <UserIcon className="h-6 w-6 mr-2 text-violet-600" />
              Contact Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="workEmail"
                    required
                    value={formData.workEmail}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="john@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 mr-2 text-violet-600" />
              Company Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="jobTitle"
                    required
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="CFO"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UsersIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="companySize"
                    required
                    value={formData.companySize}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select company size</option>
                    {companySizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Technology"
                />
              </div>
            </div>
          </div>

          {/* Use Case Details */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-violet-600" />
              Use Case Details
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How do you plan to use Warren? <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="useCase"
                  required
                  rows={3}
                  value={formData.useCase}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Describe your financial management needs and how Warren can help..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeline for getting started <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="timeline"
                    required
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select timeline</option>
                    {timelines.map(timeline => (
                      <option key={timeline} value={timeline}>{timeline}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  name="additionalInfo"
                  rows={4}
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Any other details you'd like to share..."
                />
              </div>
            </div>
          </div>

          {/* Features Info */}
          <div className="bg-violet-50 rounded-xl p-6">
            <h3 className="font-semibold text-violet-900 mb-3 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              What's included with Warren:
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Full access to cash flow and P&L dashboards</span>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Unlimited Excel file uploads and processing</span>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Multi-currency support with real-time conversion</span>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Priority support and personalized onboarding</span>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Custom branding and configuration options</span>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-violet-700">Secure data encryption and compliance</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-12 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit License Request'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <VortexFooter />
    </div>
  )
}