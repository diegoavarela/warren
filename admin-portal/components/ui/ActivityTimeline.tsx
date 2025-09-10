"use client";

import { formatTimeAgo } from './DateUtils';

interface Activity {
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: Date | string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

const getActionColor = (action: string): string => {
  switch (action.toLowerCase()) {
    case 'create': return 'text-green-600 bg-green-50';
    case 'update': case 'edit': return 'text-blue-600 bg-blue-50';
    case 'delete': return 'text-red-600 bg-red-50';
    case 'login': return 'text-purple-600 bg-purple-50';
    case 'copy': return 'text-orange-600 bg-orange-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const formatActionText = (action: string, resource: string): string => {
  const actionMap: Record<string, string> = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    login: 'logged into',
    copy: 'copied',
    invite: 'invited',
    enable: 'enabled',
    disable: 'disabled'
  };
  
  const actionText = actionMap[action.toLowerCase()] || action;
  const resourceText = resource.toLowerCase();
  
  return `${actionText} ${resourceText}`;
};

export function ActivityTimeline({ activities, loading = false }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-sm">No recent activity</div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getActionColor(activity.action)}`}>
                {activity.action.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{activity.userName}</span>
                  {' '}
                  <span>{formatActionText(activity.action, activity.resource)}</span>
                  {activity.resourceId && (
                    <span className="text-gray-500">
                      {' '}({activity.resourceId.slice(-6)})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(activity.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}