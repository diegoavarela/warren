"use client";

import Link from 'next/link';
import {
  BuildingOfficeIcon,
  UserPlusIcon,
  DocumentDuplicateIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    name: 'New Organization',
    href: '/organizations',
    icon: BuildingOfficeIcon,
    description: 'Add organization'
  },
  {
    name: 'Add User',
    href: '/users',
    icon: UserPlusIcon,
    description: 'Invite new user'
  },
  {
    name: 'Copy Data',
    href: '/copy-center',
    icon: DocumentDuplicateIcon,
    description: 'Copy configurations'
  },
  {
    name: 'Feature Flags',
    href: '/feature-flags',
    icon: FlagIcon,
    description: 'Manage features'
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    icon: ClipboardDocumentListIcon,
    description: 'View activity'
  },
  {
    name: 'Tiers',
    href: '/tiers',
    icon: CreditCardIcon,
    description: 'Manage pricing'
  }
];

export function QuickActionBar() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.name}
              href={action.href}
              className="group flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              title={action.description}
            >
              <Icon className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors mb-2" />
              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 text-center leading-tight">
                {action.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}