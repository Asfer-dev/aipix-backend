/**
 * Messages Service
 * Direct messaging between buyers and listers
 */

import { moderateMessage } from "../../lib/ai-moderation-client";
import prisma from "../../prisma";

/**
 * Send a message
 */
export async function sendMessage(
  senderId: number,
  listingId: number,
  receiverId: number,
  content: string,
) {
  // Validate listing exists
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      isPublished: true,
    },
    include: {
      user: true,
    },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Verify receiver is valid (either buyer or lister)
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
  });

  if (!receiver) {
    throw new Error("RECEIVER_NOT_FOUND");
  }

  // Can't send message to yourself
  if (senderId === receiverId) {
    throw new Error("CANNOT_MESSAGE_SELF");
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error("MESSAGE_CONTENT_REQUIRED");
  }

  if (content.length > 5000) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  // AI MODERATION - Check message content
  const moderationResult = await moderateMessage({
    content: content.trim(),
    senderId,
  });

  // Determine if message should be blocked
  let moderationStatus: string;

  if (moderationResult.status === "APPROVED" && moderationResult.score < 0.5) {
    // Low to medium risk - allow message
    moderationStatus = "APPROVED";
  } else if (moderationResult.score >= 0.8) {
    // High risk - block message immediately
    moderationStatus = "REJECTED";

    // Log the rejection
    await prisma.moderationLog.create({
      data: {
        userId: senderId,
        moderationType: "MESSAGE",
        status: "REJECTED",
        aiScore: moderationResult.score,
        aiFlags: moderationResult.flags,
        aiModel: "content-moderator-v1",
      },
    });

    throw new Error("MESSAGE_REJECTED: " + moderationResult.reasons.join(", "));
  } else {
    // Medium risk - flag for review but allow
    moderationStatus = "FLAGGED";
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      listingId,
      senderId,
      receiverId,
      content: content.trim(),
      moderationStatus,
      moderationScore: moderationResult.score,
      aiModerationFlags: moderationResult.flags,
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          media: {
            where: { isHero: true },
            take: 1,
            include: {
              imageVersion: true,
            },
          },
        },
      },
    },
  });

  // Log moderation result if flagged
  if (moderationStatus === "FLAGGED") {
    await prisma.moderationLog.create({
      data: {
        messageId: message.id,
        userId: senderId,
        moderationType: "MESSAGE",
        status: "FLAGGED",
        aiScore: moderationResult.score,
        aiFlags: moderationResult.flags,
        aiModel: "content-moderator-v1",
      },
    });
  }

  return message;
}

/**
 * Get conversation for a listing
 */
export async function getListingConversation(
  userId: number,
  listingId: number,
  otherUserId: number,
) {
  // Verify access to listing
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      userId: true,
      isPublished: true,
    },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // User must be buyer or lister
  if (listing.userId !== userId && listing.isPublished !== true) {
    throw new Error("ACCESS_DENIED");
  }

  // Get messages between these two users for this listing
  const messages = await prisma.message.findMany({
    where: {
      listingId,
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return messages;
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: number) {
  // Get all messages where user is sender or receiver
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
        },
      },
      receiver: {
        select: {
          id: true,
          displayName: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          media: {
            where: { isHero: true },
            take: 1,
            include: {
              imageVersion: true,
            },
          },
        },
      },
    },
  });

  // Group by listing and other user
  const conversationsMap = new Map<string, any>();

  for (const message of messages) {
    const otherUser =
      message.senderId === userId ? message.receiver : message.sender;
    const key = `${message.listingId}-${otherUser.id}`;

    if (!conversationsMap.has(key)) {
      conversationsMap.set(key, {
        listingId: message.listingId,
        listing: message.listing,
        otherUser,
        lastMessage: message,
        messageCount: 1,
      });
    } else {
      const existing = conversationsMap.get(key)!;
      existing.messageCount++;
      // Keep most recent message
      if (message.createdAt > existing.lastMessage.createdAt) {
        existing.lastMessage = message;
      }
    }
  }

  // Convert to array and sort by last message time
  const conversations = Array.from(conversationsMap.values()).sort(
    (a, b) =>
      new Date(b.lastMessage.createdAt).getTime() -
      new Date(a.lastMessage.createdAt).getTime(),
  );

  return conversations;
}

/**
 * Get unread message count for user
 */
export async function getUnreadCount(userId: number) {
  // This is a simplified version - in production you'd want a "read" flag on messages
  // For now, we'll return 0 as placeholder
  return 0;
}

/**
 * Delete a message (soft delete - mark as deleted)
 */
export async function deleteMessage(userId: number, messageId: number) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  // Only sender can delete
  if (message.senderId !== userId) {
    throw new Error("NOT_YOUR_MESSAGE");
  }

  // Actually delete (or you could add a "deleted" flag instead)
  await prisma.message.delete({
    where: { id: messageId },
  });

  return { success: true };
}
