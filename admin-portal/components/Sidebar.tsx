"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';
import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    description: 'Overview and metrics'
  },
  {
    name: 'Organizations',
    href: '/organizations',
    icon: BuildingOffice2Icon,
    description: 'Manage organizations'
  },
  {
    name: 'Tiers',
    href: '/tiers',
    icon: CurrencyDollarIcon,
    description: 'Pricing & features'
  },
  {
    name: 'Copy Center',
    href: '/copy-center',
    icon: DocumentDuplicateIcon,
    description: 'Copy data & configs'
  },
  {
    name: 'Feature Flags',
    href: '/feature-flags',
    icon: FlagIcon,
    description: 'Feature management'
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    icon: ClipboardDocumentListIcon,
    description: 'Activity logs'
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-4 bg-white px-4 py-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          Warren Admin Portal
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={clsx('relative z-50 lg:hidden', mobileMenuOpen ? '' : 'hidden')}>
        <div className="fixed inset-0 bg-gray-900/80" />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent pathname={pathname} user={user} logout={logout} />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={clsx('hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col', className)}>
        <SidebarContent pathname={pathname} user={user} logout={logout} />
      </div>
    </>
  );
}

function SidebarContent({ pathname, user, logout }: {
  pathname: string;
  user: any;
  logout: () => void;
}) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Warren Admin</h1>
            <p className="text-xs text-gray-500">Platform Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-l-md p-3 text-sm leading-6 font-medium transition-colors'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        pathname === item.href ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700',
                        'h-5 w-5 shrink-0'
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          {/* User info at bottom */}
          <li className="mt-auto">
            <div className="border-t border-gray-200 pt-4">
              {user && (
                <div className="px-3 py-2 mb-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-blue-600 font-medium">{user.role}</p>
                </div>
              )}
              <button
                onClick={logout}
                className="group flex w-full gap-x-3 rounded-md p-3 text-sm leading-6 font-medium text-gray-700 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon
                  className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-red-700"
                  aria-hidden="true"
                />
                Sign out
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}