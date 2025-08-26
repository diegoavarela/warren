/**
 * Background Jobs Hook
 * 
 * React hook for managing background processing jobs with real-time updates
 * and progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { BackgroundJob } from '@/lib/services/background-processor';

interface UseBackgroundJobsOptions {
  companyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseBackgroundJobsReturn {
  jobs: BackgroundJob[];
  loading: boolean;
  error: string | null;
  stats: any;
  createJob: (jobData: CreateJobData) => Promise<BackgroundJob>;
  cancelJob: (jobId: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
  getJobById: (jobId: string) => BackgroundJob | undefined;
}

interface CreateJobData {
  type: 'excel_processing' | 'data_export' | 'report_generation';
  companyId: string;
  fileId?: string;
  configId?: string;
  metadata?: any;
}

export function useBackgroundJobs(options: UseBackgroundJobsOptions = {}): UseBackgroundJobsReturn {
  const { companyId, autoRefresh = true, refreshInterval = 2000 } = options;
  
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(null);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.set('companyId', companyId);
      
      const response = await fetch(`/api/jobs?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
        setStats(data.meta?.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [companyId]);

  // Create a new background job
  const createJob = useCallback(async (jobData: CreateJobData): Promise<BackgroundJob> => {
    try {
      setError(null);
      
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh jobs to include the new one
        await fetchJobs();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create job');
      }
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchJobs]);

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh jobs to reflect the cancellation
        await fetchJobs();
      } else {
        throw new Error(data.error || 'Failed to cancel job');
      }
    } catch (err) {
      console.error('Error cancelling job:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchJobs]);

  // Refresh jobs manually
  const refreshJobs = useCallback(async () => {
    setLoading(true);
    try {
      await fetchJobs();
    } finally {
      setLoading(false);
    }
  }, [fetchJobs]);

  // Get job by ID
  const getJobById = useCallback((jobId: string): BackgroundJob | undefined => {
    return jobs.find(job => job.id === jobId);
  }, [jobs]);

  // Initial load
  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Only refresh if there are active jobs
      const hasActiveJobs = jobs.some(job => 
        job.status === 'pending' || job.status === 'processing'
      );

      if (hasActiveJobs) {
        fetchJobs();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, jobs, fetchJobs]);

  return {
    jobs,
    loading,
    error,
    stats,
    createJob,
    cancelJob,
    refreshJobs,
    getJobById,
  };
}

// Hook for monitoring a specific job
export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<BackgroundJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setError(null);
      const response = await fetch(`/api/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setJob(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch job status');
      }
    } catch (err) {
      console.error('Error fetching job status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      fetchJobStatus().finally(() => setLoading(false));
    }
  }, [jobId, fetchJobStatus]);

  // Auto-refresh while job is active
  useEffect(() => {
    if (!jobId || !job) return;

    if (job.status === 'pending' || job.status === 'processing') {
      const interval = setInterval(fetchJobStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [jobId, job, fetchJobStatus]);

  return { job, loading, error, refresh: fetchJobStatus };
}

export default useBackgroundJobs;