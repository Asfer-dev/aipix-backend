/**
 * Moderation Service
 * Content moderation, spam detection, and user safety
 */

import prisma from "../../prisma";

/**
 * Get flagged listings for moderation review
 */
export async function getFlaggedListings(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const listings = await prisma.listing.findMany({
    where: {
      moderationStatus: "FLAGGED",
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      media: {
        take: 5,
        include: {
          imageVersion: true,
        },
      },
      moderationLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const total = await prisma.listing.count({
    where: { moderationStatus: "FLAGGED" },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    listings,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Approve a flagged listing
 */
export async function approveListing(
  listingId: number,
  moderatorId: number,
  notes?: string,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Update listing status
  const updatedListing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      moderationStatus: "APPROVED",
      status: "PUBLISHED",
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      isPublished: true,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Log the approval
  await prisma.moderationLog.create({
    data: {
      listingId,
      userId: listing.userId,
      moderationType: "LISTING",
      status: "APPROVED",
      reviewedBy: moderatorId,
      reviewNotes: notes || null,
      aiScore: listing.moderationScore || null,
      aiFlags: listing.aiModerationFlags || [],
      aiModel: "content-moderator-v1",
    },
  });

  return updatedListing;
}

/**
 * Reject a flagged listing
 */
export async function rejectListing(
  listingId: number,
  moderatorId: number,
  reason: string,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Update listing status
  const updatedListing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      moderationStatus: "REJECTED",
      status: "DRAFT",
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      isPublished: false,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Log the rejection
  await prisma.moderationLog.create({
    data: {
      listingId,
      userId: listing.userId,
      moderationType: "LISTING",
      status: "REJECTED",
      reviewedBy: moderatorId,
      reviewNotes: reason,
      aiScore: listing.moderationScore || null,
      aiFlags: listing.aiModerationFlags || [],
      aiModel: "content-moderator-v1",
    },
  });

  return updatedListing;
}

/**
 * Get flagged messages for review
 */
export async function getFlaggedMessages(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: {
      moderationStatus: "FLAGGED",
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
      moderationLogs: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  const total = await prisma.message.count({
    where: { moderationStatus: "FLAGGED" },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    messages,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Approve a flagged message
 */
export async function approveMessage(
  messageId: number,
  moderatorId: number,
  notes?: string,
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  // Update message status
  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      moderationStatus: "APPROVED",
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Log the approval
  await prisma.moderationLog.create({
    data: {
      messageId,
      userId: message.senderId,
      moderationType: "MESSAGE",
      status: "APPROVED",
      reviewedBy: moderatorId,
      reviewNotes: notes || null,
      aiScore: message.moderationScore || null,
      aiFlags: message.aiModerationFlags || [],
      aiModel: "content-moderator-v1",
    },
  });

  return updatedMessage;
}

/**
 * Delete a flagged message
 */
export async function deleteMessage(
  messageId: number,
  moderatorId: number,
  reason: string,
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  // Log the deletion before deleting
  await prisma.moderationLog.create({
    data: {
      messageId,
      userId: message.senderId,
      moderationType: "MESSAGE",
      status: "REJECTED",
      reviewedBy: moderatorId,
      reviewNotes: reason,
      aiScore: message.moderationScore || null,
      aiFlags: message.aiModerationFlags || [],
      aiModel: "content-moderator-v1",
    },
  });

  // Delete the message
  await prisma.message.delete({
    where: { id: messageId },
  });

  return { success: true, message };
}

/**
 * Get reported messages
 */
export async function getReportedMessages(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  // Note: This assumes you have a separate reports table
  // For now, we'll return messages that might need review
  // In production, you'd want a proper reporting system

  // Get messages from last 7 days sorted by conversation activity
  const messages = await prisma.message.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const total = await prisma.message.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    messages,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get conversation context for moderation
 */
export async function getConversationForModeration(
  listingId: number,
  userId1: number,
  userId2: number,
) {
  const messages = await prisma.message.findMany({
    where: {
      listingId,
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return messages;
}
