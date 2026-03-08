/**
 * Bookings Service
 * Manage viewing/tour bookings for listings
 */

import prisma from "../../prisma";

export interface CreateBookingInput {
  listingId: number;
  requestedStart: Date;
  requestedEnd: Date;
}

/**
 * Create a booking request
 */
export async function createBooking(
  buyerId: number,
  input: CreateBookingInput,
) {
  // Check if listing exists and is published
  const listing = await prisma.listing.findFirst({
    where: {
      id: input.listingId,
      isPublished: true,
      status: "PUBLISHED",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Can't book your own listing
  if (listing.userId === buyerId) {
    throw new Error("CANNOT_BOOK_OWN_LISTING");
  }

  // Validate dates
  const now = new Date();
  const requestedStart = new Date(input.requestedStart);
  const requestedEnd = new Date(input.requestedEnd);

  if (requestedStart < now) {
    throw new Error("INVALID_START_DATE");
  }

  if (requestedEnd <= requestedStart) {
    throw new Error("INVALID_END_DATE");
  }

  // Check for conflicting bookings
  const conflicting = await prisma.booking.findFirst({
    where: {
      listingId: input.listingId,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        {
          AND: [
            { requestedStart: { lte: requestedStart } },
            { requestedEnd: { gte: requestedStart } },
          ],
        },
        {
          AND: [
            { requestedStart: { lte: requestedEnd } },
            { requestedEnd: { gte: requestedEnd } },
          ],
        },
        {
          AND: [
            { requestedStart: { gte: requestedStart } },
            { requestedEnd: { lte: requestedEnd } },
          ],
        },
      ],
    },
  });

  if (conflicting) {
    throw new Error("BOOKING_CONFLICT");
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      listingId: input.listingId,
      buyerId,
      requestedStart,
      requestedEnd,
      status: "PENDING",
    },
    include: {
      listing: {
        include: {
          media: {
            where: { isHero: true },
            take: 1,
            include: {
              imageVersion: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
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
  });

  return booking;
}

/**
 * Get user's bookings (as buyer)
 */
export async function getBuyerBookings(
  buyerId: number,
  options?: {
    status?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { buyerId };
  if (options?.status) {
    where.status = options.status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        listing: {
          include: {
            media: {
              where: { isHero: true },
              take: 1,
              include: {
                imageVersion: true,
              },
            },
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
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
 * Get bookings for lister's listings
 */
export async function getListerBookings(
  listerId: number,
  options?: {
    status?: string;
    listingId?: number;
    page?: number;
    limit?: number;
  },
) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {
    listing: { userId: listerId },
  };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.listingId) {
    where.listingId = options.listingId;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        listing: {
          include: {
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
 * Update booking status (by lister)
 */
export async function updateBookingStatus(
  listerId: number,
  bookingId: number,
  status: "CONFIRMED" | "REJECTED" | "CANCELLED",
) {
  // Get booking and verify ownership
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: true,
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (booking.listing.userId !== listerId) {
    throw new Error("NOT_YOUR_BOOKING");
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    throw new Error("BOOKING_ALREADY_CLOSED");
  }

  // Update status
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: {
      listing: {
        include: {
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
  });

  return updated;
}

/**
 * Cancel booking (by buyer)
 */
export async function cancelBooking(buyerId: number, bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (booking.buyerId !== buyerId) {
    throw new Error("NOT_YOUR_BOOKING");
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    throw new Error("BOOKING_ALREADY_CLOSED");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  return updated;
}

/**
 * Get booking by ID
 */
export async function getBookingById(userId: number, bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        include: {
          media: {
            where: { isHero: true },
            take: 1,
            include: {
              imageVersion: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
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
  });

  if (!booking) {
    return null;
  }

  // Check if user has access (buyer or lister)
  if (booking.buyerId !== userId && booking.listing.userId !== userId) {
    return null;
  }

  return {
    ...booking,
    listing: {
      ...booking.listing,
      heroImage: booking.listing.media[0]?.imageVersion,
    },
  };
}
