// tests/marketplace-admin.test.ts
import request from "supertest";
import prisma from "../src/prisma";
import { cleanupDatabase, createTestUser, generateTestToken } from "./setup";

const app = require("../src/server");

describe("Marketplace & Admin Module", () => {
  let listerUser: any;
  let listerToken: string;
  let buyerUser: any;
  let buyerToken: string;
  let adminUser: any;
  let adminToken: string;
  let project: any;
  let listing: any;

  beforeEach(async () => {
    await cleanupDatabase(prisma);

    listerUser = await createTestUser(prisma, "LISTER");
    listerToken = generateTestToken(listerUser.id);

    buyerUser = await createTestUser(prisma, "BUYER");
    buyerToken = generateTestToken(buyerUser.id);

    adminUser = await prisma.user.create({
      data: {
        email: "admin@example.com",
        passwordHash: await require("bcryptjs").hash("Admin123!", 10),
        displayName: "Admin User",
        primaryRole: "ADMIN",
        roles: ["ADMIN", "LISTER"],
        emailVerifiedAt: new Date(),
      },
    });
    adminToken = generateTestToken(adminUser.id);

    // Create test project
    project = await prisma.project.create({
      data: {
        name: "Marketplace Test Project",
        userId: listerUser.id,
      },
    });

    // Create test listing
    listing = await prisma.listing.create({
      data: {
        userId: listerUser.id,
        projectId: project.id,
        title: "Luxury Villa in Malibu",
        description: "Stunning ocean view property",
        price: 2500000,
        currency: "USD",
        status: "DRAFT",
        isPublished: false,
        locationCity: "Malibu",
        locationState: "California",
        locationCountry: "USA",
        propertyType: "Villa",
        bedrooms: 4,
        bathrooms: 3,
        areaSqm: 350,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // MKT-001: Create listing
  it("MKT-001: should create a new listing", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        projectId: project.id,
        title: "Modern Apartment",
        description: "2BR apartment in downtown",
        price: 850000,
        currency: "USD",
        locationCity: "Los Angeles",
        propertyType: "Apartment",
        bedrooms: 2,
        bathrooms: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.title).toBe("Modern Apartment");
  });

  // MKT-002: Get marketplace listings
  it("MKT-002: should get all published listings", async () => {
    // Publish the listing
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true, status: "PUBLISHED" },
    });

    const res = await request(app).get("/api/marketplace");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // MKT-003: Search listings by keyword
  it("MKT-003: should search listings by keyword", async () => {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true },
    });

    const res = await request(app).get("/api/marketplace?search=villa");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // MKT-004: Filter by price range
  it("MKT-004: should filter listings by price range", async () => {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true },
    });

    const res = await request(app).get(
      "/api/marketplace?minPrice=2000000&maxPrice=3000000",
    );

    expect(res.status).toBe(200);
  });

  // MKT-005: Filter by city
  it("MKT-005: should filter listings by city", async () => {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true },
    });

    const res = await request(app).get("/api/marketplace?city=Malibu");

    expect(res.status).toBe(200);
  });

  // MKT-006: Get listing details
  it("MKT-006: should get listing details", async () => {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true },
    });

    const res = await request(app).get(`/api/marketplace/${listing.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Luxury Villa in Malibu");
  });

  // MKT-007: Add listing to favorites
  it("MKT-007: should add listing to favorites", async () => {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { isPublished: true },
    });

    const res = await request(app)
      .post(`/api/listings/${listing.id}/favorite`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(201);
  });

  // MKT-008: Get user favorites
  it("MKT-008: should get user's favorite listings", async () => {
    await prisma.listingFavorite.create({
      data: {
        userId: buyerUser.id,
        listingId: listing.id,
      },
    });

    const res = await request(app)
      .get("/api/listings/favorites")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // MKT-009: Create booking
  it("MKT-009: should create a booking request", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        listingId: listing.id,
        requestedStart: new Date("2025-01-15"),
        requestedEnd: new Date("2025-01-16"),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
  });

  // MKT-010: Send message about listing
  it("MKT-010: should send message to lister", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        listingId: listing.id,
        receiverId: listerUser.id,
        content: "Is this property still available?",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toContain("available");
  });

  // MKT-011: Pagination
  it("MKT-011: should support pagination", async () => {
    const res = await request(app).get("/api/marketplace?limit=10&offset=0");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pagination");
  });

  // ADM-001: Get all users (admin)
  it("ADM-001: should get all users as admin", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // ADM-002: Deactivate user (admin)
  it("ADM-002: should deactivate a user", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${listerUser.id}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({
      where: { id: listerUser.id },
    });
    expect(updated!.isActive).toBe(false);
  });

  // ADM-003: Approve listing (admin)
  it("ADM-003: should approve a listing", async () => {
    const res = await request(app)
      .patch(`/api/admin/listings/${listing.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  // ADM-004: Reject listing (admin)
  it("ADM-004: should reject a listing", async () => {
    const res = await request(app)
      .patch(`/api/admin/listings/${listing.id}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Inappropriate content" });

    expect(res.status).toBe(200);
  });

  // ADM-005: Get system metrics
  it("ADM-005: should get system metrics", async () => {
    const res = await request(app)
      .get("/api/admin/metrics")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalUsers");
    expect(res.body.data).toHaveProperty("totalListings");
  });

  // ADM-006: Get user analytics
  it("ADM-006: should get user analytics", async () => {
    const res = await request(app)
      .get("/api/admin/analytics/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("byRole");
  });

  // ADM-007: Get revenue analytics
  it("ADM-007: should get revenue analytics", async () => {
    const res = await request(app)
      .get("/api/admin/analytics/revenue")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalRevenue");
  });

  // ADM-008: Get moderation queue
  it("ADM-008: should get moderation queue", async () => {
    const res = await request(app)
      .get("/api/admin/moderation/queue")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // ADM-009: Get audit logs
  it("ADM-009: should get audit logs", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // ADM-010: Dashboard overview
  it("ADM-010: should get admin dashboard data", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("overview");
  });
});
