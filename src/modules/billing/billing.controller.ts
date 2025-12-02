import { Request, Response } from "express";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  createPlan,
  getAllPlans,
  getUserActiveSubscription,
  getUserUsageSummary,
  subscribeUserToPlan,
  updatePlan,
} from "./billing.service";

export async function getPlansHandler(req: Request, res: Response) {
  try {
    const plans = await getAllPlans();
    return res.json({ plans });
  } catch (err) {
    console.error("getPlansHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMySubscriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sub = await getUserActiveSubscription(user.id);
    if (!sub) {
      return res.json({ subscription: null });
    }

    return res.json({ subscription: sub });
  } catch (err) {
    console.error("getMySubscriptionHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function subscribeHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { planId } = req.body;
    if (!planId || isNaN(Number(planId))) {
      return res
        .status(400)
        .json({ error: "planId is required and must be a number" });
    }

    const sub = await subscribeUserToPlan(user.id, Number(planId));
    return res.status(201).json({ subscription: sub });
  } catch (err: any) {
    if (err.message === "PLAN_NOT_FOUND") {
      return res.status(404).json({ error: "Plan not found" });
    }

    console.error("subscribeHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyUsageHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const summary = await getUserUsageSummary(user.id);
    return res.json({ usage: summary });
  } catch (err: any) {
    if (err.message === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(404).json({ error: "No active subscription" });
    }

    console.error("getMyUsageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** Admin handlers */

export async function createPlanHandler(req: Request, res: Response) {
  try {
    const { name, description, monthlyPriceUsd, maxAiCredits, maxStorageMb } =
      req.body;

    if (
      !name ||
      monthlyPriceUsd == null ||
      maxAiCredits == null ||
      maxStorageMb == null
    ) {
      return res.status(400).json({
        error: "name, monthlyPriceUsd, maxAiCredits, maxStorageMb are required",
      });
    }

    const plan = await createPlan({
      name,
      description,
      monthlyPriceUsd: Number(monthlyPriceUsd),
      maxAiCredits: Number(maxAiCredits),
      maxStorageMb: Number(maxStorageMb),
    });

    return res.status(201).json({ plan });
  } catch (err) {
    console.error("createPlanHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updatePlanHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid plan id" });
    }

    const { name, description, monthlyPriceUsd, maxAiCredits, maxStorageMb } =
      req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (monthlyPriceUsd != null)
      updates.monthlyPriceUsd = Number(monthlyPriceUsd);
    if (maxAiCredits != null) updates.maxAiCredits = Number(maxAiCredits);
    if (maxStorageMb != null) updates.maxStorageMb = Number(maxStorageMb);

    const plan = await updatePlan(id, updates);

    return res.json({ plan });
  } catch (err) {
    console.error("updatePlanHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
