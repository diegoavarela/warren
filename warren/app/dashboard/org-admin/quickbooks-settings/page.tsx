"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import {
  ArrowLeftIcon,
  CogIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";
import { FEATURE_KEYS } from '@/lib/constants/features';

interface QuickBooksSettings {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  sandbox: boolean;
}

export default function QuickBooksSettingsPage() {
  const router = useRouter();
  const localeContext = useLocale();
  const locale = localeContext?.locale;
  const { user, organization } = useAuth();
  const { hasFeature } = useFeatures();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<QuickBooksSettings>({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    sandbox: true
  });

  // Check if QuickBooks feature is enabled
  const quickbooksEnabled = hasFeature(FEATURE_KEYS.QUICKBOOKS_INTEGRATION);

  useEffect(() => {
    if (!quickbooksEnabled) {
      router.push('/dashboard/org-admin');
      return;
    }
    fetchSettings();
  }, [quickbooksEnabled, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/organization/quickbooks-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          clientId: data.settings?.clientId || '',
          clientSecret: data.settings?.clientSecret || '',
          redirectUri: data.settings?.redirectUri || `${window.location.origin}/api/quickbooks/callback`,
          sandbox: data.settings?.sandbox !== false // Default to true
        });
      }
    } catch (error) {
      console.error('Error fetching QuickBooks settings:', error);
      toast.error('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.clientId.trim() || !settings.clientSecret.trim()) {
      toast.warning('Client ID and Client Secret are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/organization/quickbooks-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: settings.clientId.trim(),
          clientSecret: settings.clientSecret.trim(),
          redirectUri: settings.redirectUri.trim(),
          sandbox: settings.sandbox
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.clientId.trim() || !settings.clientSecret.trim()) {
      toast.warning('Please save your credentials first');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/quickbooks/test-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: settings.clientId.trim(),
          clientSecret: settings.clientSecret.trim(),
          sandbox: settings.sandbox
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Network error - please try again');
    } finally {
      setTesting(false);
    }
  };

  if (!quickbooksEnabled) {
    return null;
  }

  return (
    <ProtectedRoute requireRole={[ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </button>

            <div className="flex items-center mb-4">
              <CogIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  QuickBooks Settings
                </h1>
                <p className="text-gray-600 mt-1">
                  Configure QuickBooks API credentials for your organization
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardBody>
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3">Loading...</span>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* API Credentials Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                    API Credentials
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-6">
                    {/* Environment Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Environment
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="environment"
                            checked={settings.sandbox}
                            onChange={(e) => setSettings(prev => ({ ...prev, sandbox: true }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Sandbox
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="environment"
                            checked={!settings.sandbox}
                            onChange={(e) => setSettings(prev => ({ ...prev, sandbox: false }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Production
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Client ID */}
                    <div>
                      <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                        Client ID *
                      </label>
                      <input
                        type="text"
                        id="clientId"
                        value={settings.clientId}
                        onChange={(e) => setSettings(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="Enter your QuickBooks Client ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Client Secret */}
                    <div>
                      <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
                        Client Secret *
                      </label>
                      <input
                        type="password"
                        id="clientSecret"
                        value={settings.clientSecret}
                        onChange={(e) => setSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="Enter your QuickBooks Client Secret"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Redirect URI */}
                    <div>
                      <label htmlFor="redirectUri" className="block text-sm font-medium text-gray-700 mb-2">
                        Redirect URI
                      </label>
                      <input
                        type="url"
                        id="redirectUri"
                        value={settings.redirectUri}
                        onChange={(e) => setSettings(prev => ({ ...prev, redirectUri: e.target.value }))}
                        placeholder="https://yourapp.com/api/quickbooks/callback"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Use this URL when setting up your QuickBooks app
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <ShieldCheckIcon className="w-4 h-4 mr-2" />
                            Save Credentials
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testing || !settings.clientId.trim() || !settings.clientSecret.trim()}
                        className="flex items-center"
                      >
                        {testing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Information Card */}
              <Card>
                <CardBody>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                      Setup Instructions
                    </h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>1. Create a QuickBooks app at <a href="https://developer.intuit.com" target="_blank" className="underline">developer.intuit.com</a></p>
                      <p>2. Copy your Client ID and Client Secret from the app dashboard</p>
                      <p>3. Set your app's Redirect URI to: <code className="bg-white px-1 rounded">{settings.redirectUri}</code></p>
                      <p>4. Save your credentials and test the connection</p>
                      <p>5. Start connecting companies to QuickBooks from the main dashboard</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </main>

        <Footer />
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </ProtectedRoute>
  );
}