/**
 * Jobs Routes
 * API endpoints for job queue management
 */

import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
  requireLister,
} from "../../middleware/authMiddleware";
import {
  cancelJobHandler,
  createBatchJobsHandler,
  createJobHandler,
  getJobByIdHandler,
  getQueueStatusHandler,
  getUserJobsHandler,
} from "./jobs.controller";

const router = Router();

// All job routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /jobs
 * @desc    Create a new job
 * @access  LISTER, ADMIN
 */
router.post("/", requireLister, createJobHandler);

/**
 * @route   POST /jobs/batch
 * @desc    Create multiple jobs for multiple images
 * @access  LISTER, ADMIN
 */
router.post("/batch", requireLister, createBatchJobsHandler);

/**
 * @route   GET /jobs
 * @desc    Get user's jobs (with filters)
 * @access  LISTER, ADMIN
 */
router.get("/", requireLister, getUserJobsHandler);

/**
 * @route   GET /jobs/:id
 * @desc    Get job by ID
 * @access  LISTER, ADMIN
 */
router.get("/:id", requireLister, getJobByIdHandler);

/**
 * @route   POST /jobs/:id/cancel
 * @desc    Cancel a pending job
 * @access  LISTER, ADMIN
 */
router.post("/:id/cancel", requireLister, cancelJobHandler);

/**
 * @route   GET /jobs/queue/status
 * @desc    Get queue status and statistics
 * @access  ADMIN only
 */
router.get("/queue/status", requireAdmin, getQueueStatusHandler);

export default router;
