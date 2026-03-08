/**
 * Job Queue Service
 * Manages sequential processing of AI jobs with credits-based billing
 */

import { JobStatus, JobType } from "@prisma/client";
import { EventEmitter } from "events";
import { aiServiceClient } from "../lib/ai-service-client";
import prisma from "../prisma";

export interface CreateJobInput {
  userId: number;
  projectId: number;
  imageId: number;
  type: JobType;
  priority?: number;
  estimatedCredits?: number;
  inputParameters?: Record<string, any>;
}

export interface JobWithDetails {
  id: number;
  type: JobType;
  status: JobStatus;
  priority: number;
  queuePosition?: number;
  estimatedCredits: number | null;
  creditsCharged: number | null;
  processingTimeMs: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  resultUrl: string | null;
  errorMessage: string | null;
}

class JobQueueService extends EventEmitter {
  private isProcessing = false;
  private currentJobId: number | null = null;
  private processIntervalMs = 1000; // Check queue every second

  constructor() {
    super();
  }

  /**
   * Create a new job and add it to the queue
   */
  async createJob(input: CreateJobInput): Promise<JobWithDetails> {
    // 1. Verify user has active subscription
    const subscription = await this.getUserActiveSubscription(input.userId);
    if (!subscription) {
      throw new Error("NO_ACTIVE_SUBSCRIPTION");
    }

    // 2. Estimate credits needed (default: 10 credits, will be adjusted after processing)
    const estimatedCredits = input.estimatedCredits || 10;

    // 3. Check if user has enough credits
    const remainingCredits = await this.getRemainingCredits(subscription.id);
    if (remainingCredits < estimatedCredits) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    // 4. Verify image belongs to project and project belongs to user
    const image = await prisma.image.findFirst({
      where: {
        id: input.imageId,
        projectId: input.projectId,
        project: {
          userId: input.userId,
        },
      },
    });

    if (!image) {
      throw new Error("IMAGE_NOT_FOUND_OR_FORBIDDEN");
    }

    // 5. Create job
    const job = await prisma.job.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        imageId: input.imageId,
        type: input.type,
        status: "PENDING",
        priority: input.priority || 0,
        estimatedCredits,
        inputParameters: input.inputParameters || {},
      },
    });

    // 6. Start processing queue if not already running
    this.startProcessing();

    return this.formatJobResponse(job);
  }

  /**
   * Start processing jobs from queue
   */
  startProcessing() {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;
    this.processNextJob();
  }

  /**
   * Stop processing queue (graceful shutdown)
   */
  async stopProcessing() {
    this.isProcessing = false;

    // Wait for current job to finish if any
    if (this.currentJobId) {
      console.log(`Waiting for job ${this.currentJobId} to complete...`);
      await this.waitForJobCompletion(this.currentJobId);
    }
  }

  /**
   * Process next job in queue
   */
  private async processNextJob() {
    if (!this.isProcessing) {
      return;
    }

    try {
      // Get next job from queue (ordered by priority desc, then created date asc)
      const nextJob = await prisma.job.findFirst({
        where: {
          status: "PENDING",
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          user: true,
          image: true,
          project: true,
        },
      });

      if (!nextJob) {
        // No jobs in queue, check again after interval
        setTimeout(() => this.processNextJob(), this.processIntervalMs);
        return;
      }

      // Mark job as queued, then process it
      this.currentJobId = nextJob.id;
      await this.processJob(nextJob);
      this.currentJobId = null;

      // Immediately check for next job
      setImmediate(() => this.processNextJob());
    } catch (error: any) {
      console.error("Error in processNextJob:", error);

      // Continue processing other jobs
      setTimeout(() => this.processNextJob(), this.processIntervalMs);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: any) {
    const startTime = Date.now();

    try {
      // 1. Update job status to QUEUED
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "QUEUED",
          queuedAt: new Date(),
        },
      });

      // 2. Verify user still has credits
      const subscription = await this.getUserActiveSubscription(job.userId);
      if (!subscription) {
        throw new Error("NO_ACTIVE_SUBSCRIPTION");
      }

      const remainingCredits = await this.getRemainingCredits(subscription.id);
      if (remainingCredits < (job.estimatedCredits || 10)) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      // 3. Update job status to RUNNING
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });

      this.emit("job:started", {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
      });

      // 4. Call AI service (or use mock for testing)
      let aiResponse;
      const useMockProcessing = process.env.USE_MOCK_AI === "true" || !process.env.AI_SERVICE_URL;

      if (useMockProcessing) {
        // Mock AI processing for testing (10 second delay)
        console.log(`🎭 Mock processing job ${job.id} - waiting 10 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));

        aiResponse = {
          success: true,
          jobId: job.id,
          resultUrl: job.image.originalUrl, // Use original as "enhanced"
          processingTimeMs: 10000,
          metadata: {
            mock: true,
            message: "Mock AI processing - original image returned as enhanced",
            confidence: 1.0,
          },
        };
        console.log(`✅ Mock processing complete for job ${job.id}`);
      } else {
        // Real AI service call
        aiResponse = await aiServiceClient.processJob(job.type, {
          jobId: job.id,
          jobType: job.type,
          imageUrl: job.image.originalUrl,
          parameters: job.inputParameters || {},
        });
      }

      const processingTimeMs = Date.now() - startTime;

      if (!aiResponse.success) {
        // AI processing failed
        await this.handleJobFailure(
          job.id,
          aiResponse.error!,
          aiResponse.errorCode,
          processingTimeMs,
        );
        return;
      }

      // 5. Calculate credits charged based on processing time
      const creditsCharged = await this.calculateCredits(
        subscription.planId,
        job.type,
        aiResponse.processingTimeMs || processingTimeMs,
      );

      // 6. Update job and charge credits in transaction
      await prisma.$transaction(async (tx) => {
        // Update job status
        await tx.job.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            processingTimeMs: aiResponse.processingTimeMs || processingTimeMs,
            creditsCharged,
            ...(aiResponse.resultUrl && { resultUrl: aiResponse.resultUrl }),
            outputMetadata: aiResponse.metadata || {},
          },
        });

        // Charge credits and update usage record
        await tx.creditUsage.create({
          data: {
            subscriptionId: subscription.id,
            jobId: job.id,
            creditsUsed: creditsCharged,
            processingTimeMs: aiResponse.processingTimeMs || processingTimeMs,
            jobType: job.type,
            reason: `${job.type} job completed`,
          },
        });

        // Update subscription's current credits used (direct tracking)
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            currentCreditsUsed: { increment: creditsCharged },
          },
        });

        // Create enhanced image version if result URL exists
        if (aiResponse.resultUrl) {
          await tx.imageVersion.create({
            data: {
              imageId: job.imageId,
              type: job.type === "VIRTUAL_STAGING" ? "STAGED" : "ENHANCED",
              url: aiResponse.resultUrl,
              metadata: aiResponse.metadata || {},
            },
          });
        }
      });

      this.emit("job:completed", {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        creditsCharged,
        processingTimeMs: aiResponse.processingTimeMs || processingTimeMs,
      });

      console.log(
        `✅ Job ${job.id} completed in ${processingTimeMs}ms, charged ${creditsCharged} credits`,
      );
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      // Check if this is a retryable error
      const shouldRetry = this.shouldRetryJob(error, job);

      if (shouldRetry && job.retryCount < job.maxRetries) {
        await this.retryJob(job.id);
      } else {
        await this.handleJobFailure(
          job.id,
          error.message,
          error.code,
          processingTimeMs,
        );
      }
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(
    jobId: number,
    errorMessage: string,
    errorCode?: string,
    processingTimeMs?: number,
  ) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
        errorCode: errorCode || "UNKNOWN_ERROR",
        ...(processingTimeMs !== undefined && { processingTimeMs }),
      },
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    this.emit("job:failed", {
      jobId,
      userId: job?.userId,
      type: job?.type,
      errorMessage,
      errorCode,
    });

    console.error(`❌ Job ${jobId} failed: ${errorMessage}`);
  }

  /**
   * Retry a failed job
   */
  private async retryJob(jobId: number) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        retryCount: { increment: 1 },
        queuedAt: null,
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        errorCode: null,
      },
    });

    console.log(`🔄 Job ${jobId} scheduled for retry`);
  }

  /**
   * Determine if job should be retried
   */
  private shouldRetryJob(error: any, job: any): boolean {
    const retryableErrors = [
      "AI_SERVICE_TIMEOUT",
      "AI_SERVICE_UNAVAILABLE",
      "NETWORK_ERROR",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];

    return (
      retryableErrors.includes(error.code) ||
      retryableErrors.includes(error.errorCode)
    );
  }

  /**
   * Calculate credits based on processing time and job type
   */
  private async calculateCredits(
    planId: number,
    jobType: JobType,
    processingTimeMs: number,
  ): Promise<number> {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new Error("PLAN_NOT_FOUND");
    }

    const processingTimeSeconds = processingTimeMs / 1000;

    let creditsPerSecond = 0.1; // Default

    switch (jobType) {
      case "ENHANCEMENT":
      case "HDR_PROCESSING":
        creditsPerSecond = Number(plan.enhancementCreditsPerSecond);
        break;
      case "VIRTUAL_STAGING":
        creditsPerSecond = Number(plan.virtualStagingCreditsPerSecond);
        break;
      case "AD_GENERATION":
        creditsPerSecond = Number(plan.adGenerationCreditsPerSecond);
        break;
      case "BACKGROUND_REMOVAL":
      case "SKY_REPLACEMENT":
        creditsPerSecond = Number(plan.enhancementCreditsPerSecond) * 0.8; // 20% discount
        break;
    }

    const credits = Math.ceil(processingTimeSeconds * creditsPerSecond);
    return Math.max(1, credits); // Minimum 1 credit
  }

  /**
   * Get user's active subscription
   */
  private async getUserActiveSubscription(userId: number) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Get remaining credits for a subscription
   */
  private async getRemainingCredits(subscriptionId: number): Promise<number> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return 0;
    }

    // Use direct tracking field for quick access
    return subscription.plan.maxAiCredits - subscription.currentCreditsUsed;
  }

  /**
   * Wait for job completion (for graceful shutdown)
   */
  private async waitForJobCompletion(
    jobId: number,
    timeoutMs = 60000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });

      if (
        !job ||
        job.status === "COMPLETED" ||
        job.status === "FAILED" ||
        job.status === "CANCELLED"
      ) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.warn(`Job ${jobId} did not complete within timeout`);
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const [pending, running, completed, failed] = await Promise.all([
      prisma.job.count({ where: { status: "PENDING" } }),
      prisma.job.count({ where: { status: "RUNNING" } }),
      prisma.job.count({ where: { status: "COMPLETED" } }),
      prisma.job.count({ where: { status: "FAILED" } }),
    ]);

    const avgProcessingTime = await prisma.job.aggregate({
      where: {
        status: "COMPLETED",
        processingTimeMs: { not: null },
      },
      _avg: { processingTimeMs: true },
    });

    return {
      pending,
      running,
      completed,
      failed,
      isProcessing: this.isProcessing,
      currentJobId: this.currentJobId,
      averageProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0,
    };
  }

  /**
   * Get user's job queue
   */
  async getUserJobs(
    userId: number,
    options?: {
      status?: JobStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<JobWithDetails[]> {
    const jobs = await prisma.job.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: [{ createdAt: "desc" }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    // Calculate queue position for pending jobs
    const pendingJobs = await prisma.job.findMany({
      where: { status: "PENDING" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    const queuePositions = new Map(
      pendingJobs.map((job, index) => [job.id, index + 1]),
    );

    return jobs.map((job) => ({
      ...this.formatJobResponse(job),
      queuePosition: queuePositions.get(job.id) ?? 0,
    }));
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: number, userId: number): Promise<void> {
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    if (job.status !== "PENDING") {
      throw new Error("JOB_CANNOT_BE_CANCELLED");
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    this.emit("job:cancelled", { jobId, userId });
  }

  /**
   * Format job response
   */
  private formatJobResponse(job: any): JobWithDetails {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      estimatedCredits: job.estimatedCredits,
      creditsCharged: job.creditsCharged,
      processingTimeMs: job.processingTimeMs,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      resultUrl: job.resultUrl,
      errorMessage: job.errorMessage,
    };
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();
