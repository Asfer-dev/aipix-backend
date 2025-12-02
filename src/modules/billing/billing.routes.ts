import { Router } from "express";
import { authMiddleware, requireAdmin } from "../../middleware/authMiddleware";
import {
  createPlanHandler,
  getMySubscriptionHandler,
  getMyUsageHandler,
  getPlansHandler,
  subscribeHandler,
  updatePlanHandler,
} from "./billing.controller";

const router = Router();

// All billing routes require authentication
router.use(authMiddleware);

// List available plans (for logged-in users)
router.get("/plans", getPlansHandler);

// Get current user's active subscription
router.get("/me/subscription", getMySubscriptionHandler);

// Subscribe / change plan
router.post("/subscribe", subscribeHandler);

// Current user's usage summary (credits)
router.get("/me/usage", getMyUsageHandler);

// Admin-only: create/update plans
router.post("/plans", requireAdmin, createPlanHandler);
router.patch("/plans/:id", requireAdmin, updatePlanHandler);

export default router;
