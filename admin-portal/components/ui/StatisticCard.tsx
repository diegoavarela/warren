"use client";

interface StatisticCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  children?: React.ReactNode;
}

const colorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  gray: 'text-gray-600'
};

const trendIcons = {
  up: '↗',
  down: '↘',
  stable: '→'
};

const trendColors = {
  up: 'text-green-500',
  down: 'text-red-500',
  stable: 'text-gray-500'
};

export function StatisticCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  color = 'blue',
  children 
}: StatisticCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-2xl font-bold ${colorClasses[color]} mb-1`}>
            {value}
          </div>
          <div className="text-sm font-medium text-gray-900 mb-1">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500">
              {subtitle}
            </div>
          )}
          {children}
        </div>
        
        {trend && (
          <div className={`text-sm font-medium ${trendColors[trend]} flex items-center ml-2`}>
            <span className="mr-1">{trendIcons[trend]}</span>
            {trendValue !== undefined && (
              <span>{trendValue}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}