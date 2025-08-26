/**
 * Background Jobs API
 * 
 * Manages background processing jobs for Excel processing and other heavy operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { backgroundProcessor } from '@/lib/services/background-processor';

// GET /api/jobs - Get jobs for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let jobs = backgroundProcessor.getUserJobs(user.id);

    // Filter by company if specified and user has access
    if (companyId) {
      const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      jobs = jobs.filter(job => job.companyId === companyId);
    }

    // Filter by status
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    // Filter by type
    if (type) {
      jobs = jobs.filter(job => job.type === type);
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      success: true,
      data: jobs,
      meta: {
        total: jobs.length,
        stats: backgroundProcessor.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Jobs API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch jobs'
    }, { status: 500 });
  }
}

// POST /api/jobs - Create a new background job
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, companyId, fileId, configId, metadata = {} } = body;

    // Validate required fields
    if (!type || !companyId) {
      return NextResponse.json({
        error: 'Missing required fields: type, companyId'
      }, { status: 400 });
    }

    // Check company access
    const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let jobId: string;

    switch (type) {
      case 'excel_processing':
        if (!fileId || !configId) {
          return NextResponse.json({
            error: 'Missing required fields for Excel processing: fileId, configId'
          }, { status: 400 });
        }
        
        jobId = await backgroundProcessor.addExcelProcessingJob(
          companyId,
          fileId,
          configId,
          user.id,
          metadata
        );
        break;

      default:
        return NextResponse.json({
          error: `Unsupported job type: ${type}`
        }, { status: 400 });
    }

    const job = backgroundProcessor.getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      data: job,
      message: `${type} job created successfully`
    });

  } catch (error) {
    console.error('❌ Create Job API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create job'
    }, { status: 500 });
  }
}