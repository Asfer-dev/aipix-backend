/**
 * AI Content Moderation Client
 * Integrates with FastAPI backend for automatic content moderation
 */

import axios from "axios";

const AI_MODERATION_URL =
  process.env.AI_MODERATION_URL || "http://localhost:8001";
const AI_MODERATION_API_KEY = process.env.AI_MODERATION_API_KEY || "";

interface ModerationRequest {
  content: string;
  contentType: "text" | "image" | "combined";
  imageUrls?: string[];
  metadata?: {
    title?: string;
    description?: string;
    location?: string;
    userId?: number;
  };
}

export interface ModerationResponse {
  status: "APPROVED" | "FLAGGED" | "REJECTED";
  score: number; // 0-1, higher = more likely inappropriate
  flags: string[]; // Array of issues found
  reasons: string[];
  confidence: number;
}

/**
 * Moderate content via AI service
 */
export async function moderateContent(
  request: ModerationRequest,
): Promise<ModerationResponse> {
  try {
    const response = await axios.post(
      `${AI_MODERATION_URL}/api/moderate`,
      request,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": AI_MODERATION_API_KEY,
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("AI moderation error:", error.message);

    // Fail-safe: if AI service is down, flag for manual review
    return {
      status: "FLAGGED",
      score: 0.5,
      flags: ["AI_SERVICE_ERROR"],
      reasons: [
        "AI moderation service unavailable - flagged for manual review",
      ],
      confidence: 0,
    };
  }
}

/**
 * Moderate a listing (title, description, location)
 */
export async function moderateListing(listing: {
  title: string;
  description: string;
  imageUrls?: string[];
  location?: string;
  userId?: number;
}): Promise<ModerationResponse> {
  const content = `Title: ${listing.title}\n\nDescription: ${listing.description}\n\nLocation: ${listing.location || "N/A"}`;

  return moderateContent({
    content,
    contentType:
      listing.imageUrls && listing.imageUrls.length > 0 ? "combined" : "text",
    ...(listing.imageUrls && { imageUrls: listing.imageUrls }),
    metadata: {
      title: listing.title,
      description: listing.description,
      ...(listing.location && { location: listing.location }),
      ...(listing.userId && { userId: listing.userId }),
    },
  });
}

/**
 * Moderate a message
 */
export async function moderateMessage(message: {
  content: string;
  senderId: number;
}): Promise<ModerationResponse> {
  return moderateContent({
    content: message.content,
    contentType: "text",
    metadata: {
      userId: message.senderId,
    },
  });
}

/**
 * Moderate an image
 */
export async function moderateImage(
  imageUrl: string,
): Promise<ModerationResponse> {
  return moderateContent({
    content: "Image moderation check",
    contentType: "image",
    imageUrls: [imageUrl],
  });
}

/**
 * Batch moderate multiple items
 */
export async function batchModerate(
  items: ModerationRequest[],
): Promise<ModerationResponse[]> {
  try {
    const response = await axios.post(
      `${AI_MODERATION_URL}/api/moderate/batch`,
      { items },
      {
        timeout: 30000, // 30 second timeout for batch
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": AI_MODERATION_API_KEY,
        },
      },
    );

    return response.data.results;
  } catch (error: any) {
    console.error("Batch moderation error:", error.message);

    // Return flagged status for all items if service fails
    return items.map(() => ({
      status: "FLAGGED" as const,
      score: 0.5,
      flags: ["AI_SERVICE_ERROR"],
      reasons: ["AI moderation service unavailable"],
      confidence: 0,
    }));
  }
}
