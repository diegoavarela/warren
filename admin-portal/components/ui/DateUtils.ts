// Date utility functions for dashboard
export const formatTimeAgo = (date: Date | string | null): string => {
  if (!date) return 'Never';
  
  const now = new Date();
  const inputDate = new Date(date);
  const diffMs = now.getTime() - inputDate.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  
  return inputDate.toLocaleDateString();
};

export const formatDateTime = (date: Date | string | null): string => {
  if (!date) return 'N/A';
  
  const inputDate = new Date(date);
  return inputDate.toLocaleString();
};

export const formatPercentage = (numerator: number, denominator: number): string => {
  if (denominator === 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
};