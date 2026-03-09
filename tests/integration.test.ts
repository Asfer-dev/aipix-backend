// tests/integration.test.ts
import request from "supertest";
import prisma from "../src/prisma";
import { cleanupDatabase, generateTestToken } from "./setup";

const app = require("../src/server");

describe("Integration Tests - End-to-End Workflows", () => {
  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // INT-001: Full LISTER workflow - signup to listing creation
  it("INT-001: should complete full LISTER workflow", async () => {
    // 1. Register as LISTER
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "lister-flow@example.com",
      password: "SecurePass123!",
      displayName: "Integration Lister",
      primaryRole: "LISTER",
    });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.data.id;

    // 2. Login
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "lister-flow@example.com",
      password: "SecurePass123!",
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;

    // 3. Create subscription
    const plan = await prisma.plan.create({
      data: {
        name: "Integration Plan",
        monthlyPriceUsd: 99.99,
        maxAiCredits: 10000,
        maxStorageMb: 50000,
      },
    });

    const subRes = await request(app)
      .post("/api/billing/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ planId: plan.id });

    expect(subRes.status).toBe(201);

    // 4. Create project
    const projRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Integration Villa Project",
        clientName: "Jane Doe",
      });

    expect(projRes.status).toBe(201);
    const projectId = projRes.body.data.id;

    // 5. Add image to project
    const image = await prisma.image.create({
      data: {
        projectId,
        originalUrl: "https://s3.aws.com/villa-front.jpg",
        label: "Front view",
      },
    });

    // 6. Create enhancement job
    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        projectId,
        imageId: image.id,
        type: "ENHANCEMENT",
      });

    expect(jobRes.status).toBe(201);

    // 7. Create listing
    const listingRes = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        projectId,
        title: "Beautiful Villa for Sale",
        description: "Stunning property with ocean views",
        price: 2500000,
        currency: "USD",
        locationCity: "Malibu",
        propertyType: "Villa",
        bedrooms: 4,
        bathrooms: 3,
      });

    expect(listingRes.status).toBe(201);
    expect(listingRes.body.data.title).toContain("Villa");
  });

  // INT-002: Full BUYER workflow - browse to booking
  it("INT-002: should complete full BUYER workflow", async () => {
    // Setup: Create a published listing
    const lister = await prisma.user.create({
      data: {
        email: "lister-setup@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Setup Lister",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const project = await prisma.project.create({
      data: {
        name: "Buyer Test Project",
        userId: lister.id,
      },
    });

    const listing = await prisma.listing.create({
      data: {
        userId: lister.id,
        projectId: project.id,
        title: "Apartment for Rent",
        description: "2BR apartment",
        price: 2500,
        currency: "USD",
        isPublished: true,
        locationCity: "Los Angeles",
        propertyType: "Apartment",
        bedrooms: 2,
        bathrooms: 1,
      },
    });

    // 1. Register as BUYER
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "buyer-flow@example.com",
      password: "SecurePass123!",
      displayName: "Integration Buyer",
      primaryRole: "BUYER",
    });

    expect(registerRes.status).toBe(201);

    // 2. Login
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "buyer-flow@example.com",
      password: "SecurePass123!",
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;

    // 3. Browse marketplace
    const browseRes = await request(app).get("/api/marketplace");

    expect(browseRes.status).toBe(200);
    expect(browseRes.body.data).toBeInstanceOf(Array);

    // 4. View listing details
    const detailRes = await request(app).get(`/api/marketplace/${listing.id}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.title).toBe("Apartment for Rent");

    // 5. Add to favorites
    const favRes = await request(app)
      .post(`/api/listings/${listing.id}/favorite`)
      .set("Authorization", `Bearer ${token}`);

    expect(favRes.status).toBe(201);

    // 6. Send message to lister
    const msgRes = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({
        listingId: listing.id,
        receiverId: lister.id,
        content: "Is this property available next month?",
      });

    expect(msgRes.status).toBe(201);

    // 7. Create booking request
    const bookingRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        listingId: listing.id,
        requestedStart: new Date("2025-02-01"),
        requestedEnd: new Date("2025-02-28"),
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.data.status).toBe("PENDING");
  });

  // INT-003: Multi-role user scenario
  it("INT-003: should handle user with multiple roles", async () => {
    const multiRoleUser = await prisma.user.create({
      data: {
        email: "multirole@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Multi Role User",
        primaryRole: "LISTER",
        roles: ["BUYER", "LISTER"],
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(multiRoleUser.id);

    // Can create projects (LISTER capability)
    const projRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Multi-role Project" });

    expect(projRes.status).toBe(201);

    // Can browse marketplace (BUYER capability)
    const browseRes = await request(app).get("/api/marketplace");

    expect(browseRes.status).toBe(200);
  });

  // INT-004: Data consistency across modules
  it("INT-004: should maintain data consistency", async () => {
    const user = await prisma.user.create({
      data: {
        email: "consistency@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Consistency User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const plan = await prisma.plan.create({
      data: {
        name: "Consistency Plan",
        monthlyPriceUsd: 49.99,
        maxAiCredits: 5000,
        maxStorageMb: 25000,
      },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        startDate: new Date(),
        isActive: true,
        currentCreditsUsed: 100,
        currentStorageMb: 500,
      },
    });

    // Verify linked data is consistent
    const subWithPlan = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { plan: true, user: true },
    });

    expect(subWithPlan!.plan.name).toBe("Consistency Plan");
    expect(subWithPlan!.user.email).toBe("consistency@example.com");
    expect(subWithPlan!.currentCreditsUsed).toBe(100);
  });

  // INT-005: Concurrent operations
  it("INT-005: should handle concurrent requests", async () => {
    const user = await prisma.user.create({
      data: {
        email: "concurrent@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Concurrent User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(user.id);

    // Create multiple projects concurrently
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post("/api/projects")
          .set("Authorization", `Bearer ${token}`)
          .send({ name: `Concurrent Project ${i}` }),
      );
    }

    const results = await Promise.all(promises);

    results.forEach((res) => {
      expect(res.status).toBe(201);
    });

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
    });

    expect(projects).toHaveLength(5);
  });

  // INT-006: Error recovery
  it("INT-006: should recover from errors gracefully", async () => {
    const user = await prisma.user.create({
      data: {
        email: "errortest@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Error Test User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(user.id);

    // Try to create project with invalid data
    const badRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" }); // Empty name should fail

    expect(badRes.status).toBeGreaterThanOrEqual(400);

    // Should still be able to create valid project after error
    const goodRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Valid Project" });

    expect(goodRes.status).toBe(201);
  });

  // INT-007: Role-based access control
  it("INT-007: should enforce role-based access", async () => {
    const buyer = await prisma.user.create({
      data: {
        email: "roletest-buyer@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "RBAC Buyer",
        primaryRole: "BUYER",
        roles: ["BUYER"],
        emailVerifiedAt: new Date(),
      },
    });

    const buyerToken = generateTestToken(buyer.id);

    // BUYER should not be able to create projects
    const projRes = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ name: "Unauthorized Project" });

    expect(projRes.status).toBeGreaterThanOrEqual(403);
  });

  // INT-008: Authentication flow
  it("INT-008: should require authentication for protected routes", async () => {
    // Try to access protected endpoint without token
    const noAuthRes = await request(app).get("/api/projects");

    expect(noAuthRes.status).toBe(401);

    // With token should work
    const user = await prisma.user.create({
      data: {
        email: "authflow@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Auth Flow User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(user.id);

    const authRes = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${token}`);

    expect(authRes.status).toBe(200);
  });

  // INT-009: Data deletion cascade
  it("INT-009: should respect cascade deletion rules", async () => {
    const user = await prisma.user.create({
      data: {
        email: "cascade@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Cascade User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const project = await prisma.project.create({
      data: {
        name: "Cascade Project",
        userId: user.id,
      },
    });

    await prisma.image.createMany({
      data: [
        { projectId: project.id, originalUrl: "https://s3.aws.com/img1.jpg" },
        { projectId: project.id, originalUrl: "https://s3.aws.com/img2.jpg" },
      ],
    });

    // Delete project
    await prisma.project.delete({ where: { id: project.id } });

    // Images should be deleted (if cascade configured)
    const images = await prisma.image.findMany({
      where: { projectId: project.id },
    });

    expect(images).toHaveLength(0);
  });

  // INT-010: Performance under load
  it("INT-010: should handle bulk operations efficiently", async () => {
    const user = await prisma.user.create({
      data: {
        email: "bulk@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Bulk User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const project = await prisma.project.create({
      data: {
        name: "Bulk Project",
        userId: user.id,
      },
    });

    // Create 50 images in bulk
    const images = [];
    for (let i = 0; i < 50; i++) {
      images.push({
        projectId: project.id,
        originalUrl: `https://s3.aws.com/bulk-${i}.jpg`,
      });
    }

    const start = Date.now();
    await prisma.image.createMany({ data: images });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

    const count = await prisma.image.count({
      where: { projectId: project.id },
    });

    expect(count).toBe(50);
  });
});
