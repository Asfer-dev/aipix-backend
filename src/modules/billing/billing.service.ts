import prisma from "../../prisma";

export async function getAllPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { monthlyPriceUsd: "asc" },
  });

  return plans;
}

export async function getUserActiveSubscription(userId: number) {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      plan: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return sub;
}

export async function subscribeUserToPlan(userId: number, planId: number) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const now = new Date();

  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const txOps = [];

  if (existing) {
    txOps.push(
      prisma.subscription.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          endDate: now,
        },
      })
    );
  }

  txOps.push(
    prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        startDate: now,
        isActive: true,
      },
      include: {
        plan: true,
      },
    })
  );

  const [, newSub] = await prisma.$transaction([
    ...(txOps.length === 2 ? [txOps[0]] : []),
    txOps[txOps.length - 1],
  ]);

  return newSub;
}

export async function getUserUsageSummary(userId: number) {
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

  const usageAgg = await prisma.creditUsage.aggregate({
    where: {
      subscriptionId: activeSub.id,
    },
    _sum: {
      creditsUsed: true,
    },
  });

  const usedCredits = usageAgg._sum.creditsUsed || 0;

  return {
    subscriptionId: activeSub.id,
    plan: {
      id: activeSub.plan.id,
      name: activeSub.plan.name,
      monthlyPriceUsd: activeSub.plan.monthlyPriceUsd,
      maxAiCredits: activeSub.plan.maxAiCredits,
      maxStorageMb: activeSub.plan.maxStorageMb,
    },
    usage: {
      usedCredits,
      remainingCredits: activeSub.plan.maxAiCredits - usedCredits,
    },
  };
}

/** Admin operations */

export async function createPlan(input: {
  name: string;
  description?: string;
  monthlyPriceUsd: number;
  maxAiCredits: number;
  maxStorageMb: number;
}) {
  const plan = await prisma.plan.create({
    data: {
      name: input.name,
      description: input.description,
      monthlyPriceUsd: input.monthlyPriceUsd,
      maxAiCredits: input.maxAiCredits,
      maxStorageMb: input.maxStorageMb,
    },
  });

  return plan;
}

export async function updatePlan(
  id: number,
  input: Partial<{
    name: string;
    description: string;
    monthlyPriceUsd: number;
    maxAiCredits: number;
    maxStorageMb: number;
  }>
) {
  const plan = await prisma.plan.update({
    where: { id },
    data: input,
  });

  return plan;
}
