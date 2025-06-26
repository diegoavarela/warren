import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscriptionService';
import { useTranslation } from 'react-i18next';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  description: string;
  features: string[];
  limitations?: string[];
  buttonText: string;
  buttonVariant: 'outline' | 'primary' | 'premium';
  popular?: boolean;
}

export const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const tiers: PricingTier[] = [
    {
      id: 'freemium',
      name: t('pricing.freemium.name', 'Free'),
      price: 0,
      priceDisplay: t('pricing.freemium.price', '$0'),
      description: t('pricing.freemium.description', 'Perfect for trying out Warren'),
      features: [
        t('pricing.freemium.features.dashboard', 'Basic dashboard'),
        t('pricing.freemium.features.excel', '1 Excel file upload'),
        t('pricing.freemium.features.widgets', '3 basic widgets'),
        t('pricing.freemium.features.history', '3 months of history'),
        t('pricing.freemium.features.export', 'PDF export (watermarked)'),
        t('pricing.freemium.features.support', 'Community support')
      ],
      limitations: [
        t('pricing.freemium.limitations.views', '10 dashboard views per month'),
        t('pricing.freemium.limitations.ai', 'No AI analysis'),
        t('pricing.freemium.limitations.users', '1 user only')
      ],
      buttonText: t('pricing.freemium.button', 'Get Started'),
      buttonVariant: 'outline'
    },
    {
      id: 'professional',
      name: t('pricing.professional.name', 'Professional'),
      price: 149,
      priceDisplay: t('pricing.professional.price', '$149'),
      description: t('pricing.professional.description', 'For growing businesses'),
      features: [
        t('pricing.professional.features.dashboard', 'Full dashboard access'),
        t('pricing.professional.features.excel', '10 Excel files'),
        t('pricing.professional.features.widgets', 'All widgets available'),
        t('pricing.professional.features.history', 'Unlimited history'),
        t('pricing.professional.features.export', 'Clean PDF exports'),
        t('pricing.professional.features.currency', 'Multi-currency support'),
        t('pricing.professional.features.ai', '$10 AI credits/month'),
        t('pricing.professional.features.users', 'Up to 5 users'),
        t('pricing.professional.features.support', 'Email support')
      ],
      buttonText: t('pricing.professional.button', 'Start Free Trial'),
      buttonVariant: 'primary',
      popular: true
    },
    {
      id: 'enterprise',
      name: t('pricing.enterprise.name', 'Enterprise'),
      price: 349,
      priceDisplay: t('pricing.enterprise.price', '$349'),
      description: t('pricing.enterprise.description', 'For larger organizations'),
      features: [
        t('pricing.enterprise.features.everything', 'Everything in Professional'),
        t('pricing.enterprise.features.excel', 'Unlimited data sources'),
        t('pricing.enterprise.features.quickbooks', 'QuickBooks integration'),
        t('pricing.enterprise.features.api', 'API access'),
        t('pricing.enterprise.features.ai', '$50 AI credits/month'),
        t('pricing.enterprise.features.users', 'Unlimited users'),
        t('pricing.enterprise.features.domain', 'Custom domain'),
        t('pricing.enterprise.features.whitelabel', 'White label options'),
        t('pricing.enterprise.features.ip', 'IP whitelisting'),
        t('pricing.enterprise.features.support', 'Priority support')
      ],
      buttonText: t('pricing.enterprise.button', 'Contact Sales'),
      buttonVariant: 'premium'
    }
  ];

  const handleSelectPlan = async (tierId: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/pricing', selectedPlan: tierId } });
      return;
    }

    if (tierId === 'enterprise') {
      navigate('/contact-sales');
      return;
    }

    setLoading(tierId);
    setError('');

    try {
      if (tierId === 'freemium') {
        // For freemium, just navigate to dashboard
        navigate('/dashboard');
      } else {
        // Create checkout session for paid plans
        const { checkoutUrl } = await subscriptionService.createCheckoutSession(tierId);
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      console.error('Error selecting plan:', err);
      setError(t('pricing.error', 'Failed to process your request. Please try again.'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('pricing.title', 'Choose Your Plan')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {t('pricing.subtitle', 'Get started with Warren and transform your financial data into actionable insights')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`
                relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8
                ${tier.popular ? 'ring-2 ring-indigo-600 dark:ring-indigo-500' : ''}
              `}
            >
              {tier.popular && (
                <div className="absolute -top-5 left-0 right-0 mx-auto w-fit">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {t('pricing.popular', 'Most Popular')}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {tier.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                    {tier.priceDisplay}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">
                      /{t('pricing.period', 'month')}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
                {tier.limitations?.map((limitation, index) => (
                  <li key={`limit-${index}`} className="flex items-start">
                    <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-500 dark:text-gray-400">
                      {limitation}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(tier.id)}
                disabled={loading === tier.id}
                className={`
                  w-full py-3 px-6 rounded-lg font-medium transition-colors
                  ${tier.buttonVariant === 'outline' 
                    ? 'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : tier.buttonVariant === 'premium'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }
                  ${loading === tier.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loading === tier.id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('pricing.processing', 'Processing...')}
                  </span>
                ) : (
                  tier.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            {t('pricing.faq.title', 'Frequently Asked Questions')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('pricing.faq.trial.question', 'Is there a free trial?')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('pricing.faq.trial.answer', 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('pricing.faq.cancel.question', 'Can I cancel anytime?')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('pricing.faq.cancel.answer', 'Absolutely. You can cancel your subscription at any time from your account settings.')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('pricing.faq.data.question', 'What happens to my data if I downgrade?')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('pricing.faq.data.answer', 'Your data is always safe. If you downgrade, you\'ll have read-only access to data that exceeds your new plan limits.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};