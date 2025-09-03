"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface DashboardStats {
  organizations: number;
  companies: number;
  users: number;
  activeToday: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const quickActions = [
    { name: 'Create Organization', href: '/organizations', description: 'Add new organization to platform' },
    { name: 'Copy Data', href: '/copy-center', description: 'Copy configurations and data' },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title="Platform Dashboard"
      description="Welcome to the Warren admin portal"
    >
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {user?.firstName?.[0] || 'A'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Welcome back, {user?.firstName}
                </h2>
                <p className="text-gray-600">
                  Platform Administrator • {user?.email}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardBody className="p-4">
                    <h4 className="font-medium text-gray-900 mb-1">{action.name}</h4>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Platform Overview */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statsLoading ? '...' : stats?.organizations ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-900">Organizations</div>
                <div className="text-xs text-gray-500">Total active</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statsLoading ? '...' : stats?.companies ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-900">Companies</div>
                <div className="text-xs text-gray-500">Across all orgs</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statsLoading ? '...' : stats?.users ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-900">Users</div>
                <div className="text-xs text-gray-500">Platform wide</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statsLoading ? '...' : stats?.activeToday ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-900">Active Today</div>
                <div className="text-xs text-gray-500">Last 24 hours</div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* System Status */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                <p className="text-sm text-gray-600">All systems operational</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Healthy</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}