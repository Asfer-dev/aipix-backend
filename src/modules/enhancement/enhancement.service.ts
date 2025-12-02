import { Prisma } from "@prisma/client";
import prisma from "../../prisma";

export async function createEnhancementJobsForImages(
  userId: number,
  projectId: number,
  imageIds: number[]
) {
  if (imageIds.length === 0) {
    throw new Error("NO_IMAGES");
  }

  // 1) Check project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
  }

  // 2) Check that images belong to this project
  const validImages = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      projectId,
    },
    select: { id: true },
  });

  if (validImages.length !== imageIds.length) {
    throw new Error("INVALID_IMAGES");
  }

  // 3) Credit check via active subscription
  const activeSub = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      plan: true,
    },
  });

  if (!activeSub) {
    throw new Error("NO_ACTIVE_SUBSCRIPTION");
  }

  const neededCredits = imageIds.length; // 1 credit per image

  const usageAgg = await prisma.creditUsage.aggregate({
    where: {
      subscriptionId: activeSub.id,
    },
    _sum: {
      creditsUsed: true,
    },
  });

  const usedCredits = usageAgg._sum.creditsUsed || 0;
  const remainingCredits = activeSub.plan.maxAiCredits - usedCredits;

  if (remainingCredits < neededCredits) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  // 4) Create jobs + record usage in a transaction
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const jobs = await Promise.all(
        imageIds.map((imageId) =>
          tx.enhancementJob.create({
            data: {
              userId,
              projectId,
              imageId,
              status: "PENDING",
            },
          })
        )
      );

      await tx.creditUsage.create({
        data: {
          subscriptionId: activeSub.id,
          creditsUsed: neededCredits,
          reason: "ENHANCEMENT_JOB",
        },
      });

      return jobs;
    }
  );

  return result;
}

export async function listEnhancementJobsForProject(
  userId: number,
  projectId: number
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
  }

  const jobs = await prisma.enhancementJob.findMany({
    where: { projectId, userId },
    include: {
      image: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return jobs;
}

/**
 * Helper endpoint for now: mark job completed and create an ENHANCED version.
 * (Later this can be called by your AI worker.)
 */
export async function markJobCompleted(
  userId: number,
  jobId: number,
  enhancedUrl: string
) {
  const job = await prisma.enhancementJob.findFirst({
    where: { id: jobId, userId },
    include: { image: true },
  });

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  if (job.status === "COMPLETED") {
    return job;
  }
  const updated = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // create enhanced version
      await tx.imageVersion.create({
        data: {
          imageId: job.imageId,
          type: "ENHANCED",
          url: enhancedUrl,
        },
      });

      // update job status
      return tx.enhancementJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
        },
      });
    }
  );

  return updated;
}
