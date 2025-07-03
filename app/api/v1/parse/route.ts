import { NextRequest, NextResponse } from "next/server";
import { db, processingJobs } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ParseJobRequest, ParseJobResponse } from "@/types";

// POST /api/v1/parse - Submit parsing job
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const companyId = request.headers.get('x-company-id');

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

    const body: ParseJobRequest = await request.json();
    const { fileUrl, fileData, sheetName, mappingTemplateId, webhookUrl, locale } = body;

    if (!fileUrl && !fileData) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'Either fileUrl or fileData is required'
          }
        },
        { status: 400 }
      );
    }

    // Create processing job
    const jobId = nanoid();
    const [job] = await db.insert(processingJobs).values({
      id: jobId,
      jobType: 'parse_excel',
      status: 'pending',
      priority: 1,
      payload: {
        companyId,
        fileUrl,
        fileData,
        sheetName,
        mappingTemplateId,
        webhookUrl,
        locale: locale || 'es-MX',
        submittedAt: new Date().toISOString()
      },
      scheduledAt: new Date(),
      maxAttempts: 3
    }).returning();

    // In a real implementation, you would queue this job for processing
    // await queueParsingJob(job);

    const response: ParseJobResponse = {
      jobId: job.id,
      status: 'pending',
      progress: 0,
      estimatedDuration: '2-5 minutes',
      webhookConfigured: !!webhookUrl
    };

    return NextResponse.json({
      success: true,
      data: response
    }, { status: 202 });

  } catch (error) {
    console.error('Parse job submission error:', error);
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

// GET /api/v1/parse - List parsing jobs for company
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const companyId = request.headers.get('x-company-id');
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

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

    let query = db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.jobType, 'parse_excel'));

    // Filter by company (from payload)
    // Note: This would need a proper JSON query in production
    
    if (status) {
      query = query.where(eq(processingJobs.status, status));
    }

    const offset = (page - 1) * limit;
    const jobs = await query
      .orderBy(desc(processingJobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter jobs by company ID (simplified for demo)
    const filteredJobs = jobs.filter((job: any) => 
      job.payload && 
      typeof job.payload === 'object' && 
      'companyId' in job.payload && 
      job.payload.companyId === companyId
    );

    return NextResponse.json({
      success: true,
      data: filteredJobs,
      meta: {
        total: filteredJobs.length,
        page,
        limit
      }
    });

  } catch (error) {
    console.error('Parse jobs GET error:', error);
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