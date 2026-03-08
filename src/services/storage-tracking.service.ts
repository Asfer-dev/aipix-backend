/**
 * Storage Tracking Service
 * Tracks file uploads and manages storage quotas
 */

import prisma from "../prisma";

export interface TrackStorageInput {
  subscriptionId: number;
  fileSizeMb: number;
  fileUrl: string;
  fileName?: string;
  imageId?: number;
  projectId?: number;
  operation: "UPLOAD" | "DELETE";
}

/**
 * Track storage usage and update subscription's currentStorageMb
 */
export async function trackStorageUsage(input: TrackStorageInput) {
  const { subscriptionId, fileSizeMb, operation } = input;

  // Create storage usage record and update subscription in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create storage usage record
    await tx.storageUsage.create({
      data: {
        subscriptionId,
        imageId: input.imageId || null,
        projectId: input.projectId || null,
        fileSizeMb,
        fileUrl: input.fileUrl,
        fileName: input.fileName || null,
        operation,
      },
    });

    // 2. Update subscription's current storage
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (subscription) {
      const newStorageMb =
        operation === "UPLOAD"
          ? subscription.currentStorageMb + fileSizeMb
          : Math.max(0, subscription.currentStorageMb - fileSizeMb);

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { currentStorageMb: newStorageMb },
      });
    }
  });
}

/**
 * Check if user has enough storage quota
 */
export async function checkStorageQuota(
  subscriptionId: number,
  additionalMb: number,
): Promise<{ allowed: boolean; currentMb: number; maxMb: number; remainingMb: number }> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  const currentMb = subscription.currentStorageMb;
  const maxMb = subscription.plan.maxStorageMb;
  const remainingMb = maxMb - currentMb;
  const allowed = remainingMb >= additionalMb;

  return {
    allowed,
    currentMb,
    maxMb,
    remainingMb,
  };
}

/**
 * Get file size in MB from buffer
 */
export function getFileSizeMb(buffer: Buffer): number {
  return buffer.length / (1024 * 1024);
}

/**
 * Recalculate and sync storage for a subscription (admin utility)
 */
export async function recalculateStorage(subscriptionId: number): Promise<number> {
  const storageAgg = await prisma.storageUsage.aggregate({
    where: { subscriptionId },
    _sum: { fileSizeMb: true },
  });

  const totalMb = storageAgg._sum.fileSizeMb || 0;

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { currentStorageMb: totalMb },
  });

  return totalMb;
}

/**
 * Recalculate and sync credits for a subscription (admin utility)
 */
export async function recalculateCredits(subscriptionId: number): Promise<number> {
  const creditAgg = await prisma.creditUsage.aggregate({
    where: { subscriptionId },
    _sum: { creditsUsed: true },
  });

  const totalCredits = creditAgg._sum.creditsUsed || 0;

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { currentCreditsUsed: totalCredits },
  });

  return totalCredits;
}

/**
 * Reset usage counters (monthly billing cycle)
 */
export async function resetMonthlyUsage(subscriptionId: number) {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      currentCreditsUsed: 0,
      // Note: Storage is cumulative, not reset monthly
    },
  });
}
