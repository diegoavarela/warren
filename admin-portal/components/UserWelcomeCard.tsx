"use client";

import { useAuth } from '@/lib/auth-context';

export function UserWelcomeCard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center space-x-4 bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">
          {user.firstName?.[0] || 'A'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-gray-900 truncate">
          Welcome back, {user.firstName}
        </h2>
        <p className="text-xs text-gray-600 truncate">
          Platform Administrator • {user.email}
        </p>
      </div>
    </div>
  );
}