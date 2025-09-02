/**
 * Individual Job Management API
 * 
 * Get status, cancel, or manage specific background jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { backgroundProcessor } from '@/lib/services/background-processor';

// GET /api/jobs/[jobId] - Get specific job status
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = backgroundProcessor.getJobStatus(params.jobId);
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Check if user owns this job
    if (job.userId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('❌ Get Job API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch job status'
    }, { status: 500 });
  }
}

// DELETE /api/jobs/[jobId] - Cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = backgroundProcessor.getJobStatus(params.jobId);
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Check if user owns this job
    if (job.userId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 });
    }

    const cancelled = backgroundProcessor.cancelJob(params.jobId);
    if (!cancelled) {
      return NextResponse.json({ 
        error: 'Job cannot be cancelled (already completed or failed)' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel Job API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel job'
    }, { status: 500 });
  }
}