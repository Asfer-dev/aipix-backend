import { Request, Response } from "express";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  attachMediaToListing,
  createListingForUser,
  createListingWithMediaForUser,
  getListingForUser,
  getPublicListingDetail,
  listMyListings,
  listPublicListings,
  updateListingForUser,
} from "./listings.service";

// import {
//   getPublicListingDetail,
//   listPublicListings,
// } from "./marketplace.service";

// Lister endpoints

export async function createListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      projectId,
      title,
      description,
      price,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      bedrooms,
      bathrooms,
      areaSqm,
    } = req.body;

    if (!projectId || !title) {
      return res
        .status(400)
        .json({ error: "projectId and title are required" });
    }

    const payload: any = {
      projectId: Number(projectId),
      title,
      description,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
    };

    if (price != null) payload.price = Number(price);
    if (bedrooms != null) payload.bedrooms = Number(bedrooms);
    if (bathrooms != null) payload.bathrooms = Number(bathrooms);
    if (areaSqm != null) payload.areaSqm = Number(areaSqm);

    const listing = await createListingForUser(user.id, payload);

    return res.status(201).json({ listing });
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("createListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function listMyListingsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listings = await listMyListings(user.id);
    return res.json({ listings });
  } catch (err) {
    console.error("listMyListingsHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await getListingForUser(user.id, listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    return res.json({ listing });
  } catch (err) {
    console.error("getMyListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateListingHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const updated = await updateListingForUser(user.id, listingId, req.body);
    return res.json({ listing: updated });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    console.error("updateListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function attachMediaHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const { imageVersionIds, heroImageVersionId } = req.body;

    if (!Array.isArray(imageVersionIds) || imageVersionIds.length === 0) {
      return res.status(400).json({ error: "imageVersionIds is required" });
    }

    const media = await attachMediaToListing(
      user.id,
      listingId,
      imageVersionIds.map(Number),
      heroImageVersionId != null ? Number(heroImageVersionId) : undefined
    );

    return res.status(201).json({ media });
  } catch (err: any) {
    if (err.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (err.message === "INVALID_IMAGE_VERSIONS") {
      return res
        .status(400)
        .json({ error: "Some image versions do not belong to this project" });
    }
    console.error("attachMediaHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Public marketplace

export async function listMarketplaceHandler(req: Request, res: Response) {
  try {
    const rawFilters = {
      city: req.query.city as string | undefined,
      country: req.query.country as string | undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : undefined,
    };

    // Remove keys with undefined so the target type won't receive explicit undefined values
    const filters = Object.fromEntries(
      Object.entries(rawFilters).filter(([, v]) => v !== undefined)
    ) as any;

    const listings = await listPublicListings(filters);
    return res.json({ listings });
  } catch (err) {
    console.error("listMarketplaceHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMarketplaceListingHandler(
  req: Request,
  res: Response
) {
  try {
    const listingId = Number(req.params.id);
    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id" });
    }

    const listing = await getPublicListingDetail(listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    return res.json({ listing });
  } catch (err) {
    console.error("getMarketplaceListingHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createListingWithMediaHandler(
  req: Request,
  res: Response
) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      projectId,
      title,
      description,
      price,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      bedrooms,
      bathrooms,
      areaSqm,
      imageVersionIds,
      heroImageVersionId,
    } = req.body;

    if (!projectId || !title) {
      return res
        .status(400)
        .json({ error: "projectId and title are required" });
    }

    if (!Array.isArray(imageVersionIds) || imageVersionIds.length === 0) {
      return res.status(400).json({ error: "imageVersionIds is required" });
    }

    const payload = {
      projectId: Number(projectId),
      title,
      description,
      currency,
      locationCity,
      locationState,
      locationCountry,
      propertyType,
      price: price != null ? Number(price) : undefined,
      bedrooms: bedrooms != null ? Number(bedrooms) : undefined,
      bathrooms: bathrooms != null ? Number(bathrooms) : undefined,
      areaSqm: areaSqm != null ? Number(areaSqm) : undefined,
      imageVersionIds: imageVersionIds.map(Number),
      heroImageVersionId:
        heroImageVersionId != null ? Number(heroImageVersionId) : undefined,
    };

    const result = await createListingWithMediaForUser(user.id, payload as any);

    return res.status(201).json(result); // { listing, media }
  } catch (err: any) {
    if (err.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res.status(404).json({ error: "Project not found" });
    }
    if (err.message === "INVALID_IMAGE_VERSIONS") {
      return res
        .status(400)
        .json({ error: "Some image versions do not belong to this project" });
    }
    console.error("createListingWithMediaHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
