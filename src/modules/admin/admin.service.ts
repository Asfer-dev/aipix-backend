/**
 * Admin Service
 * User management, analytics, and system administration
 */

import prisma from "../../prisma";

/**
 * Get all users with filters and pagination
 */
export async function getAllUsers(options?: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options?.role) {
    where.role = options.role;
  }

  if (options?.search) {
    where.OR = [
      { email: { contains: options.search, mode: "insensitive" } },
      { displayName: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
        primaryRole: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            listings: true,
            jobs: true,
            subscriptions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    users,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get user details with activity
 */
export async function getUserDetails(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          projects: true,
          listings: true,
          jobs: true,
          listingFavorites: true,
          bookings: true,
          messagesSent: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Get active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      plan: true,
    },
  });

  // Get recent jobs
  const recentJobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      creditsCharged: true,
      createdAt: true,
    },
  });

  return {
    ...user,
    activeSubscription,
    totalCreditsUsed: activeSubscription?.currentCreditsUsed || 0,
    totalStorageUsedMb: activeSubscription?.currentStorageMb || 0,
    recentJobs,
  };
}

/**
 * Update user role or status
 */
export async function updateUser(
  userId: number,
  data: {
    role?: string;
    emailVerified?: boolean;
    displayName?: string;
  },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return updated;
}

/**
 * Manually adjust user credits
 */
export async function adjustUserCredits(
  userId: number,
  amount: number,
  reason: string,
) {
  // Get active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      isActive: true,
    },
  });

  if (!subscription) {
    throw new Error("NO_ACTIVE_SUBSCRIPTION");
  }

  // Update both the usage record and the direct tracking field
  await prisma.$transaction(async (tx) => {
    // Log the adjustment
    await tx.creditUsage.create({
      data: {
        subscriptionId: subscription.id,
        creditsUsed: -amount, // Negative for additions
        reason: `Admin adjustment: ${reason}`,
      },
    });

    // Update subscription's direct tracking (decrement for adding credits)
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        currentCreditsUsed: { decrement: amount },
      },
    });
  });

  // Fetch updated subscription
  const updated = await prisma.subscription.findUnique({
    where: { id: subscription.id },
    include: { plan: true },
  });

  return updated;
}

/**
 * Get user activity log
 */
export async function getUserActivity(userId: number, limit = 50) {
  const [jobs, creditUsage, subscriptions, listings] = await Promise.all([
    prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        creditsCharged: true,
        createdAt: true,
      },
    }),
    prisma.creditUsage.findMany({
      where: {
        subscription: {
          userId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
      },
    }),
    prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        isPublished: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    jobs,
    creditUsage,
    subscriptions,
    listings,
  };
}

/**
 * Get all jobs (admin view)
 */
export async function getAllJobs(options?: {
  status?: string;
  type?: string;
  userId?: number;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        image: {
          select: {
            id: true,
            originalUrl: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    jobs,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: number) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  if (job.status !== "FAILED") {
    throw new Error("JOB_NOT_FAILED");
  }

  // Reset job to PENDING
  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      retryCount: 0,
      errorMessage: null,
      errorCode: null,
    },
  });

  return updated;
}

/**
 * Delete a job (admin only)
 */
export async function deleteJob(jobId: number) {
  await prisma.job.delete({
    where: { id: jobId },
  });

  return { success: true };
}

/**
 * Get job processing metrics
 */
export async function getJobMetrics() {
  const [statusCounts, typeCounts, recentJobs, avgProcessingTime] =
    await Promise.all([
      // Count by status
      prisma.job.groupBy({
        by: ["status"],
        _count: true,
      }),
      // Count by type
      prisma.job.groupBy({
        by: ["type"],
        _count: true,
      }),
      // Recent completed jobs
      prisma.job.findMany({
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 100,
        select: {
          processingTimeMs: true,
          creditsCharged: true,
        },
      }),
      // Average processing time
      prisma.job.aggregate({
        where: {
          status: "COMPLETED",
          processingTimeMs: { not: null },
        },
        _avg: {
          processingTimeMs: true,
          creditsCharged: true,
        },
      }),
    ]);

  // Calculate success rate
  const totalJobs = statusCounts.reduce(
    (sum: number, item: any) => sum + item._count,
    0,
  );
  const completedJobs =
    statusCounts.find((item: any) => item.status === "COMPLETED")?._count || 0;
  const failedJobs =
    statusCounts.find((item: any) => item.status === "FAILED")?._count || 0;
  const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  return {
    statusCounts: Object.fromEntries(
      statusCounts.map((item: any) => [item.status, item._count]),
    ),
    typeCounts: Object.fromEntries(
      typeCounts.map((item: any) => [item.type, item._count]),
    ),
    totalJobs,
    completedJobs,
    failedJobs,
    successRate: Math.round(successRate * 100) / 100,
    avgProcessingTimeMs: Math.round(
      avgProcessingTime._avg.processingTimeMs || 0,
    ),
    avgCreditsCharged:
      Math.round((avgProcessingTime._avg.creditsCharged || 0) * 100) / 100,
  };
}

/**
 * Get all listings (admin view)
 */
export async function getAllListings(options?: {
  status?: string;
  isPublished?: boolean;
  userId?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.isPublished !== undefined) {
    where.isPublished = options.isPublished;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }

  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { description: { contains: options.search, mode: "insensitive" } },
      { locationCity: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        media: {
          where: { isHero: true },
          take: 1,
          include: {
            imageVersion: true,
          },
        },
        _count: {
          select: {
            listingFavorites: true,
            bookings: true,
            messages: true,
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    listings: listings.map((listing: any) => ({
      ...listing,
      heroImage: listing.media[0]?.imageVersion,
    })),
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Update listing status (admin)
 */
export async function updateListingStatus(
  listingId: number,
  status: string,
  isPublished?: boolean,
) {
  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: status as any,
      ...(isPublished !== undefined && { isPublished }),
    },
  });

  return updated;
}

/**
 * Force unpublish listing
 */
export async function unpublishListing(listingId: number, reason: string) {
  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      isPublished: false,
      status: "ARCHIVED",
    },
  });

  // TODO: Notify user about unpublishing
  // Could log the reason in a separate moderation_actions table

  return updated;
}

/**
 * Get all bookings (admin view)
 */
export async function getAllBookings(options?: {
  status?: string;
  listingId?: number;
  buyerId?: number;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.listingId) {
    where.listingId = options.listingId;
  }

  if (options?.buyerId) {
    where.buyerId = options.buyerId;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            media: {
              where: { isHero: true },
              take: 1,
              include: {
                imageVersion: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    bookings: bookings.map((b: any) => ({
      ...b,
      listing: {
        ...b.listing,
        heroImage: b.listing.media[0]?.imageVersion,
      },
    })),
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Admin cancel booking
 */
export async function adminCancelBooking(bookingId: number, reason: string) {
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // TODO: Notify both parties
  // Could log the reason in a separate moderation_actions table

  return updated;
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics() {
  const [userStats, listingStats, bookingStats, jobStats, revenueStats] =
    await Promise.all([
      // User stats
      prisma.user.groupBy({
        by: ["primaryRole"],
        _count: true,
      }),
      // Listing stats
      Promise.all([
        prisma.listing.count(),
        prisma.listing.count({ where: { isPublished: true } }),
        prisma.listing.count({ where: { status: "DRAFT" } }),
      ]),
      // Booking stats
      prisma.booking.groupBy({
        by: ["status"],
        _count: true,
      }),
      // Job stats
      Promise.all([
        prisma.job.count(),
        prisma.job.count({ where: { status: "COMPLETED" } }),
        prisma.job.count({ where: { status: "FAILED" } }),
        prisma.job.count({ where: { status: "RUNNING" } }),
      ]),
      // Revenue stats (last 30 days) - Payment model not implemented yet
      Promise.resolve({ _sum: { amount: 0 }, _count: 0 }),
    ]);

  const totalUsers = userStats.reduce(
    (sum: number, item: any) => sum + item._count,
    0,
  );
  const [totalListings, publishedListings, draftListings] = listingStats;
  const [totalJobs, completedJobs, failedJobs, runningJobs] = jobStats;

  return {
    users: {
      total: totalUsers,
      byRole: Object.fromEntries(
        userStats.map((item: any) => [item.primaryRole, item._count]),
      ),
    },
    listings: {
      total: totalListings,
      published: publishedListings,
      draft: draftListings,
    },
    bookings: {
      total: bookingStats.reduce(
        (sum: number, item: any) => sum + item._count,
        0,
      ),
      byStatus: Object.fromEntries(
        bookingStats.map((item: any) => [item.status, item._count]),
      ),
    },
    jobs: {
      total: totalJobs,
      completed: completedJobs,
      failed: failedJobs,
      running: runningJobs,
      successRate:
        totalJobs > 0
          ? Math.round((completedJobs / totalJobs) * 100 * 100) / 100
          : 0,
    },
    revenue: {
      last30Days: revenueStats._sum.amount || 0,
      transactionCount: revenueStats._count,
    },
  };
}

/**
 * Get analytics data
 */
export async function getAnalytics(type: string, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  switch (type) {
    case "users":
      return getUserGrowthAnalytics(startDate);
    case "revenue":
      return getRevenueAnalytics(startDate);
    case "jobs":
      return getJobAnalytics(startDate);
    case "marketplace":
      return getMarketplaceAnalytics(startDate);
    default:
      throw new Error("INVALID_ANALYTICS_TYPE");
  }
}

async function getUserGrowthAnalytics(startDate: Date) {
  const newUsers = await prisma.user.count({
    where: {
      createdAt: { gte: startDate },
    },
  });

  const usersByRole = await prisma.user.groupBy({
    by: ["primaryRole"],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  return {
    newUsers,
    byRole: Object.fromEntries(
      usersByRole.map((item: any) => [item.primaryRole, item._count]),
    ),
  };
}

async function getRevenueAnalytics(startDate: Date) {
  // Payment model not implemented yet
  return {
    totalRevenue: 0,
    transactionCount: 0,
    avgTransaction: 0,
  };
}

async function getJobAnalytics(startDate: Date) {
  const jobs = await prisma.job.findMany({
    where: {
      createdAt: { gte: startDate },
    },
  });

  const byType = jobs.reduce(
    (acc: Record<string, number>, job: any) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const jobsByStatus = jobs.reduce(
    (acc: Record<string, number>, job: any) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total: jobs.length,
    byType,
    byStatus: jobsByStatus,
  };
}

async function getMarketplaceAnalytics(startDate: Date) {
  const [newListings, newBookings, newFavorites, newMessages] =
    await Promise.all([
      prisma.listing.count({ where: { createdAt: { gte: startDate } } }),
      prisma.booking.count({ where: { createdAt: { gte: startDate } } }),
      prisma.listingFavorite.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.message.count({ where: { createdAt: { gte: startDate } } }),
    ]);

  return {
    newListings,
    newBookings,
    newFavorites,
    newMessages,
  };
}
