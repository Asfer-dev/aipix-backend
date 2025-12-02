import prisma from "../../prisma";

export interface ListingInput {
  projectId: number;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
}

/**
 * Create a listing for a user, tied to a project.
 * Copy is stored on the listing itself (independent from project ad copy).
 */
export async function createListingForUser(
  userId: number,
  input: ListingInput
) {
  // Ensure the project belongs to this user
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
  }

  const listing = await prisma.listing.create({
    data: {
      userId,
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      price: input.price ?? null,
      currency: input.currency ?? null,
      locationCity: input.locationCity ?? null,
      locationState: input.locationState ?? null,
      locationCountry: input.locationCountry ?? null,
      propertyType: input.propertyType ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      areaSqm: input.areaSqm ?? null,
      // status & isPublished come from Prisma defaults:
      // status: DRAFT, isPublished: false
    },
  });

  return listing;
}

/**
 * List listings created by the current user (owner view)
 */
export async function listMyListings(userId: number) {
  return prisma.listing.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single listing for the owner (with its media + image versions)
 */
export async function getListingForUser(userId: number, listingId: number) {
  return prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { media: { include: { imageVersion: true } } },
  });
}

/**
 * Update a listing’s fields and optionally publish it.
 * Publishing sets status = "PUBLISHED" and isPublished = true.
 */
export async function updateListingForUser(
  userId: number,
  listingId: number,
  data: Partial<ListingInput> & { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" }
) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  const isPublishing = data.status === "PUBLISHED";

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      title: data.title ?? listing.title,
      description: data.description ?? listing.description,
      price: data.price ?? listing.price,
      currency: data.currency ?? listing.currency,
      locationCity: data.locationCity ?? listing.locationCity,
      locationState: data.locationState ?? listing.locationState,
      locationCountry: data.locationCountry ?? listing.locationCountry,
      propertyType: data.propertyType ?? listing.propertyType,
      bedrooms: data.bedrooms ?? listing.bedrooms,
      bathrooms: data.bathrooms ?? listing.bathrooms,
      areaSqm: data.areaSqm ?? listing.areaSqm,
      status: (data.status as any) ?? listing.status,
      isPublished: isPublishing ? true : listing.isPublished,
    },
  });

  return updated;
}

/**
 * Attach media to a listing.
 * Only image versions from the same project can be attached.
 */
export async function attachMediaToListing(
  userId: number,
  listingId: number,
  imageVersionIds: number[],
  heroImageVersionId?: number
) {
  if (imageVersionIds.length === 0) {
    throw new Error("NO_IMAGES");
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { project: true },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // validate versions belong to images of same project as listing.projectId
  const versions = await prisma.imageVersion.findMany({
    where: {
      id: { in: imageVersionIds },
      image: {
        projectId: listing.projectId,
      },
    },
    include: {
      image: true,
    },
  });

  if (versions.length !== imageVersionIds.length) {
    throw new Error("INVALID_IMAGE_VERSIONS");
  }

  const heroId =
    heroImageVersionId && imageVersionIds.includes(heroImageVersionId)
      ? heroImageVersionId
      : imageVersionIds[0];

  // Clear existing media and recreate
  const media = await prisma.$transaction(async (tx) => {
    await tx.listingMedia.deleteMany({
      where: { listingId },
    });

    const created = await Promise.all(
      imageVersionIds.map((versionId, idx) =>
        tx.listingMedia.create({
          data: {
            listingId,
            imageVersionId: versionId,
            sortOrder: idx,
            isHero: versionId === heroId,
          },
          include: { imageVersion: true },
        })
      )
    );

    return created;
  });

  return media;
}

/**
 * =========================
 * PUBLIC MARKETPLACE QUERIES
 * =========================
 */

export interface MarketplaceFilter {
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
}

/**
 * List public listings for marketplace home/search page
 */
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

/**
 * Get full public listing detail for marketplace detail page
 */
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

/**
 * =========================
 * OPTIONAL: create listing + attach media in ONE step
 * (handy for the "Create Listing" wizard)
 * =========================
 */

export interface CreateListingWithMediaInput extends ListingInput {
  imageVersionIds: number[];
  heroImageVersionId?: number;
}

/**
 * Create a listing AND attach media in one go.
 * - Checks project ownership
 * - Validates that imageVersionIds belong to that project
 */
export async function createListingWithMediaForUser(
  userId: number,
  input: CreateListingWithMediaInput
) {
  const { imageVersionIds, heroImageVersionId, ...listingInput } = input;

  if (!imageVersionIds.length) {
    throw new Error("NO_IMAGES");
  }

  // Ensure project belongs to user
  const project = await prisma.project.findFirst({
    where: { id: listingInput.projectId, userId },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
  }

  // Validate image versions belong to this project
  const versions = await prisma.imageVersion.findMany({
    where: {
      id: { in: imageVersionIds },
      image: { projectId: listingInput.projectId },
    },
  });

  if (versions.length !== imageVersionIds.length) {
    throw new Error("INVALID_IMAGE_VERSIONS");
  }

  const heroId =
    heroImageVersionId && imageVersionIds.includes(heroImageVersionId)
      ? heroImageVersionId
      : imageVersionIds[0];

  // Create listing + media in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        userId,
        projectId: listingInput.projectId,
        title: listingInput.title,
        description: listingInput.description ?? null,
        price: listingInput.price ?? null,
        currency: listingInput.currency ?? null,
        locationCity: listingInput.locationCity ?? null,
        locationState: listingInput.locationState ?? null,
        locationCountry: listingInput.locationCountry ?? null,
        propertyType: listingInput.propertyType ?? null,
        bedrooms: listingInput.bedrooms ?? null,
        bathrooms: listingInput.bathrooms ?? null,
        areaSqm: listingInput.areaSqm ?? null,
      },
    });

    const media = await Promise.all(
      imageVersionIds.map((versionId, idx) =>
        tx.listingMedia.create({
          data: {
            listingId: listing.id,
            imageVersionId: versionId,
            sortOrder: idx,
            isHero: versionId === heroId,
          },
        })
      )
    );

    return { listing, media };
  });

  return result;
}
