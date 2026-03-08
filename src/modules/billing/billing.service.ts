import { PaymentMethod, PaymentStatus } from "@prisma/client";
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
      }),
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
    }),
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

  // Use direct tracking fields for quick dashboard access
  const usedCredits = activeSub.currentCreditsUsed;
  const usedStorageMb = activeSub.currentStorageMb;

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
      usedStorageMb,
      remainingStorageMb: activeSub.plan.maxStorageMb - usedStorageMb,
      storagePercentage: (usedStorageMb / activeSub.plan.maxStorageMb) * 100,
      creditsPercentage: (usedCredits / activeSub.plan.maxAiCredits) * 100,
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
  }>,
) {
  const plan = await prisma.plan.update({
    where: { id },
    data: input,
  });

  return plan;
}

/**
 * Process a mock payment for development/testing
 * Instantly creates a successful payment and activates subscription
 */
export async function processMockPayment(userId: number, planId: number) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const now = new Date();

  // End any existing active subscription
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        endDate: now,
      },
    });
  }

  // Create new subscription
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      startDate: now,
      isActive: true,
    },
    include: {
      plan: true,
    },
  });

  // Create mock payment record
  const payment = await prisma.payment.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      planId: plan.id,
      amount: plan.monthlyPriceUsd,
      currency: "USD",
      status: PaymentStatus.COMPLETED,
      paymentMethod: PaymentMethod.MOCK,
      description: `Mock payment for ${plan.name} plan`,
      paidAt: now,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      plan: true,
      subscription: {
        include: {
          plan: true,
        },
      },
    },
  });

  return {
    payment,
    subscription,
  };
}

/**
 * Get payment history for a user
 */
export async function getPaymentHistory(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  },
) {
  const where = {
    userId,
    ...(options?.status && { status: options.status }),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      plan: true,
      subscription: {
        include: {
          plan: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });

  const total = await prisma.payment.count({ where });

  return {
    payments,
    total,
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  };
}

/**
 * Get a single payment by ID
 */
export async function getPaymentById(paymentId: number, userId: number) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId,
    },
    include: {
      plan: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  return payment;
}
