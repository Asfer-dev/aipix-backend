import { Request, Response } from "express";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  attachMediaToListing,
  createListingForUser,
  createListingWithMediaForUser,
  getListingForUser,
  listMyListings,
  publishListing,
  updateListingForUser,
} from "./listings.service";

import {
  getFeaturedListings,
  getPublicListingDetail,
  getSearchSuggestions,
  getSimilarListings,
  searchMarketplaceListings,
} from "./marketplace.service";

import {
  addFavorite,
  getUserFavorites,
  removeFavorite,
} from "./favorites.service";

import {
  cancelBooking,
  createBooking,
  getBookingById,
  getBuyerBookings,
  getListerBookings,
  updateBookingStatus,
} from "./bookings.service";

import {
  getListingConversation,
  getUserConversations,
  sendMessage,
} from "./messages.service";

// Lister endpoints

export async function createListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      projectId,
      title,
      description,
      price,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      bedrooms,
      bathrooms,
      areaSqm,
    } = req.body;

    if (!projectId || !title) {
      return res
        .status(400)
        .json({ error: "projectId and title are required" });
    }

    const payload: any = {
      projectId: Number(projectId),
      title,
      description,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
    };

    if (price != null) payload.price = Number(price);
    if (bedrooms != null) payload.bedrooms = Number(bedrooms);
    if (bathrooms != null) payload.bathrooms = Number(bathrooms);
    if (areaSqm != null) payload.areaSqm = Number(areaSqm);

    const listing = await createListingForUser(user.id, payload);

    return res.status(201).json({ listing });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("createListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listMyListingsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listings = await listMyListings(user.id);
    return res.json({ listings });
  } catch (err) {
    console.error("listMyListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await getListingForUser(user.id, listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    return res.json({ listing });
  } catch (err) {
    console.error("getMyListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const updated = await updateListingForUser(user.id, listingId, req.body);
    return res.json({ listing: updated });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "USE_PUBLISH_ENDPOINT") {
      return res
        .status(400)
        .json({ error: "Use POST /listings/:id/publish to publish a listing" });
    }
    console.error("updateListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function publishListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const result = await publishListing(user.id, listingId);
    return res.json(result);
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "ALREADY_PUBLISHED") {
      return res.status(409).json({ error: "Listing is already published" });
    }
    if (err.message === "NO_MEDIA_ATTACHED") {
      return res
        .status(400)
        .json({ error: "Attach at least one image before publishing" });
    }
    if (err.message?.startsWith("CONTENT_REJECTED")) {
      return res.status(422).json({
        error: "Listing was rejected by content moderation",
        detail: err.message.replace("CONTENT_REJECTED: ", ""),
      });
    }
    console.error("publishListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function attachMediaHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const { imageVersionIds, heroImageVersionId } = req.body;

    if (!Array.isArray(imageVersionIds) || imageVersionIds.length === 0) {
      return res.status(400).json({ error: "imageVersionIds is required" });
    }

    const media = await attachMediaToListing(
      user.id,
      listingId,
      imageVersionIds.map(Number),
      heroImageVersionId != null ? Number(heroImageVersionId) : undefined,
    );

    return res.status(201).json({ media });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "INVALID_IMAGE_VERSIONS") {
      return res
        .status(400)
        .json({ error: "Some image versions do not belong to this project" });
    }
    console.error("attachMediaHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Public marketplace

export async function searchMarketplaceHandler(req: Request, res: Response) {
  try {
    const filters: any = {};

    // Text search
    if (req.query.search) filters.search = req.query.search as string;

    // Location
    if (req.query.city) filters.city = req.query.city as string;
    if (req.query.state) filters.state = req.query.state as string;
    if (req.query.country) filters.country = req.query.country as string;

    // Price range
    if (req.query.minPrice) filters.minPrice = Number(req.query.minPrice);
    if (req.query.maxPrice) filters.maxPrice = Number(req.query.maxPrice);
    if (req.query.currency) filters.currency = req.query.currency as string;

    // Property type
    if (req.query.propertyType) {
      const types = req.query.propertyType as string;
      filters.propertyType = types.includes(",") ? types.split(",") : types;
    }

    // Bedrooms and bathrooms
    if (req.query.minBedrooms)
      filters.minBedrooms = Number(req.query.minBedrooms);
    if (req.query.maxBedrooms)
      filters.maxBedrooms = Number(req.query.maxBedrooms);
    if (req.query.minBathrooms)
      filters.minBathrooms = Number(req.query.minBathrooms);
    if (req.query.maxBathrooms)
      filters.maxBathrooms = Number(req.query.maxBathrooms);

    // Area
    if (req.query.minArea) filters.minArea = Number(req.query.minArea);
    if (req.query.maxArea) filters.maxArea = Number(req.query.maxArea);

    // Advanced filters
    if (req.query.hasVirtualStaging)
      filters.hasVirtualStaging = req.query.hasVirtualStaging === "true";
    if (req.query.hasEnhancedPhotos)
      filters.hasEnhancedPhotos = req.query.hasEnhancedPhotos === "true";

    // Sorting
    if (req.query.sortBy) filters.sortBy = req.query.sortBy as string;
    if (req.query.sortOrder)
      filters.sortOrder = req.query.sortOrder as "asc" | "desc";

    // Pagination
    if (req.query.page) filters.page = Number(req.query.page);
    if (req.query.limit) filters.limit = Number(req.query.limit);

    const result = await searchMarketplaceListings(filters);
    return res.json(result);
  } catch (err) {
    console.error("searchMarketplaceHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMarketplaceListingHandler(
  req: Request,
  res: Response,
) {
  try {
    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await getPublicListingDetail(listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    return res.json({ listing });
  } catch (err) {
    console.error("getMarketplaceListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSimilarListingsHandler(req: Request, res: Response) {
  try {
    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 4;
    const listings = await getSimilarListings(listingId, limit);

    return res.json({ listings });
  } catch (err) {
    console.error("getSimilarListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFeaturedListingsHandler(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const listings = await getFeaturedListings(limit);

    return res.json({ listings });
  } catch (err) {
    console.error("getFeaturedListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSearchSuggestionsHandler(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const suggestions = await getSearchSuggestions(query, limit);

    return res.json(suggestions);
  } catch (err) {
    console.error("getSearchSuggestionsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createListingWithMediaHandler(
  req: Request,
  res: Response,
) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      projectId,
      title,
      description,
      price,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      bedrooms,
      bathrooms,
      areaSqm,
      imageVersionIds,
      heroImageVersionId,
    } = req.body;

    if (!projectId || !title) {
      return res
        .status(400)
        .json({ error: "projectId and title are required" });
    }

    if (!Array.isArray(imageVersionIds) || imageVersionIds.length === 0) {
      return res.status(400).json({ error: "imageVersionIds is required" });
    }

    const payload = {
      projectId: Number(projectId),
      title,
      description,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      price: price != null ? Number(price) : undefined,
      bedrooms: bedrooms != null ? Number(bedrooms) : undefined,
      bathrooms: bathrooms != null ? Number(bathrooms) : undefined,
      areaSqm: areaSqm != null ? Number(areaSqm) : undefined,
      imageVersionIds: imageVersionIds.map(Number),
      heroImageVersionId:
        heroImageVersionId != null ? Number(heroImageVersionId) : undefined,
    };

    const result = await createListingWithMediaForUser(user.id, payload as any);

    return res.status(201).json(result); // { listing, media }
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "INVALID_IMAGE_VERSIONS") {
      return res
        .status(400)
        .json({ error: "Some image versions do not belong to this project" });
    }
    console.error("createListingWithMediaHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Favorites

export async function addFavoriteHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.body.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const favorite = await addFavorite(user.id, listingId);
    return res.status(201).json({ favorite });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "ALREADY_FAVORITED") {
      return res.status(400).json({ error: "Already favorited" });
    }
    console.error("addFavoriteHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeFavoriteHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.listingId);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    await removeFavorite(user.id, listingId);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "NOT_FAVORITED") {
      return res.status(404).json({ error: "Not favorited" });
    }
    console.error("removeFavoriteHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserFavoritesHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await getUserFavorites(user.id, {
      ...(page !== undefined && { page }),
      ...(limit !== undefined && { limit }),
    });
    return res.json(result);
  } catch (err) {
    console.error("getUserFavoritesHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Bookings

export async function createBookingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { listingId, requestedStart, requestedEnd } = req.body;

    if (!listingId || !requestedStart || !requestedEnd) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const booking = await createBooking(user.id, {
      listingId: Number(listingId),
      requestedStart: new Date(requestedStart),
      requestedEnd: new Date(requestedEnd),
    });

    return res.status(201).json({ booking });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "CANNOT_BOOK_OWN_LISTING") {
      return res.status(400).json({ error: "Cannot book your own listing" });
    }
    if (
      err.message === "INVALID_START_DATE" ||
      err.message === "INVALID_END_DATE"
    ) {
      return res.status(400).json({ error: "Invalid dates" });
    }
    if (err.message === "BOOKING_CONFLICT") {
      return res.status(409).json({ error: "Booking conflict" });
    }
    console.error("createBookingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getBuyerBookingsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const status = req.query.status as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await getBuyerBookings(user.id, {
      ...(status !== undefined && { status }),
      ...(page !== undefined && { page }),
      ...(limit !== undefined && { limit }),
    });
    return res.json(result);
  } catch (err) {
    console.error("getBuyerBookingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getListerBookingsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const status = req.query.status as string | undefined;
    const listingId = req.query.listingId
      ? Number(req.query.listingId)
      : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await getListerBookings(user.id, {
      ...(status !== undefined && { status }),
      ...(listingId !== undefined && { listingId }),
      ...(page !== undefined && { page }),
      ...(limit !== undefined && { limit }),
    });
    return res.json(result);
  } catch (err) {
    console.error("getListerBookingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateBookingStatusHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const bookingId = Number(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const { status } = req.body;
    if (!["CONFIRMED", "REJECTED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const booking = await updateBookingStatus(user.id, bookingId, status);
    return res.json({ booking });
  } catch (err: any) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (err.message === "NOT_YOUR_BOOKING") {
      return res.status(403).json({ error: "Not your booking" });
    }
    if (err.message === "BOOKING_ALREADY_CLOSED") {
      return res.status(400).json({ error: "Booking already closed" });
    }
    console.error("updateBookingStatusHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelBookingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const bookingId = Number(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const booking = await cancelBooking(user.id, bookingId);
    return res.json({ booking });
  } catch (err: any) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (err.message === "NOT_YOUR_BOOKING") {
      return res.status(403).json({ error: "Not your booking" });
    }
    if (err.message === "BOOKING_ALREADY_CLOSED") {
      return res.status(400).json({ error: "Booking already closed" });
    }
    console.error("cancelBookingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getBookingByIdHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const bookingId = Number(req.params.id);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    const booking = await getBookingById(user.id, bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    return res.json({ booking });
  } catch (err) {
    console.error("getBookingByIdHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Messages

export async function sendMessageHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { listingId, receiverId, content } = req.body;

    if (!listingId || !receiverId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await sendMessage(
      user.id,
      Number(listingId),
      Number(receiverId),
      content,
    );

    return res.status(201).json({ message });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "RECEIVER_NOT_FOUND") {
      return res.status(404).json({ error: "Receiver not found" });
    }
    if (err.message === "CANNOT_MESSAGE_SELF") {
      return res.status(400).json({ error: "Cannot message yourself" });
    }
    if (err.message === "MESSAGE_CONTENT_REQUIRED") {
      return res.status(400).json({ error: "Message content required" });
    }
    if (err.message === "MESSAGE_TOO_LONG") {
      return res.status(400).json({ error: "Message too long" });
    }
    console.error("sendMessageHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getListingConversationHandler(
  req: Request,
  res: Response,
) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.listingId);
    const otherUserId = Number(req.params.userId);

    if (isNaN(listingId) || isNaN(otherUserId)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const messages = await getListingConversation(
      user.id,
      listingId,
      otherUserId,
    );
    return res.json({ messages });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "ACCESS_DENIED") {
      return res.status(403).json({ error: "Access denied" });
    }
    console.error("getListingConversationHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserConversationsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const conversations = await getUserConversations(user.id);
    return res.json({ conversations });
  } catch (err) {
    console.error("getUserConversationsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
