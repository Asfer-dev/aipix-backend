import prisma from "../../prisma";

export interface MarketplaceFilter {
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
}

export async function listPublicListings(filters: MarketplaceFilter) {
  const priceFilter: any = {};
  if (filters.minPrice != null) priceFilter.gte = filters.minPrice;
  if (filters.maxPrice != null) priceFilter.lte = filters.maxPrice;

  return prisma.listing.findMany({
    where: {
      isPublished: true,
      status: "PUBLISHED",
      ...(filters.city ? { locationCity: filters.city } : {}),
      ...(filters.country ? { locationCountry: filters.country } : {}),
      ...(Object.keys(priceFilter).length ? { price: priceFilter } : {}),
      ...(filters.bedrooms != null ? { bedrooms: filters.bedrooms } : {}),
    },
    include: {
      media: {
        where: { isHero: true },
        include: { imageVersion: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicListingDetail(listingId: number) {
  return prisma.listing.findFirst({
    where: {
      id: listingId,
      isPublished: true,
      status: "PUBLISHED",
    },
    include: {
      media: {
        orderBy: { sortOrder: "asc" },
        include: { imageVersion: true },
      },
      project: true,
    },
  });
}
