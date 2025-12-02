// src/modules/projects/projects.routes.ts
import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";

import {
  addImageHandler,
  createProjectAdCopyHandler,
  createProjectHandler,
  deleteProjectAdCopyHandler,
  getProjectHandler,
  listProjectAdCopiesHandler,
  listProjectImagesHandler,
  listProjectsHandler,
  updateProjectAdCopyHandler,
  uploadMultipleProjectImagesHandler,
  uploadProjectImageHandler,
} from "./projects.controller";

const router = Router();

// Multer in-memory storage (same as before)
const upload = multer({ storage: multer.memoryStorage() });

// All project routes are protected
router.use(authMiddleware);

// ---- Projects ----
router.get("/", listProjectsHandler);
router.post("/", createProjectHandler);
router.get("/:id", getProjectHandler);

// ---- Project images (JSON URLs) ----
router.get("/:id/images", listProjectImagesHandler);
router.post("/:id/images", addImageHandler);

// ---- Project image uploads to S3 ----
// Single file: field name "file"
router.post(
  "/:id/images/upload",
  upload.single("file"),
  uploadProjectImageHandler
);

// Multiple files: field name "files"
router.post(
  "/:id/images/upload-multiple",
  upload.array("files"), // you can pass a max count: upload.array("files", 20)
  uploadMultipleProjectImagesHandler
);

// ---- Project ad copy ----
router.get("/:id/ad-copies", listProjectAdCopiesHandler);
router.post("/:id/ad-copies", createProjectAdCopyHandler);
router.patch("/:id/ad-copies/:adCopyId", updateProjectAdCopyHandler);
router.delete("/:id/ad-copies/:adCopyId", deleteProjectAdCopyHandler);

export default router;
