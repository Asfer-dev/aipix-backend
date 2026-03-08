/**
 * Marketplace Service
 * Advanced filtering, search, and discovery for property listings
 */

import { Prisma } from "@prisma/client";
import prisma from "../../prisma";

export interface MarketplaceFilters {
  // Search
  search?: string;

  // Location
  city?: string;
  state?: string;
  country?: string;

  // Price Range
  minPrice?: number;
  maxPrice?: number;
  currency?: string;

  // Property Details
  propertyType?: string | string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;

  // Area
  minAreaSqm?: number;
  maxAreaSqm?: number;

  // Advanced Filters
  hasVirtualStaging?: boolean;
  hasEnhancedPhotos?: boolean;

  // Sorting
  sortBy?: "price" | "date" | "bedrooms" | "area" | "relevance";
  sortOrder?: "asc" | "desc";

  // Pagination
  page?: number;
  limit?: number;
}

export interface MarketplaceSearchResult {
  listings: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  filters: {
    availableCities: string[];
    availableStates: string[];
    availableCountries: string[];
    availablePropertyTypes: string[];
    priceRange: { min: number; max: number };
    bedroomRange: { min: number; max: number };
    bathroomRange: { min: number; max: number };
    areaRange: { min: number; max: number };
  };
}

/**
 * Search and filter marketplace listings with advanced options
 */
export async function searchMarketplaceListings(
  filters: MarketplaceFilters,
): Promise<MarketplaceSearchResult> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  // Build where clause with all filters
  const whereClause: Prisma.ListingWhereInput = {
    isPublished: true,
    status: "PUBLISHED",
  };

  // Text search (title, description, location)
  if (filters.search) {
    whereClause.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { locationCity: { contains: filters.search, mode: "insensitive" } },
      { locationState: { contains: filters.search, mode: "insensitive" } },
      { propertyType: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Location filters
  if (filters.city) {
    whereClause.locationCity = { equals: filters.city, mode: "insensitive" };
  }
  if (filters.state) {
    whereClause.locationState = { equals: filters.state, mode: "insensitive" };
  }
  if (filters.country) {
    whereClause.locationCountry = {
      equals: filters.country,
      mode: "insensitive",
    };
  }

  // Price range
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    whereClause.price = {};
    if (filters.minPrice !== undefined) {
      whereClause.price.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      whereClause.price.lte = filters.maxPrice;
    }
  }

  // Currency filter
  if (filters.currency) {
    whereClause.currency = filters.currency;
  }

  // Property type
  if (filters.propertyType) {
    if (Array.isArray(filters.propertyType)) {
      whereClause.propertyType = { in: filters.propertyType };
    } else {
      whereClause.propertyType = filters.propertyType;
    }
  }

  // Bedrooms range
  if (filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined) {
    whereClause.bedrooms = {};
    if (filters.minBedrooms !== undefined) {
      whereClause.bedrooms.gte = filters.minBedrooms;
    }
    if (filters.maxBedrooms !== undefined) {
      whereClause.bedrooms.lte = filters.maxBedrooms;
    }
  }

  // Bathrooms range
  if (
    filters.minBathrooms !== undefined ||
    filters.maxBathrooms !== undefined
  ) {
    whereClause.bathrooms = {};
    if (filters.minBathrooms !== undefined) {
      whereClause.bathrooms.gte = filters.minBathrooms;
    }
    if (filters.maxBathrooms !== undefined) {
      whereClause.bathrooms.lte = filters.maxBathrooms;
    }
  }

  // Area range
  if (filters.minAreaSqm !== undefined || filters.maxAreaSqm !== undefined) {
    whereClause.areaSqm = {};
    if (filters.minAreaSqm !== undefined) {
      whereClause.areaSqm.gte = filters.minAreaSqm;
    }
    if (filters.maxAreaSqm !== undefined) {
      whereClause.areaSqm.lte = filters.maxAreaSqm;
    }
  }

  // Advanced filters - has virtual staging
  if (filters.hasVirtualStaging) {
    whereClause.media = {
      some: {
        imageVersion: {
          type: "STAGED",
        },
      },
    };
  }

  // Advanced filters - has enhanced photos
  if (filters.hasEnhancedPhotos) {
    whereClause.media = {
      some: {
        imageVersion: {
          type: "ENHANCED",
        },
      },
    };
  }

  // Build order by clause
  let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: "desc" };

  if (filters.sortBy) {
    const order = filters.sortOrder || "desc";
    switch (filters.sortBy) {
      case "price":
        orderBy = { price: order };
        break;
      case "date":
        orderBy = { createdAt: order };
        break;
      case "bedrooms":
        orderBy = { bedrooms: order };
        break;
      case "area":
        orderBy = { areaSqm: order };
        break;
      case "relevance":
        orderBy = { createdAt: "desc" };
        break;
    }
  }

  // Execute query with pagination
  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        media: {
          where: { isHero: true },
          take: 1,
          include: {
            imageVersion: {
              select: {
                url: true,
                type: true,
              },
            },
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
            media: true,
          },
        },
      },
    }),
    prisma.listing.count({ where: whereClause }),
  ]);

  // Get available filter options
  const filterOptions = await getAvailableFilterOptions();

  const totalPages = Math.ceil(total / limit);

  return {
    listings: listings.map((listing) => ({
      ...listing,
      heroImage: listing.media[0]?.imageVersion,
      favoriteCount: listing._count.listingFavorites,
      bookingCount: listing._count.bookings,
      mediaCount: listing._count.media,
    })),
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
    filters: filterOptions,
  };
}

/**
 * Get available filter options from all published listings
 */
async function getAvailableFilterOptions() {
  const [
    cities,
    states,
    countries,
    propertyTypes,
    priceStats,
    bedroomStats,
    bathroomStats,
    areaStats,
  ] = await Promise.all([
    prisma.listing.findMany({
      where: { isPublished: true, locationCity: { not: null } },
      select: { locationCity: true },
      distinct: ["locationCity"],
    }),
    prisma.listing.findMany({
      where: { isPublished: true, locationState: { not: null } },
      select: { locationState: true },
      distinct: ["locationState"],
    }),
    prisma.listing.findMany({
      where: { isPublished: true, locationCountry: { not: null } },
      select: { locationCountry: true },
      distinct: ["locationCountry"],
    }),
    prisma.listing.findMany({
      where: { isPublished: true, propertyType: { not: null } },
      select: { propertyType: true },
      distinct: ["propertyType"],
    }),
    prisma.listing.aggregate({
      where: { isPublished: true, price: { not: null } },
      _min: { price: true },
      _max: { price: true },
    }),
    prisma.listing.aggregate({
      where: { isPublished: true, bedrooms: { not: null } },
      _min: { bedrooms: true },
      _max: { bedrooms: true },
    }),
    prisma.listing.aggregate({
      where: { isPublished: true, bathrooms: { not: null } },
      _min: { bathrooms: true },
      _max: { bathrooms: true },
    }),
    prisma.listing.aggregate({
      where: { isPublished: true, areaSqm: { not: null } },
      _min: { areaSqm: true },
      _max: { areaSqm: true },
    }),
  ]);

  return {
    availableCities: cities
      .map((c) => c.locationCity!)
      .filter(Boolean)
      .sort(),
    availableStates: states
      .map((s) => s.locationState!)
      .filter(Boolean)
      .sort(),
    availableCountries: countries
      .map((c) => c.locationCountry!)
      .filter(Boolean)
      .sort(),
    availablePropertyTypes: propertyTypes
      .map((p) => p.propertyType!)
      .filter(Boolean)
      .sort(),
    priceRange: {
      min: priceStats._min.price || 0,
      max: priceStats._max.price || 0,
    },
    bedroomRange: {
      min: bedroomStats._min.bedrooms || 0,
      max: bedroomStats._max.bedrooms || 0,
    },
    bathroomRange: {
      min: bathroomStats._min.bathrooms || 0,
      max: bathroomStats._max.bathrooms || 0,
    },
    areaRange: {
      min: areaStats._min.areaSqm || 0,
      max: areaStats._max.areaSqm || 0,
    },
  };
}

/**
 * Get single listing detail for marketplace
 */
export async function getPublicListingDetail(listingId: number) {
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      isPublished: true,
      status: "PUBLISHED",
    },
    include: {
      media: {
        orderBy: { sortOrder: "asc" },
        include: {
          imageVersion: {
            select: {
              id: true,
              url: true,
              type: true,
              metadata: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phoneNumber: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          listingFavorites: true,
          bookings: true,
        },
      },
    },
  });

  if (!listing) {
    return null;
  }

  // Apply privacy controls - conditionally show contact info based on listing preferences
  const userInfo: any = {
    id: listing.user.id,
    displayName: listing.user.displayName,
  };

  // Only show email if listing allows it
  if (listing.showEmail) {
    userInfo.email = listing.user.email;
  }

  // Only show phone number if listing allows it AND user has a phone number
  if (listing.showPhoneNumber && listing.user.phoneNumber) {
    userInfo.phoneNumber = listing.user.phoneNumber;
  }

  return {
    ...listing,
    user: userInfo,
    favoriteCount: listing._count.listingFavorites,
    bookingCount: listing._count.bookings,
  };
}

/**
 * Get similar listings based on location and property type
 */
export async function getSimilarListings(listingId: number, limit = 6) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      locationCity: true,
      locationState: true,
      propertyType: true,
      price: true,
    },
  });

  if (!listing) {
    return [];
  }

  const similarListings = await prisma.listing.findMany({
    where: {
      id: { not: listingId },
      isPublished: true,
      status: "PUBLISHED",
      OR: [
        { locationCity: listing.locationCity },
        { locationState: listing.locationState },
        { propertyType: listing.propertyType },
        listing.price
          ? {
              price: {
                gte: listing.price * 0.7,
                lte: listing.price * 1.3,
              },
            }
          : {},
      ],
    },
    take: limit * 2,
    include: {
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
        },
      },
    },
  });

  // Score and sort by similarity
  const scored = similarListings.map((l) => {
    let score = 0;
    if (l.locationCity === listing.locationCity) score += 3;
    if (l.locationState === listing.locationState) score += 2;
    if (l.propertyType === listing.propertyType) score += 2;
    if (listing.price && l.price) {
      const priceDiff = Math.abs(l.price - listing.price) / listing.price;
      if (priceDiff < 0.1) score += 2;
      else if (priceDiff < 0.3) score += 1;
    }
    return { listing: l, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      ...s.listing,
      heroImage: s.listing.media[0]?.imageVersion,
      favoriteCount: s.listing._count.listingFavorites,
    }));
}

/**
 * Get featured listings
 */
export async function getFeaturedListings(limit = 10) {
  return prisma.listing.findMany({
    where: {
      isPublished: true,
      status: "PUBLISHED",
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
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
  });
}

/**
 * Get autocomplete suggestions for search
 */
export async function getSearchSuggestions(query: string, limit = 10) {
  if (!query || query.length < 2) {
    return [];
  }

  const [titleSuggestions, citySuggestions, typeSuggestions] =
    await Promise.all([
      prisma.listing.findMany({
        where: {
          isPublished: true,
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          title: true,
        },
        take: 5,
      }),
      prisma.listing.findMany({
        where: {
          isPublished: true,
          locationCity: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          locationCity: true,
        },
        distinct: ["locationCity"],
        take: 3,
      }),
      prisma.listing.findMany({
        where: {
          isPublished: true,
          propertyType: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          propertyType: true,
        },
        distinct: ["propertyType"],
        take: 2,
      }),
    ]);

  return {
    listings: titleSuggestions.map((l) => ({
      type: "listing",
      text: l.title,
      id: l.id,
    })),
    cities: citySuggestions.map((c) => ({
      type: "city",
      text: c.locationCity!,
    })),
    propertyTypes: typeSuggestions.map((t) => ({
      type: "propertyType",
      text: t.propertyType!,
    })),
  };
}

// Backward compatibility
export interface MarketplaceFilter {
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
}

export async function listPublicListings(filters: MarketplaceFilter) {
  return searchMarketplaceListings({
    city: filters.city,
    country: filters.country,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minBedrooms: filters.bedrooms,
    maxBedrooms: filters.bedrooms,
  }).then((result) => result.listings);
}
