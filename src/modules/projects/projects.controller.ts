import { Request, Response } from "express";
import { uploadBufferToS3 } from "../../lib/s3";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  addImageToProject,
  createProjectAdCopyForUser,
  createProjectForUser,
  deleteProjectAdCopyForUser,
  getProjectForUser,
  listImagesForProject,
  // NEW:
  listProjectAdCopiesForUser,
  listProjectsForUser,
  updateProjectAdCopyForUser,
} from "./projects.service";

export async function listProjectsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projects = await listProjectsForUser(user.id);
    return res.json({ projects });
  } catch (err) {
    console.error("listProjectsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProjectHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { name, clientName, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const project = await createProjectForUser(
      user.id,
      name,
      clientName,
      notes
    );

    return res.status(201).json({ project });
  } catch (err) {
    console.error("createProjectHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProjectHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const project = await getProjectForUser(user.id, projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // project already includes adCopies from the service include
    return res.json({ project });
  } catch (err) {
    console.error("getProjectHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function addImageHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { originalUrl, label } = req.body;
    if (!originalUrl) {
      return res.status(400).json({ error: "originalUrl is required" });
    }

    const image = await addImageToProject(
      user.id,
      projectId,
      originalUrl,
      label
    );

    return res.status(201).json({ image });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }

    console.error("addImageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listProjectImagesHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const images = await listImagesForProject(user.id, projectId);
    return res.json({ images });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }

    console.error("listProjectImagesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * =========================
 * PROJECT AD COPY HANDLERS
 * =========================
 */

export async function listProjectAdCopiesHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const adCopies = await listProjectAdCopiesForUser(user.id, projectId);
    return res.json({ adCopies });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }

    console.error("listProjectAdCopiesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProjectAdCopyHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { channel, title, description, keywords } = req.body;

    if (!channel || !title || !description) {
      return res
        .status(400)
        .json({ error: "channel, title and description are required" });
    }

    const adCopy = await createProjectAdCopyForUser(user.id, projectId, {
      channel,
      title,
      description,
      keywords,
    });

    return res.status(201).json({ adCopy });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }

    console.error("createProjectAdCopyHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProjectAdCopyHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    const adCopyId = Number(req.params.adCopyId);

    if (isNaN(projectId) || isNaN(adCopyId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const { channel, title, description, keywords } = req.body;

    const updated = await updateProjectAdCopyForUser(
      user.id,
      projectId,
      adCopyId,
      { channel, title, description, keywords }
    );

    return res.json({ adCopy: updated });
  } catch (err: any) {
    if (err.message === "AD_COPY_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Ad copy not found" });
    }

    console.error("updateProjectAdCopyHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteProjectAdCopyHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    const adCopyId = Number(req.params.adCopyId);

    if (isNaN(projectId) || isNaN(adCopyId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await deleteProjectAdCopyForUser(user.id, projectId, adCopyId);

    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "AD_COPY_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Ad copy not found" });
    }

    console.error("deleteProjectAdCopyHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function uploadProjectImageHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const file = req.file;
    const label = (req.body.label as string | undefined) || undefined;

    if (!file) {
      return res.status(400).json({ error: "file is required" });
    }

    const ext = file.originalname.split(".").pop() || "bin";

    // 👇 everything goes under this “folder” in the bucket
    const basePrefix = "aipix/uploads"; // change to whatever folder you want

    const key = `${basePrefix}/users/${
      user.id
    }/projects/${projectId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const url = await uploadBufferToS3({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    const image = await addImageToProject(user.id, projectId, url, label);

    return res.status(201).json({ image });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "S3_BUCKET_NAME_NOT_CONFIGURED") {
      return res.status(500).json({ error: "Storage not configured" });
    }

    console.error("uploadProjectImageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function uploadMultipleProjectImagesHandler(
  req: Request,
  res: Response
) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const label = (req.body.label as string | undefined) || undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "files are required" });
    }

    const basePrefix = "aipix/uploads"; // same folder prefix

    const images = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split(".").pop() || "bin";

        const key = `${basePrefix}/users/${
          user.id
        }/projects/${projectId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const url = await uploadBufferToS3({
          key,
          buffer: file.buffer,
          contentType: file.mimetype,
        });

        // reuse existing logic to create Image + ORIGINAL ImageVersion
        const image = await addImageToProject(
          user.id,
          projectId,
          url,
          label ?? file.originalname
        );

        return image;
      })
    );

    return res.status(201).json({ images });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "S3_BUCKET_NAME_NOT_CONFIGURED") {
      return res.status(500).json({ error: "Storage not configured" });
    }

    console.error("uploadMultipleProjectImagesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
