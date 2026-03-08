/**
 * Admin Controller
 * Handles all admin and moderation endpoints
 */

import { Request, Response } from "express";
import * as adminService from "./admin.service";
import * as moderationService from "./moderation.service";

// ==================== USER MANAGEMENT ====================

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const options: any = {};
    if (role !== undefined) options.role = role;
    if (status !== undefined) options.status = status;
    if (search !== undefined) options.search = search;
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    const result = await adminService.getAllUsers(options);

    return res.json(result);
  } catch (err) {
    console.error("getAllUsersHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserDetailsHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await adminService.getUserDetails(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("getUserDetailsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { role, emailVerified, displayName } = req.body;

    const updated = await adminService.updateUser(userId, {
      role,
      emailVerified,
      displayName,
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error("updateUserHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function adjustUserCreditsHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { amount, reason } = req.body;

    if (typeof amount !== "number" || !reason) {
      return res
        .status(400)
        .json({ error: "Amount (number) and reason required" });
    }

    const updated = await adminService.adjustUserCredits(
      userId,
      amount,
      reason,
    );

    return res.json({ subscription: updated });
  } catch (err: any) {
    if (err.message === "NO_ACTIVE_SUBSCRIPTION") {
      return res.status(400).json({ error: "User has no active subscription" });
    }
    console.error("adjustUserCreditsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserActivityHandler(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const activity = await adminService.getUserActivity(userId, limit);

    return res.json(activity);
  } catch (err) {
    console.error("getUserActivityHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ==================== JOB MANAGEMENT ====================

export async function getAllJobsHandler(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const options: any = {};
    if (status !== undefined) options.status = status;
    if (type !== undefined) options.type = type;
    if (userId !== undefined) options.userId = userId;
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    const result = await adminService.getAllJobs(options);

    return res.json(result);
  } catch (err) {
    console.error("getAllJobsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function retryJobHandler(req: Request, res: Response) {
  try {
    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const job = await adminService.retryJob(jobId);

    return res.json({ job });
  } catch (err: any) {
    if (err.message === "JOB_NOT_FOUND") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (err.message === "JOB_NOT_FAILED") {
      return res.status(400).json({ error: "Job is not in failed state" });
    }
    console.error("retryJobHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteJobHandler(req: Request, res: Response) {
  try {
    const jobId = Number(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    await adminService.deleteJob(jobId);

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteJobHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getJobMetricsHandler(req: Request, res: Response) {
  try {
    const metrics = await adminService.getJobMetrics();

    return res.json(metrics);
  } catch (err) {
    console.error("getJobMetricsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ==================== LISTING MANAGEMENT ====================

export async function getAllListingsHandler(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const isPublished =
      req.query.isPublished === "true"
        ? true
        : req.query.isPublished === "false"
          ? false
          : undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const options: any = {};
    if (status !== undefined) options.status = status;
    if (isPublished !== undefined) options.isPublished = isPublished;
    if (userId !== undefined) options.userId = userId;
    if (search !== undefined) options.search = search;
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    const result = await adminService.getAllListings(options);

    return res.json(result);
  } catch (err) {
    console.error("getAllListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateListingStatusHandler(req: Request, res: Response) {
  try {
    const listingId = Number(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const { status, isPublished } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await adminService.updateListingStatus(
      listingId,
      status,
      isPublished,
    );

    return res.json({ listing: updated });
  } catch (err) {
    console.error("updateListingStatusHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function unpublishListingHandler(req: Request, res: Response) {
  try {
    const listingId = Number(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const updated = await adminService.unpublishListing(listingId, reason);

    return res.json({ listing: updated });
  } catch (err) {
    console.error("unpublishListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ==================== BOOKING MANAGEMENT ====================

export async function getAllBookingsHandler(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const listingId = req.query.listingId
      ? Number(req.query.listingId)
      : undefined;
    const buyerId = req.query.buyerId ? Number(req.query.buyerId) : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const options: any = {};
    if (status !== undefined) options.status = status;
    if (listingId !== undefined) options.listingId = listingId;
    if (buyerId !== undefined) options.buyerId = buyerId;
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    const result = await adminService.getAllBookings(options);

    return res.json(result);
  } catch (err) {
    console.error("getAllBookingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function adminCancelBookingHandler(req: Request, res: Response) {
  try {
    const bookingId = Number(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const updated = await adminService.adminCancelBooking(bookingId, reason);

    return res.json({ booking: updated });
  } catch (err) {
    console.error("adminCancelBookingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ==================== ANALYTICS ====================

export async function getDashboardHandler(req: Request, res: Response) {
  try {
    const metrics = await adminService.getDashboardMetrics();

    return res.json(metrics);
  } catch (err) {
    console.error("getDashboardHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAnalyticsHandler(req: Request, res: Response) {
  try {
    const type = req.params.type as string;
    const days = req.query.days ? Number(req.query.days) : 30;

    const analytics = await adminService.getAnalytics(type, days);

    return res.json(analytics);
  } catch (err: any) {
    if (err.message === "INVALID_ANALYTICS_TYPE") {
      return res.status(400).json({ error: "Invalid analytics type" });
    }
    console.error("getAnalyticsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ==================== MODERATION ====================

export async function getReportedMessagesHandler(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const options: any = {};
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    const result = await moderationService.getReportedMessages(options);

    return res.json(result);
  } catch (err) {
    console.error("getReportedMessagesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getConversationForModerationHandler(
  req: Request,
  res: Response,
) {
  try {
    const listingId = Number(req.params.listingId);
    const userId1 = Number(req.params.userId1);
    const userId2 = Number(req.params.userId2);

    if (isNaN(listingId) || isNaN(userId1) || isNaN(userId2)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const messages = await moderationService.getConversationForModeration(
      listingId,
      userId1,
      userId2,
    );

    return res.json({ messages });
  } catch (err) {
    console.error("getConversationForModerationHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteMessageHandler(req: Request, res: Response) {
  try {
    const messageId = Number(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await moderationService.deleteMessage(
      messageId,
      userId,
      reason,
    );

    return res.json(result);
  } catch (err: any) {
    if (err.message === "MESSAGE_NOT_FOUND") {
      return res.status(404).json({ error: "Message not found" });
    }
    console.error("deleteMessageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSpamActivityHandler(req: Request, res: Response) {
  try {
    // TODO: Re-implement spam detection logic for AI moderation
    return res.json({ highVolumeUsers: [], duplicateMessages: [] });
  } catch (err) {
    console.error("getSpamActivityHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFlaggedListingsHandler(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await moderationService.getFlaggedListings({ page, limit });

    return res.json(result);
  } catch (err) {
    console.error("getFlaggedListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveListingHandler(req: Request, res: Response) {
  try {
    const listingId = Number(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notes } = req.body;

    const listing = await moderationService.approveListing(
      listingId,
      userId,
      notes,
    );

    return res.json({ listing });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    console.error("approveListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function rejectListingHandler(req: Request, res: Response) {
  try {
    const listingId = Number(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const listing = await moderationService.rejectListing(
      listingId,
      userId,
      reason,
    );

    return res.json({ listing });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    console.error("rejectListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFlaggedMessagesHandler(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await moderationService.getFlaggedMessages({ page, limit });

    return res.json(result);
  } catch (err) {
    console.error("getFlaggedMessagesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveMessageHandler(req: Request, res: Response) {
  try {
    const messageId = Number(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notes } = req.body;

    const message = await moderationService.approveMessage(
      messageId,
      userId,
      notes,
    );

    return res.json({ message });
  } catch (err: any) {
    if (err.message === "MESSAGE_NOT_FOUND") {
      return res.status(404).json({ error: "Message not found" });
    }
    console.error("approveMessageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function restrictUserMessagingHandler(
  req: Request,
  res: Response,
) {
  try {
    // TODO: Re-implement user restriction for AI moderation system
    const userId = Number(req.params.userId);
    const { reason } = req.body;
    return res.json({
      success: true,
      userId,
      reason,
      message: "Feature pending",
    });
  } catch (err) {
    console.error("restrictUserMessagingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getModerationStatsHandler(req: Request, res: Response) {
  try {
    // TODO: Re-implement stats based on ModerationLog table
    const stats = { flaggedListings: 0, flaggedMessages: 0, totalReviewed: 0 };
    return res.json(stats);
  } catch (err) {
    console.error("getModerationStatsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserModerationHistoryHandler(
  req: Request,
  res: Response,
) {
  try {
    // TODO: Re-implement based on ModerationLog queries
    const userId = Number(req.params.userId);
    const history = { moderationLogs: [], summary: {} };
    return res.json(history);
  } catch (err) {
    console.error("getUserModerationHistoryHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function bulkModerateContentHandler(req: Request, res: Response) {
  try {
    // TODO: Re-implement bulk actions using new moderation system
    const { ids } = req.body;
    return res.json({ success: true, affected: ids?.length || 0 });
  } catch (err) {
    console.error("bulkModerateContentHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
