import { Request, Response } from "express";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  createEnhancementJobsForImages,
  listEnhancementJobsForProject,
  markJobCompleted,
} from "./enhancement.service";

export async function createEnhancementJobsHandler(
  req: Request,
  res: Response
) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { projectId, imageIds } = req.body;

    if (!projectId || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        error: "projectId and non-empty imageIds array are required",
      });
    }

    const jobs = await createEnhancementJobsForImages(
      user.id,
      Number(projectId),
      imageIds.map(Number)
    );

    return res.status(201).json({ jobs });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "INVALID_IMAGES") {
      return res
        .status(400)
        .json({ error: "Some images do not belong to project" });
    }
    if (err.message === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(402).json({ error: "No active subscription" });
    }
    if (err.message === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({ error: "Insufficient AI credits" });
    }

    console.error("createEnhancementJobsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listEnhancementJobsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const jobs = await listEnhancementJobsForProject(user.id, projectId);
    return res.json({ jobs });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }

    console.error("listEnhancementJobsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// debug/dev only: mark a job as completed
export async function completeJobHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const { enhancedUrl } = req.body;
    if (!enhancedUrl) {
      return res.status(400).json({ error: "enhancedUrl is required" });
    }

    const job = await markJobCompleted(user.id, jobId, enhancedUrl);
    return res.json({ job });
  } catch (err: any) {
    if (err.message === "JOB_NOT_FOUND") {
      return res.status(404).json({ error: "Job not found" });
    }

    console.error("completeJobHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
