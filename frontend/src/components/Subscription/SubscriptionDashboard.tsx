import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCardIcon,
  ChartBarIcon,
  UserGroupIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { subscriptionService, Subscription, UsageData } from '../../services/subscriptionService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export const SubscriptionDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [sub, usageData] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getUsage()
      ]);
      setSubscription(sub);
      setUsage(usageData);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(t('subscription.error.loading', 'Failed to load subscription data'));
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { portalUrl } = await subscriptionService.createPortalSession();
      window.location.href = portalUrl;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError(t('subscription.error.portal', 'Failed to open billing portal'));
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleCancel = async () => {
    if (!window.confirm(t('subscription.cancel.confirm', 'Are you sure you want to cancel your subscription?'))) {
      return;
    }

    try {
      setCanceling(true);
      await subscriptionService.cancelSubscription();
      await loadSubscriptionData();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(t('subscription.error.cancel', 'Failed to cancel subscription'));
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isPaid = subscription && subscription.plan.priceCents > 0;
  const isFreemium = !subscription || subscription.plan.name === 'freemium';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('subscription.title', 'Subscription & Usage')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('subscription.subtitle', 'Manage your subscription and track usage')}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('subscription.current_plan', 'Current Plan')}
            </h2>
            {isPaid && (
              <button
                onClick={handleManageBilling}
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('subscription.manage_billing', 'Manage Billing')}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {subscription?.plan.displayName || t('subscription.freemium', 'Free')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {isPaid
                  ? `$${(subscription!.plan.priceCents / 100).toFixed(0)}/${t('subscription.month', 'month')}`
                  : t('subscription.free_forever', 'Free forever')
                }
              </p>
              {subscription?.cancelAtPeriodEnd && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {t('subscription.canceling_on', 'Canceling on {{date}}', {
                    date: format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')
                  })}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              {isFreemium && (
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('subscription.upgrade', 'Upgrade')}
                </button>
              )}
              {isPaid && !subscription?.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {canceling ? t('subscription.canceling', 'Canceling...') : t('subscription.cancel', 'Cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* AI Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <SparklesIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            {usage?.ai.percentUsed! >= 80 && (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('subscription.ai_usage', 'AI Usage')}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(usage?.ai.totalCostCents || 0) / 100}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('subscription.of_limit', 'of {{limit}}', {
              limit: `$${(usage?.ai.limitCents || 0) / 100}`
            })}
          </p>
          <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                usage?.ai.percentUsed! >= 90
                  ? 'bg-red-600'
                  : usage?.ai.percentUsed! >= 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usage?.ai.percentUsed || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Views (Freemium) */}
        {isFreemium && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <EyeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              {usage?.views.remainingViews! <= 2 && (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('subscription.views_remaining', 'Views Remaining')}
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {usage?.views.remainingViews || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('subscription.this_month', 'this month')}
            </p>
          </div>
        )}

        {/* Storage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <ChartBarIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('subscription.storage', 'Storage')}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {((usage?.storage.usedBytes || 0) / 1024 / 1024).toFixed(1)} MB
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {usage?.storage.limitBytes === -1
              ? t('subscription.unlimited', 'Unlimited')
              : t('subscription.of_limit', 'of {{limit}}', {
                  limit: `${((usage?.storage.limitBytes || 0) / 1024 / 1024 / 1024).toFixed(0)} GB`
                })
            }
          </p>
        </div>

        {/* Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <UserGroupIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('subscription.team_members', 'Team Members')}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {usage?.users.count || 1}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {usage?.users.limit === -1
              ? t('subscription.unlimited', 'Unlimited')
              : t('subscription.of_limit', 'of {{limit}}', { limit: usage?.users.limit || 1 })
            }
          </p>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.features', 'Features')}
          </h2>
          
          <div className="space-y-3">
            {Object.entries(subscription?.plan.features || {}).map(([feature, enabled]) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  {t(`subscription.feature.${feature}`, feature)}
                </span>
                {enabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>

          {isFreemium && (
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <div className="flex items-start">
                <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-indigo-900 dark:text-indigo-300">
                    {t('subscription.upgrade_cta', 'Upgrade to Professional to unlock all features and remove limitations')}
                  </p>
                  <button
                    onClick={handleUpgrade}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {t('subscription.view_plans', 'View Plans →')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};