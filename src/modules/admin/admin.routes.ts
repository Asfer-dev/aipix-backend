/**
 * Admin Routes
 * All admin and moderation endpoints
 */

import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
  requireModeratorOrAdmin,
} from "../../middleware/authMiddleware";
import {
  adjustUserCreditsHandler,
  adminCancelBookingHandler,
  approveListingHandler,
  approveMessageHandler,
  bulkModerateContentHandler,
  deleteJobHandler,
  deleteMessageHandler,
  // Booking Management
  getAllBookingsHandler,
  // Job Management
  getAllJobsHandler,
  // Listing Management
  getAllListingsHandler,
  // User Management
  getAllUsersHandler,
  getAnalyticsHandler,
  getConversationForModerationHandler,
  // Analytics
  getDashboardHandler,
  getFlaggedListingsHandler,
  getFlaggedMessagesHandler,
  getJobMetricsHandler,
  getModerationStatsHandler,
  // Moderation
  getReportedMessagesHandler,
  getSpamActivityHandler,
  getUserActivityHandler,
  getUserDetailsHandler,
  getUserModerationHistoryHandler,
  rejectListingHandler,
  restrictUserMessagingHandler,
  retryJobHandler,
  unpublishListingHandler,
  updateListingStatusHandler,
  updateUserHandler,
} from "./admin.controller";

const router = Router();

// All admin routes require authentication
router.use(authMiddleware);

// ==================== DASHBOARD & ANALYTICS (ADMIN) ====================
router.get("/dashboard", requireAdmin, getDashboardHandler);
router.get("/analytics/:type", requireAdmin, getAnalyticsHandler);

// ==================== USER MANAGEMENT (ADMIN) ====================
router.get("/users", requireAdmin, getAllUsersHandler);
router.get("/users/:userId", requireAdmin, getUserDetailsHandler);
router.patch("/users/:userId", requireAdmin, updateUserHandler);
router.post("/users/:userId/credits", requireAdmin, adjustUserCreditsHandler);
router.get("/users/:userId/activity", requireAdmin, getUserActivityHandler);

// ==================== JOB MANAGEMENT (ADMIN) ====================
router.get("/jobs", requireAdmin, getAllJobsHandler);
router.post("/jobs/:jobId/retry", requireAdmin, retryJobHandler);
router.delete("/jobs/:jobId", requireAdmin, deleteJobHandler);
router.get("/jobs/metrics", requireAdmin, getJobMetricsHandler);

// ==================== LISTING MANAGEMENT (ADMIN) ====================
router.get("/listings", requireAdmin, getAllListingsHandler);
router.patch(
  "/listings/:listingId/status",
  requireAdmin,
  updateListingStatusHandler,
);
router.post(
  "/listings/:listingId/unpublish",
  requireAdmin,
  unpublishListingHandler,
);

// ==================== BOOKING MANAGEMENT (ADMIN) ====================
router.get("/bookings", requireAdmin, getAllBookingsHandler);
router.post(
  "/bookings/:bookingId/cancel",
  requireAdmin,
  adminCancelBookingHandler,
);

// ==================== MODERATION (ADMIN & MODERATOR) ====================
router.get(
  "/moderation/messages/reported",
  requireModeratorOrAdmin,
  getReportedMessagesHandler,
);
router.get(
  "/moderation/messages/:listingId/:userId1/:userId2",
  requireModeratorOrAdmin,
  getConversationForModerationHandler,
);
router.delete(
  "/moderation/messages/:messageId",
  requireModeratorOrAdmin,
  deleteMessageHandler,
);
router.get("/moderation/spam", requireModeratorOrAdmin, getSpamActivityHandler);
router.get(
  "/moderation/listings/flagged",
  requireModeratorOrAdmin,
  getFlaggedListingsHandler,
);
router.post(
  "/moderation/listings/:listingId/approve",
  requireModeratorOrAdmin,
  approveListingHandler,
);
router.post(
  "/moderation/listings/:listingId/reject",
  requireModeratorOrAdmin,
  rejectListingHandler,
);
router.get(
  "/moderation/messages/flagged",
  requireModeratorOrAdmin,
  getFlaggedMessagesHandler,
);
router.post(
  "/moderation/messages/:messageId/approve",
  requireModeratorOrAdmin,
  approveMessageHandler,
);
router.post(
  "/moderation/users/:userId/restrict-messaging",
  requireAdmin,
  restrictUserMessagingHandler,
);
router.get(
  "/moderation/stats",
  requireModeratorOrAdmin,
  getModerationStatsHandler,
);
router.get(
  "/moderation/users/:userId/history",
  requireModeratorOrAdmin,
  getUserModerationHistoryHandler,
);
router.post(
  "/moderation/bulk",
  requireModeratorOrAdmin,
  bulkModerateContentHandler,
);

export default router;
