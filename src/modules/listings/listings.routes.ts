import { Router } from "express";
import { authMiddleware, requireLister } from "../../middleware/authMiddleware";
import {
  // Favorites endpoints
  addFavoriteHandler,
  attachMediaHandler,
  cancelBookingHandler,
  // Bookings endpoints
  createBookingHandler,
  // Lister endpoints
  createListingHandler,
  createListingWithMediaHandler,
  getBookingByIdHandler,
  getBuyerBookingsHandler,
  getFeaturedListingsHandler,
  getListerBookingsHandler,
  getListingConversationHandler,
  getMarketplaceListingHandler,
  getMyListingHandler,
  getSearchSuggestionsHandler,
  getSimilarListingsHandler,
  getUserConversationsHandler,
  getUserFavoritesHandler,
  listMyListingsHandler,
  publishListingHandler,
  removeFavoriteHandler,
  // Marketplace endpoints
  searchMarketplaceHandler,
  // Messages endpoints
  sendMessageHandler,
  updateBookingStatusHandler,
  updateListingHandler,
} from "./listings.controller";

const router = Router();

// ==================== PUBLIC MARKETPLACE ROUTES ====================
// Advanced search with filtering
router.get("/marketplace/search", searchMarketplaceHandler);

// Featured listings (homepage)
router.get("/marketplace/featured", getFeaturedListingsHandler);

// Search suggestions (autocomplete)
router.get("/marketplace/suggestions", getSearchSuggestionsHandler);

// Get single listing detail
router.get("/marketplace/listings/:id", getMarketplaceListingHandler);

// Get similar listings
router.get("/marketplace/listings/:id/similar", getSimilarListingsHandler);

// ==================== LISTER ROUTES (Protected) ====================
// My listings
router.get("/", authMiddleware, requireLister, listMyListingsHandler);
router.post("/", authMiddleware, requireLister, createListingHandler);
router.post(
  "/listings-with-media",
  authMiddleware,
  requireLister,
  createListingWithMediaHandler,
);
router.get("/:id", authMiddleware, requireLister, getMyListingHandler);
router.patch("/:id", authMiddleware, requireLister, updateListingHandler);
router.post(
  "/:id/publish",
  authMiddleware,
  requireLister,
  publishListingHandler,
);
router.post("/:id/media", authMiddleware, requireLister, attachMediaHandler);

// Lister's bookings
router.get(
  "/bookings/received",
  authMiddleware,
  requireLister,
  getListerBookingsHandler,
);
router.patch(
  "/bookings/:id/status",
  authMiddleware,
  requireLister,
  updateBookingStatusHandler,
);

// ==================== BUYER/USER ROUTES (Protected) ====================
// Favorites
router.post("/favorites", authMiddleware, addFavoriteHandler);
router.delete("/favorites/:listingId", authMiddleware, removeFavoriteHandler);
router.get("/favorites", authMiddleware, getUserFavoritesHandler);

// Bookings
router.post("/bookings", authMiddleware, createBookingHandler);
router.get("/bookings", authMiddleware, getBuyerBookingsHandler);
router.get("/bookings/:id", authMiddleware, getBookingByIdHandler);
router.post("/bookings/:id/cancel", authMiddleware, cancelBookingHandler);

// Messages
router.post("/messages", authMiddleware, sendMessageHandler);
router.get(
  "/messages/conversations",
  authMiddleware,
  getUserConversationsHandler,
);
router.get(
  "/messages/:listingId/:userId",
  authMiddleware,
  getListingConversationHandler,
);

export default router;
