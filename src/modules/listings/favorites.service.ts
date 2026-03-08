/**
 * Favorites Service
 * Manage user's favorite listings
 */

import prisma from "../../prisma";

/**
 * Add listing to favorites
 */
export async function addFavorite(userId: number, listingId: number) {
  // Check if listing exists and is published
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      isPublished: true,
      status: "PUBLISHED",
    },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Check if already favorited
  const existing = await prisma.listingFavorite.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  if (existing) {
    throw new Error("ALREADY_FAVORITED");
  }

  // Add favorite
  const favorite = await prisma.listingFavorite.create({
    data: {
      userId,
      listingId,
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
        },
      },
    },
  });

  return favorite;
}

/**
 * Remove listing from favorites
 */
export async function removeFavorite(userId: number, listingId: number) {
  const favorite = await prisma.listingFavorite.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  if (!favorite) {
    throw new Error("NOT_FAVORITED");
  }

  await prisma.listingFavorite.delete({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  return { success: true };
}

/**
 * Get user's favorite listings
 */
export async function getUserFavorites(
  userId: number,
  options?: {
    page?: number;
    limit?: number;
  },
) {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    prisma.listingFavorite.findMany({
      where: { userId },
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
              },
            },
            _count: {
              select: {
                listingFavorites: true,
                bookings: true,
              },
            },
          },
        },
      },
    }),
    prisma.listingFavorite.count({ where: { userId } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    favorites: favorites.map((f: any) => ({
      ...f.listing,
      favorited: true,
      favoritedAt: f.createdAt,
      heroImage: f.listing.media[0]?.imageVersion,
      favoriteCount: f.listing._count.listingFavorites,
      bookingCount: f.listing._count.bookings,
    })),
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Check if user has favorited a listing
 */
export async function isFavorited(userId: number, listingId: number) {
  const favorite = await prisma.listingFavorite.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  return !!favorite;
}

/**
 * Get favorite listings IDs for user (for bulk checking)
 */
export async function getUserFavoriteIds(userId: number) {
  const favorites = await prisma.listingFavorite.findMany({
    where: { userId },
    select: { listingId: true },
  });

  return favorites.map((f: any) => f.listingId);
}
