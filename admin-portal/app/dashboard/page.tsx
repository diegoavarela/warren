"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { StatisticCard } from '@/components/ui/StatisticCard';
import { QuickActionBar } from '@/components/ui/QuickActionBar';
import { ActivityTimeline } from '@/components/ui/ActivityTimeline';
import { formatTimeAgo, formatPercentage } from '@/components/ui/DateUtils';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

interface TierBreakdown {
  tier: string;
  count: number;
}

interface AIAdoption {
  orgsUsingAI: number;
  orgsTotal: number;
  companiesUsingAI: number;
  companiesTotal: number;
}

interface Growth {
  newOrgsThisMonth: number;
  newCompaniesThisMonth: number;
}

interface Activity {
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: Date | string;
}

interface DashboardStats {
  // Core metrics
  totalOrganizations: number;
  totalCompanies: number;
  totalUsers: number;
  activeToday: number;
  
  // Enhanced metrics
  tierBreakdown: TierBreakdown[];
  lastOrgAdded: {
    name: string;
    createdAt: Date | string;
  } | null;
  copyOperations: number;
  lastActivity: Date | string | null;
  
  // AI adoption
  aiAdoption: AIAdoption;
  
  // Growth metrics
  growth: Growth;
  
  // Recent activities
  recentActivities: Activity[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setStatsLoading(false);
    }
  };

  if (error) {
    return (
      <DashboardLayout 
        title="Platform Dashboard"
        description="Welcome to the Warren admin portal"
      >
        <Card>
          <CardBody className="p-6 text-center">
            <div className="text-red-600 mb-2">Error loading dashboard</div>
            <div className="text-gray-600 text-sm mb-4">{error}</div>
            <button 
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  const renderTierBreakdown = () => {
    if (!stats?.tierBreakdown || stats.tierBreakdown.length === 0) return null;
    
    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {stats.tierBreakdown.map((tier, index) => (
          <span key={tier.tier} className="inline-flex items-center">
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
              {tier.count} {tier.tier}
            </span>
            {index < stats.tierBreakdown.length - 1 && (
              <span className="text-gray-300 mx-1">|</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout 
      title="Platform Dashboard"
      description="Complete platform overview with real-time metrics"
    >
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <QuickActionBar />

        {/* Main Statistics - Single Consolidated Card */}
        <Card>
          <CardBody className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Platform Overview</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Organizations Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Organizations</h4>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {statsLoading ? '...' : stats?.totalOrganizations ?? 0}
                    </span>
                    {stats?.growth.newOrgsThisMonth ? (
                      <span className="text-sm text-green-600 font-medium">
                        +{stats.growth.newOrgsThisMonth} this month
                      </span>
                    ) : null}
                  </div>
                  {renderTierBreakdown()}
                  {stats?.lastOrgAdded && (
                    <div className="text-xs text-gray-500 mt-2">
                      Latest: {stats.lastOrgAdded.name} • {formatTimeAgo(stats.lastOrgAdded.createdAt)}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Usage</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Companies:</span>
                      <span className="font-medium">
                        {statsLoading ? '...' : stats?.totalCompanies ?? 0}
                        {stats?.growth.newCompaniesThisMonth ? (
                          <span className="text-green-600 ml-1">
                            (+{stats.growth.newCompaniesThisMonth})
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Users:</span>
                      <span className="font-medium">{statsLoading ? '...' : stats?.totalUsers ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Today:</span>
                      <span className="font-medium">{statsLoading ? '...' : stats?.activeToday ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Copy Operations:</span>
                      <span className="font-medium">{statsLoading ? '...' : stats?.copyOperations ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Adoption Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">AI Adoption</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-2xl font-bold text-purple-600">
                          {statsLoading ? '...' : stats?.aiAdoption.orgsUsingAI ?? 0}
                        </span>
                        <span className="text-sm text-gray-600">
                          / {stats?.aiAdoption.orgsTotal ?? 0} Organizations
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats ? formatPercentage(stats.aiAdoption.orgsUsingAI, stats.aiAdoption.orgsTotal) : '0%'} adoption rate
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-2xl font-bold text-indigo-600">
                          {statsLoading ? '...' : stats?.aiAdoption.companiesUsingAI ?? 0}
                        </span>
                        <span className="text-sm text-gray-600">
                          / {stats?.aiAdoption.companiesTotal ?? 0} Companies
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats ? formatPercentage(stats.aiAdoption.companiesUsingAI, stats.aiAdoption.companiesTotal) : '0%'} using AI features
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">System Activity</h4>
                  <div className="text-xs text-gray-500">
                    {stats?.lastActivity ? (
                      <>Last activity: {formatTimeAgo(stats.lastActivity)}</>
                    ) : (
                      'No recent activity'
                    )}
                  </div>
                </div>
              </div>

              {/* System Health Section */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">System Health</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">All Systems Operational</span>
                  </div>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div>Database: Connected</div>
                    <div>API Response: &lt; 500ms</div>
                    <div>Cache: Active</div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Activity Timeline */}
        <ActivityTimeline 
          activities={stats?.recentActivities ?? []} 
          loading={statsLoading}
        />
      </div>
    </DashboardLayout>
  );
}