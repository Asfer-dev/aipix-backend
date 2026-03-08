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
  showEmail?: boolean; // Show lister's email to buyers (default: true)
  showPhoneNumber?: boolean; // Show lister's phone to buyers (default: false)
}

/**
 * Create a listing for a user, tied to a project.
 * Always starts as DRAFT with moderationStatus PENDING.
 * Call POST /listings/:id/publish to enter the moderation pipeline.
 */
export async function createListingForUser(
  userId: number,
  input: ListingInput,
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
      showEmail: input.showEmail ?? true, // Default: show email
      showPhoneNumber: input.showPhoneNumber ?? false, // Default: hide phone
      moderationStatus: "PENDING",
      isPublished: false,
      // status defaults to DRAFT from Prisma
    },
  });

  return { listing };
}

/**
 * Publish a listing — runs AI moderation pipeline.
 * - APPROVED (score < 0.3): auto-publishes immediately
 * - FLAGGED (score 0.3–0.7): queued for manual admin review
 * - REJECTED (score >= 0.7): throws error
 */
export async function publishListing(userId: number, listingId: number) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { media: true },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  if (listing.isPublished) {
    throw new Error("ALREADY_PUBLISHED");
  }

  if (!listing.media || listing.media.length === 0) {
    throw new Error("NO_MEDIA_ATTACHED");
  }

  // TODO: Remove mock — force FLAGGED for testing purposes
  const moderationResult = {
    status: "FLAGGED" as const,
    score: 0.5,
    flags: ["TESTING_MODE"],
    reasons: [],
  };

  // Run AI moderation (disabled during testing)
  // const moderationResult = await moderateListing({
  //   title: listing.title,
  //   description: listing.description || "",
  //   location:
  //     [listing.locationCity, listing.locationState, listing.locationCountry]
  //       .filter(Boolean)
  //       .join(", ") || "",
  //   userId,
  // });

  const score = moderationResult.score;
  let moderationStatus: string;
  let isPublished = false;
  let status: string = "DRAFT";

  if (score >= 0.7 || moderationResult.status === "REJECTED") {
    // High risk — reject
    moderationStatus = "REJECTED";

    await prisma.moderationLog.create({
      data: {
        listingId,
        userId,
        moderationType: "LISTING",
        status: "REJECTED",
        aiScore: score,
        aiFlags: moderationResult.flags,
        aiModel: "content-moderator-v1",
      },
    });

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        moderationStatus: "REJECTED",
        moderationScore: score,
        aiModerationFlags: moderationResult.flags,
        moderatedAt: new Date(),
        autoModerated: true,
      },
    });

    throw new Error("CONTENT_REJECTED: " + moderationResult.reasons.join(", "));
  } else if (score >= 0.3 || moderationResult.status === "FLAGGED") {
    // Medium risk — flag for manual review
    moderationStatus = "FLAGGED";
    isPublished = false;
    status = "DRAFT";
  } else {
    // Low risk — auto-approve and publish
    moderationStatus = "APPROVED";
    isPublished = true;
    status = "PUBLISHED";
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      moderationStatus,
      moderationScore: score,
      aiModerationFlags: moderationResult.flags,
      moderatedAt: new Date(),
      autoModerated: true,
      isPublished,
      status: status as any,
    },
  });

  // Log moderation result
  await prisma.moderationLog.create({
    data: {
      listingId,
      userId,
      moderationType: "LISTING",
      status: moderationStatus,
      aiScore: score,
      aiFlags: moderationResult.flags,
      aiModel: "content-moderator-v1",
    },
  });

  return {
    listing: updated,
    moderation: {
      status: moderationStatus,
      score,
      flags: moderationResult.flags,
      autoPublished: isPublished,
      message:
        moderationStatus === "APPROVED"
          ? "Your listing is now live."
          : "Your listing is under review. It will be published once approved by a moderator.",
    },
  };
}

/**
 * List listings created by the current user (owner view)
 * Includes the hero image (or first image if no hero is set)
 */
export async function listMyListings(userId: number) {
  return prisma.listing.findMany({
    where: { userId },
    include: {
      media: {
        orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
        take: 1,
        include: { imageVersion: true },
      },
    },
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
  data: Partial<ListingInput> & { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" },
) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, userId },
  });

  if (!listing) {
    throw new Error("LISTING_NOT_FOUND");
  }

  // Prevent direct publish via PATCH — use POST /:id/publish instead
  if (data.status === "PUBLISHED") {
    throw new Error("USE_PUBLISH_ENDPOINT");
  }

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
      showEmail: data.showEmail ?? listing.showEmail,
      showPhoneNumber: data.showPhoneNumber ?? listing.showPhoneNumber,
      status: (data.status as any) ?? listing.status,
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
  heroImageVersionId?: number,
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
        }),
      ),
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
  input: CreateListingWithMediaInput,
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
        showEmail: listingInput.showEmail ?? true, // Default: show email
        showPhoneNumber: listingInput.showPhoneNumber ?? false, // Default: hide phone
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
        }),
      ),
    );

    return { listing, media };
  });

  return result;
}
