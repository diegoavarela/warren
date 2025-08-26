/**
 * Background Job Progress Component
 * 
 * Displays real-time progress for background processing jobs with
 * progress bars, status indicators, and cancellation options.
 */

'use client';

import React, { useState } from 'react';
import { BackgroundJob } from '@/lib/services/background-processor';
import { useJobStatus } from '@/hooks/useBackgroundJobs';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';

interface BackgroundJobProgressProps {
  jobId: string;
  showDetails?: boolean;
  onComplete?: (job: BackgroundJob) => void;
  onError?: (job: BackgroundJob) => void;
  onCancel?: (jobId: string) => void;
  className?: string;
}

const statusIcons = {
  pending: <ClockIcon className="w-5 h-5 text-yellow-500" />,
  processing: <Cog6ToothIcon className="w-5 h-5 text-blue-500 animate-spin" />,
  completed: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
  failed: <XCircleIcon className="w-5 h-5 text-red-500" />,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

export function BackgroundJobProgress({
  jobId,
  showDetails = true,
  onComplete,
  onError,
  onCancel,
  className = ''
}: BackgroundJobProgressProps) {
  const { job, loading, error } = useJobStatus(jobId);
  const [isCollapsed, setIsCollapsed] = useState(!showDetails);

  // Handle job completion
  React.useEffect(() => {
    if (job && job.status === 'completed' && onComplete) {
      onComplete(job);
    }
    if (job && job.status === 'failed' && onError) {
      onError(job);
    }
  }, [job, onComplete, onError]);

  if (loading && !job) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="w-32 h-4 bg-gray-300 rounded mb-2"></div>
            <div className="w-full h-2 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <XCircleIcon className="w-5 h-5 text-red-500" />
          <span className="text-red-800 text-sm">
            {error || 'Job not found'}
          </span>
        </div>
      </div>
    );
  }

  const handleCancel = async () => {
    if (onCancel && (job.status === 'pending' || job.status === 'processing')) {
      onCancel(job.id);
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    if (progress === 0) return 'bg-gray-300';
    return 'bg-blue-500';
  };

  const getStageText = (job: BackgroundJob) => {
    const stage = job.metadata?.stage;
    switch (stage) {
      case 'fetching_file': return 'Fetching file data...';
      case 'processing_excel': return 'Processing Excel file...';
      case 'applying_configuration': return 'Applying configuration...';
      case 'saving_results': return 'Saving results...';
      case 'clearing_caches': return 'Clearing caches...';
      default: return getDefaultStageText(job.status);
    }
  };

  const getDefaultStageText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting to start...';
      case 'processing': return 'Processing...';
      case 'completed': return 'Completed successfully';
      case 'failed': return 'Processing failed';
      default: return 'Unknown status';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className={`px-4 py-3 border-b border-gray-100 cursor-pointer ${statusColors[job.status]}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusIcons[job.status]}
            <div>
              <div className="font-medium text-sm">
                {job.type === 'excel_processing' && 'Excel Processing'}
                {job.type === 'data_export' && 'Data Export'}
                {job.type === 'report_generation' && 'Report Generation'}
              </div>
              <div className="text-xs opacity-75">
                {getStageText(job)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {job.status === 'processing' && (
              <span className="text-xs font-mono">
                {job.progress}%
              </span>
            )}
            
            {(job.status === 'pending' || job.status === 'processing') && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="text-xs px-2 py-1"
              >
                Cancel
              </Button>
            )}
            
            <button className="text-gray-400 hover:text-gray-600">
              {isCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-gray-50">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(job.progress, job.status)}`}
            style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
          ></div>
        </div>
      </div>

      {/* Details */}
      {!isCollapsed && (
        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Created:</span>
              <div className="font-mono">{new Date(job.createdAt).toLocaleString()}</div>
            </div>
            
            {job.startedAt && (
              <div>
                <span className="text-gray-500">Started:</span>
                <div className="font-mono">{new Date(job.startedAt).toLocaleString()}</div>
              </div>
            )}
            
            {job.completedAt && (
              <div>
                <span className="text-gray-500">Completed:</span>
                <div className="font-mono">{new Date(job.completedAt).toLocaleString()}</div>
              </div>
            )}
            
            {job.startedAt && job.completedAt && (
              <div>
                <span className="text-gray-500">Duration:</span>
                <div className="font-mono">
                  {Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)}s
                </div>
              </div>
            )}
          </div>

          {/* Error Details */}
          {job.status === 'failed' && job.error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-red-800 text-xs">
                <strong>Error:</strong> {job.error}
              </div>
            </div>
          )}

          {/* Success Details */}
          {job.status === 'completed' && job.result && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-green-800 text-xs">
                <strong>Results:</strong>
                {job.type === 'excel_processing' && (
                  <div className="mt-1">
                    • Processed {job.result.periodsProcessed} periods
                    <br />
                    • Generated {job.result.dataRows} data rows
                    <br />
                    • Processing time: {Math.round(job.result.processingTime / 1000)}s
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BackgroundJobProgress;