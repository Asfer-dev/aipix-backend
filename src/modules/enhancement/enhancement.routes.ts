import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  completeJobHandler,
  createEnhancementJobsHandler,
  listEnhancementJobsHandler,
} from "./enhancement.controller";

const router = Router();

router.use(authMiddleware);

// Create jobs for a set of images in a project
router.post("/jobs", createEnhancementJobsHandler);

// List jobs for a project
router.get("/projects/:projectId/jobs", listEnhancementJobsHandler);

// Dev helper: mark a job completed and create ENHANCED version
router.post("/jobs/:jobId/complete", completeJobHandler);

export default router;
