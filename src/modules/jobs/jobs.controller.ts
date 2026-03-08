/**
 * Jobs Controller
 * Handles job queue management and monitoring
 */

import { JobType } from "@prisma/client";
import { Request, Response } from "express";
import { jobQueueService } from "../../services/job-queue.service";

/**
 * Create a new job
 */
export async function createJobHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { projectId, imageId, type, priority, estimatedCredits, parameters } =
      req.body;

    // Validate job type
    if (!Object.values(JobType).includes(type)) {
      return res.status(400).json({
        error: "INVALID_JOB_TYPE",
        message: `Job type must be one of: ${Object.values(JobType).join(", ")}`,
      });
    }

    // Validate required fields
    if (!projectId || !imageId) {
      return res.status(400).json({
        error: "MISSING_FIELDS",
        message: "projectId and imageId are required",
      });
    }

    const job = await jobQueueService.createJob({
      userId,
      projectId: Number(projectId),
      imageId: Number(imageId),
      type,
      priority: priority ? Number(priority) : undefined,
      estimatedCredits: estimatedCredits ? Number(estimatedCredits) : undefined,
      inputParameters: parameters,
    });

    return res.status(201).json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error("Create job error:", error);

    if (error.message === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(402).json({
        error: "NO_ACTIVE_SUBSCRIPTION",
        message: "You need an active subscription to create jobs",
      });
    }

    if (error.message === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({
        error: "INSUFFICIENT_CREDITS",
        message: "Not enough credits to process this job",
      });
    }

    if (error.message === "IMAGE_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({
        error: "IMAGE_NOT_FOUND",
        message: "Image not found or you do not have access",
      });
    }

    return res.status(500).json({
      error: "JOB_CREATION_FAILED",
      message: "Failed to create job",
    });
  }
}

/**
 * Get user's jobs
 */
export async function getUserJobsHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { status, limit, offset } = req.query;

    const jobs = await jobQueueService.getUserJobs(userId, {
      status: status as any,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return res.json({
      success: true,
      jobs,
      count: jobs.length,
    });
  } catch (error: any) {
    console.error("Get user jobs error:", error);
    return res.status(500).json({
      error: "FETCH_JOBS_FAILED",
      message: "Failed to fetch jobs",
    });
  }
}

/**
 * Get job by ID
 */
export async function getJobByIdHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const jobId = Number(req.params.id);

    const jobs = await jobQueueService.getUserJobs(userId, {
      limit: 1,
    });

    const job = jobs.find((j) => j.id === jobId);

    if (!job) {
      return res.status(404).json({
        error: "JOB_NOT_FOUND",
        message: "Job not found or you do not have access",
      });
    }

    return res.json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error("Get job error:", error);
    return res.status(500).json({
      error: "FETCH_JOB_FAILED",
      message: "Failed to fetch job",
    });
  }
}

/**
 * Cancel a pending job
 */
export async function cancelJobHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const jobId = Number(req.params.id);

    await jobQueueService.cancelJob(jobId, userId);

    return res.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error: any) {
    console.error("Cancel job error:", error);

    if (error.message === "JOB_NOT_FOUND") {
      return res.status(404).json({
        error: "JOB_NOT_FOUND",
        message: "Job not found or you do not have access",
      });
    }

    if (error.message === "JOB_CANNOT_BE_CANCELLED") {
      return res.status(400).json({
        error: "JOB_CANNOT_BE_CANCELLED",
        message: "Only pending jobs can be cancelled",
      });
    }

    return res.status(500).json({
      error: "CANCEL_JOB_FAILED",
      message: "Failed to cancel job",
    });
  }
}

/**
 * Get queue status (ADMIN only)
 */
export async function getQueueStatusHandler(req: Request, res: Response) {
  try {
    const status = await jobQueueService.getQueueStatus();

    return res.json({
      success: true,
      queue: status,
    });
  } catch (error: any) {
    console.error("Get queue status error:", error);
    return res.status(500).json({
      error: "FETCH_QUEUE_STATUS_FAILED",
      message: "Failed to fetch queue status",
    });
  }
}

/**
 * Batch create jobs for multiple images
 */
export async function createBatchJobsHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { projectId, imageIds, type, priority, parameters } = req.body;

    if (
      !projectId ||
      !imageIds ||
      !Array.isArray(imageIds) ||
      imageIds.length === 0
    ) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "projectId and imageIds array are required",
      });
    }

    if (!Object.values(JobType).includes(type)) {
      return res.status(400).json({
        error: "INVALID_JOB_TYPE",
        message: `Job type must be one of: ${Object.values(JobType).join(", ")}`,
      });
    }

    // Create jobs for each image
    const jobs = await Promise.all(
      imageIds.map((imageId) =>
        jobQueueService.createJob({
          userId,
          projectId: Number(projectId),
          imageId: Number(imageId),
          type,
          priority: priority ? Number(priority) : undefined,
          inputParameters: parameters,
        }),
      ),
    );

    return res.status(201).json({
      success: true,
      jobs,
      count: jobs.length,
    });
  } catch (error: any) {
    console.error("Create batch jobs error:", error);

    if (error.message === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(402).json({
        error: "NO_ACTIVE_SUBSCRIPTION",
        message: "You need an active subscription to create jobs",
      });
    }

    if (error.message === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({
        error: "INSUFFICIENT_CREDITS",
        message: "Not enough credits to process these jobs",
      });
    }

    return res.status(500).json({
      error: "BATCH_JOB_CREATION_FAILED",
      message: "Failed to create batch jobs",
    });
  }
}
