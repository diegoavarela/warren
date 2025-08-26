/**
 * Background Processing Service
 * 
 * Handles heavy Excel processing operations in the background to prevent
 * UI blocking and improve user experience. Uses a job queue system with
 * progress tracking and real-time updates.
 */

import { db } from '@/lib/db';
import { 
  financialDataFiles, 
  processedFinancialData,
  companyConfigurations 
} from '@/lib/db/actual-schema';
import { eq, and } from 'drizzle-orm';
import { excelProcessingService } from './excel-processing-service';
import { cacheService } from './cache-service';

export interface BackgroundJob {
  id: string;
  type: 'excel_processing' | 'data_export' | 'report_generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  companyId: string;
  fileId?: string;
  configId?: string;
  userId: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: any;
}

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

class BackgroundProcessorService {
  private jobs = new Map<string, BackgroundJob>();
  private processingQueue: BackgroundJob[] = [];
  private isProcessing = false;
  private maxConcurrentJobs = 2;
  private activeJobs = 0;

  /**
   * Add Excel processing job to background queue
   */
  async addExcelProcessingJob(
    companyId: string,
    fileId: string,
    configId: string,
    userId: string,
    metadata: any = {}
  ): Promise<string> {
    const jobId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BackgroundJob = {
      id: jobId,
      type: 'excel_processing',
      status: 'pending',
      progress: 0,
      companyId,
      fileId,
      configId,
      userId,
      createdAt: new Date(),
      metadata
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    console.log(`📋 Added Excel processing job: ${jobId}`);
    return jobId;
  }

  /**
   * Get job status and progress
   */
  getJobStatus(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: string): BackgroundJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Get all jobs for a company
   */
  getCompanyJobs(companyId: string): BackgroundJob[] {
    return Array.from(this.jobs.values()).filter(job => job.companyId === companyId);
  }

  /**
   * Start processing jobs from the queue
   */
  private async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 Background processor started');

    while (this.processingQueue.length > 0 && this.activeJobs < this.maxConcurrentJobs) {
      const job = this.processingQueue.shift();
      if (job) {
        this.processJob(job);
      }
    }

    // Continue processing until queue is empty
    if (this.processingQueue.length > 0) {
      setTimeout(() => this.startProcessing(), 1000);
    } else {
      this.isProcessing = false;
      console.log('✅ Background processor finished');
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: BackgroundJob) {
    this.activeJobs++;
    
    try {
      console.log(`🔄 Processing job: ${job.id}`);
      
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      this.updateJob(job);

      switch (job.type) {
        case 'excel_processing':
          await this.processExcelJob(job);
          break;
        case 'data_export':
          await this.processDataExportJob(job);
          break;
        case 'report_generation':
          await this.processReportGenerationJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Job completed successfully
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      this.updateJob(job);
      
      console.log(`✅ Job completed: ${job.id}`);

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.updateJob(job);
    } finally {
      this.activeJobs--;
      
      // Continue processing queue
      if (this.processingQueue.length > 0 && this.activeJobs < this.maxConcurrentJobs) {
        setTimeout(() => this.startProcessing(), 100);
      }
    }
  }

  /**
   * Process Excel file with configuration in background
   */
  private async processExcelJob(job: BackgroundJob) {
    if (!job.fileId || !job.configId) {
      throw new Error('Missing fileId or configId for Excel processing job');
    }

    // Update progress: Fetching file data
    job.progress = 10;
    job.metadata = { ...job.metadata, stage: 'fetching_file' };
    this.updateJob(job);

    // Get file from database
    const fileResult = await db
      .select()
      .from(financialDataFiles)
      .where(and(
        eq(financialDataFiles.id, job.fileId),
        eq(financialDataFiles.companyId, job.companyId)
      ))
      .limit(1);

    if (fileResult.length === 0) {
      throw new Error('File not found');
    }

    const file = fileResult[0];

    // Update progress: Processing Excel
    job.progress = 30;
    job.metadata = { ...job.metadata, stage: 'processing_excel' };
    this.updateJob(job);

    // Get configuration
    const configResult = await db
      .select()
      .from(companyConfigurations)
      .where(and(
        eq(companyConfigurations.id, job.configId),
        eq(companyConfigurations.companyId, job.companyId)
      ))
      .limit(1);

    if (configResult.length === 0) {
      throw new Error('Configuration not found');
    }

    const config = configResult[0];

    // Update progress: Processing with configuration
    job.progress = 50;
    job.metadata = { ...job.metadata, stage: 'applying_configuration' };
    this.updateJob(job);

    // Process Excel with configuration
    const processedData = await excelProcessingService.processExcelWithConfiguration(
      file.fileContent,
      config.configJson as any,
      config.type as 'pnl' | 'cashflow',
      config.configJson?.metadata?.selectedSheet
    );

    // Update progress: Saving results
    job.progress = 80;
    job.metadata = { ...job.metadata, stage: 'saving_results' };
    this.updateJob(job);

    // Store processed data
    const processedRecord = await db
      .insert(processedFinancialData)
      .values({
        companyId: job.companyId,
        configId: job.configId,
        fileId: job.fileId,
        dataJson: processedData as any,
        processingStatus: 'completed',
        processedBy: job.userId,
        processedAt: new Date(),
      })
      .returning();

    // Update progress: Clearing caches
    job.progress = 90;
    job.metadata = { ...job.metadata, stage: 'clearing_caches' };
    this.updateJob(job);

    // Clear relevant caches
    cacheService.clearByPattern(`pnl:${job.companyId}`);
    cacheService.clearByPattern(`cashflow:${job.companyId}`);
    cacheService.clearByPattern(`configs:${job.companyId}`);

    // Store result
    job.result = {
      processedDataId: processedRecord[0]?.id,
      periodsProcessed: processedData.periods?.length || 0,
      dataRows: Object.keys(processedData.dataRows || {}).length,
      processingTime: Date.now() - (job.startedAt?.getTime() || 0)
    };
  }

  /**
   * Process data export job (placeholder for future implementation)
   */
  private async processDataExportJob(job: BackgroundJob) {
    // Simulate export processing
    for (let i = 0; i <= 100; i += 10) {
      job.progress = i;
      job.metadata = { 
        ...job.metadata, 
        stage: i < 50 ? 'preparing_data' : i < 90 ? 'generating_export' : 'finalizing'
      };
      this.updateJob(job);
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    }

    job.result = { exportUrl: '/api/exports/example.xlsx' };
  }

  /**
   * Process report generation job (placeholder for future implementation)
   */
  private async processReportGenerationJob(job: BackgroundJob) {
    // Simulate report generation
    for (let i = 0; i <= 100; i += 20) {
      job.progress = i;
      job.metadata = { 
        ...job.metadata, 
        stage: i < 40 ? 'collecting_data' : i < 80 ? 'generating_report' : 'finalizing'
      };
      this.updateJob(job);
      await new Promise(resolve => setTimeout(resolve, 150)); // Simulate work
    }

    job.result = { reportUrl: '/api/reports/example.pdf' };
  }

  /**
   * Update job in memory and notify clients
   */
  private updateJob(job: BackgroundJob) {
    this.jobs.set(job.id, { ...job });
    
    // In a real implementation, you might emit WebSocket events here
    // or store job status in database for persistence across server restarts
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Job ${job.id}: ${job.status} (${job.progress}%) - ${job.metadata?.stage || ''}`);
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    if (job.status === 'pending') {
      // Remove from queue
      const queueIndex = this.processingQueue.findIndex(j => j.id === jobId);
      if (queueIndex >= 0) {
        this.processingQueue.splice(queueIndex, 1);
      }
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();
    this.updateJob(job);

    return true;
  }

  /**
   * Clean up old jobs (runs periodically)
   */
  cleanupOldJobs(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const jobsToRemove: string[] = [];

    this.jobs.forEach((job, jobId) => {
      if (job.createdAt < cutoffTime && 
          (job.status === 'completed' || job.status === 'failed')) {
        jobsToRemove.push(jobId);
      }
    });

    jobsToRemove.forEach(jobId => {
      this.jobs.delete(jobId);
    });

    if (jobsToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${jobsToRemove.length} old jobs`);
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const allJobs = Array.from(this.jobs.values());
    return {
      totalJobs: allJobs.length,
      pending: allJobs.filter(j => j.status === 'pending').length,
      processing: allJobs.filter(j => j.status === 'processing').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs,
      isProcessing: this.isProcessing,
    };
  }
}

// Create singleton instance
const backgroundProcessor = new BackgroundProcessorService();

// Cleanup old jobs every hour
setInterval(() => {
  backgroundProcessor.cleanupOldJobs();
}, 60 * 60 * 1000);

export { backgroundProcessor, BackgroundProcessorService };