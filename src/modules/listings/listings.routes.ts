import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  attachMediaHandler,
  createListingHandler,
  createListingWithMediaHandler, // NEW
  getMarketplaceListingHandler,
  getMyListingHandler,
  listMarketplaceHandler,
  listMyListingsHandler,
  updateListingHandler,
} from "./listings.controller";

const router = Router();

// Public marketplace
router.get("/marketplace/listings", listMarketplaceHandler);
router.get("/marketplace/listings/:id", getMarketplaceListingHandler);

// Lister routes (protected)
router.get("/", authMiddleware, listMyListingsHandler);
router.post("/", authMiddleware, createListingHandler);
router.post(
  "/listings-with-media",
  authMiddleware,
  createListingWithMediaHandler
); // NEW
router.get("/:id", authMiddleware, getMyListingHandler);
router.patch("/:id", authMiddleware, updateListingHandler);
router.post("/:id/media", authMiddleware, attachMediaHandler);

export default router;
