import { NextRequest, NextResponse } from "next/server";
import { db, processingJobs } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ParseJobResponse } from "@/types";

// GET /api/v1/parse/:jobId - Get parsing job status
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const companyId = request.headers.get('x-company-id');
    const { jobId } = params;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header'
          }
        },
        { status: 401 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'MISSING_COMPANY_ID',
            message: 'Missing X-Company-ID header'
          }
        },
        { status: 400 }
      );
    }

    // Get job details
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Parsing job not found'
          }
        },
        { status: 404 }
      );
    }

    // Verify job belongs to the company
    if (job.payload && 
        typeof job.payload === 'object' && 
        'companyId' in job.payload && 
        job.payload.companyId !== companyId) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Job does not belong to this company'
          }
        },
        { status: 403 }
      );
    }

    // Build response based on job status
    const response: ParseJobResponse = {
      jobId: job.id,
      status: job.status as any,
      progress: job.progress || 0,
      webhookConfigured: !!(job.payload && 
        typeof job.payload === 'object' && 
        'webhookUrl' in job.payload && 
        job.payload.webhookUrl)
    };

    // Add result if job is completed
    if (job.status === 'completed' && job.result) {
      response.result = {
        totalRows: job.result.totalRows || 0,
        successRate: job.result.successRate || 0,
        dataId: job.result.dataId || '',
        errors: job.result.errors || []
      };
    }

    // Add error if job failed
    if (job.status === 'failed' && job.error) {
      response.result = {
        totalRows: 0,
        successRate: 0,
        dataId: '',
        errors: [job.error]
      };
    }

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Parse job status error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/parse/:jobId - Cancel parsing job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const companyId = request.headers.get('x-company-id');
    const { jobId } = params;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header'
          }
        },
        { status: 401 }
      );
    }

    // Get job details first
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Parsing job not found'
          }
        },
        { status: 404 }
      );
    }

    // Verify job belongs to the company
    if (job.payload && 
        typeof job.payload === 'object' && 
        'companyId' in job.payload && 
        job.payload.companyId !== companyId) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Job does not belong to this company'
          }
        },
        { status: 403 }
      );
    }

    // Check if job can be cancelled
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Job cannot be cancelled as it is already completed or failed'
          }
        },
        { status: 400 }
      );
    }

    // Update job status to cancelled
    await db
      .update(processingJobs)
      .set({ 
        status: 'failed',
        error: 'Cancelled by user',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(processingJobs.id, jobId));

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    console.error('Parse job cancellation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      },
      { status: 500 }
    );
  }
}