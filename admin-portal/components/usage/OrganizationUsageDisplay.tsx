"use client";

import { useState, useEffect } from 'react';
import { UserLimitIndicator } from '@/shared/components/usage/UserLimitIndicator';
import { AICreditsWidget } from '@/shared/components/usage/AICreditsWidget';
import { useTranslations } from '@/lib/locales/loader';
import { UsageData } from '@/shared/types/usage';

interface OrganizationUsageDisplayProps {
  organizationId: string;
  className?: string;
  locale?: string;
}

export function OrganizationUsageDisplay({ 
  organizationId, 
  className = "", 
  locale = "en-US" 
}: OrganizationUsageDisplayProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load translations for usage components
  const { t, loading: translationsLoading } = useTranslations(locale, 'common');

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/organizations/${organizationId}/usage`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setUsageData(result.data);
        } else {
          setError(result.error || 'Failed to fetch usage data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchUsage();
    }
  }, [organizationId]);

  if (loading || translationsLoading) {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
      </div>
    );
  }

  if (error || !usageData) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-500">{error || 'No usage data available'}</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* User Capacity Widget */}
      <UserLimitIndicator
        current={usageData.users.current}
        max={usageData.users.max}
        getText={t}  // Pass the translation function
      />
      
      {/* AI Credits Widget */}
      <AICreditsWidget
        balance={usageData.aiCredits.balance}
        used={usageData.aiCredits.used}
        monthly={usageData.aiCredits.monthly}
        resetDate={usageData.aiCredits.resetDate}
        recentUsage={usageData.aiCredits.recentUsage}
        estimatedDaysRemaining={usageData.aiCredits.estimatedDaysRemaining}
        companiesCount={usageData.aiCredits.companiesCount}
        getText={t}  // Pass the translation function
        currentLocale={locale}
      />
    </div>
  );
}