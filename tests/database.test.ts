// tests/database.test.ts
import prisma from "../src/prisma";
import { cleanupDatabase, createTestUser } from "./setup";

describe("Database Tests", () => {
  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // DB-001: Referential integrity on cascade delete
  it("DB-001: should cascade delete related records", async () => {
    const user = await createTestUser(prisma, "LISTER");

    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        userId: user.id,
      },
    });

    await prisma.image.create({
      data: {
        projectId: project.id,
        originalUrl: "https://s3.aws.com/test.jpg",
      },
    });

    // Delete user
    await prisma.user.delete({ where: { id: user.id } });

    // Check that project and images are deleted (if cascade is configured)
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
    });
    expect(projects).toHaveLength(0);
  });

  // DB-002: Unique constraint enforcement
  it("DB-002: should enforce unique email constraint", async () => {
    const email = "duplicate@example.com";

    await prisma.user.create({
      data: {
        email,
        passwordHash: "hash123",
        displayName: "User 1",
        primaryRole: "BUYER",
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email, // Duplicate
          passwordHash: "hash456",
          displayName: "User 2",
          primaryRole: "LISTER",
        },
      }),
    ).rejects.toThrow();
  });

  // DB-003: Nullable fields
  it("DB-003: should allow nullable fields", async () => {
    const user = await prisma.user.create({
      data: {
        email: "nullable@example.com",
        passwordHash: "hash123",
        displayName: "Nullable User",
        primaryRole: "BUYER",
        phoneNumber: null, // Optional field
        mfaSecret: null,
      },
    });

    expect(user.phoneNumber).toBeNull();
    expect(user.mfaSecret).toBeNull();
  });

  // DB-004: Query performance with indexes
  it("DB-004: should efficiently query indexed fields", async () => {
    // Create many users
    const users = [];
    for (let i = 0; i < 100; i++) {
      users.push({
        email: `user${i}@example.com`,
        passwordHash: "hash123",
        displayName: `User ${i}`,
        primaryRole: i % 2 === 0 ? ("BUYER" as const) : ("LISTER" as const),
      });
    }
    await prisma.user.createMany({ data: users });

    const start = Date.now();
    const found = await prisma.user.findUnique({
      where: { email: "user50@example.com" },
    });
    const duration = Date.now() - start;

    expect(found).toBeDefined();
    expect(duration).toBeLessThan(100); // Should be fast with index
  });

  // DB-005: Pagination
  it("DB-005: should support pagination", async () => {
    const users = [];
    for (let i = 0; i < 30; i++) {
      users.push({
        email: `page${i}@example.com`,
        passwordHash: "hash123",
        displayName: `Page User ${i}`,
        primaryRole: "BUYER" as const,
      });
    }
    await prisma.user.createMany({ data: users });

    const page1 = await prisma.user.findMany({
      take: 10,
      skip: 0,
    });

    const page2 = await prisma.user.findMany({
      take: 10,
      skip: 10,
    });

    expect(page1).toHaveLength(10);
    expect(page2).toHaveLength(10);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  // DB-006: Enum validation
  it("DB-006: should enforce enum values", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: "enum@example.com",
          passwordHash: "hash123",
          displayName: "Enum User",
          primaryRole: "INVALID_ROLE" as any,
        },
      }),
    ).rejects.toThrow();
  });

  // DB-007: Default values
  it("DB-007: should apply default values", async () => {
    const user = await prisma.user.create({
      data: {
        email: "defaults@example.com",
        passwordHash: "hash123",
        displayName: "Default User",
        primaryRole: "BUYER",
      },
    });

    expect(user.isActive).toBe(true); // Default value
    expect(user.mfaEnabled).toBe(false);
    expect(user.onboardingComplete).toBe(false);
    expect(user.createdAt).toBeDefined();
  });

  // DB-008: Timestamps auto-update
  it("DB-008: should auto-update timestamps", async () => {
    const user = await prisma.user.create({
      data: {
        email: "timestamp@example.com",
        passwordHash: "hash123",
        displayName: "Timestamp User",
        primaryRole: "BUYER",
      },
    });

    const originalUpdatedAt = user.updatedAt;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: "Updated Name" },
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });

  // DB-009: Foreign key constraints
  it("DB-009: should enforce foreign key constraints", async () => {
    await expect(
      prisma.project.create({
        data: {
          name: "Orphan Project",
          userId: 99999, // Non-existent user
        },
      }),
    ).rejects.toThrow();
  });

  // DB-010: Many-to-many relationships
  it("DB-010: should handle many-to-many relationships", async () => {
    const buyer = await createTestUser(prisma, "BUYER");
    const lister = await createTestUser(prisma, "LISTER");

    const project = await prisma.project.create({
      data: {
        name: "Favorite Test",
        userId: lister.id,
      },
    });

    const listing = await prisma.listing.create({
      data: {
        userId: lister.id,
        projectId: project.id,
        title: "Test Listing",
        isPublished: true,
      },
    });

    // Add to favorites
    await prisma.listingFavorite.create({
      data: {
        userId: buyer.id,
        listingId: listing.id,
      },
    });

    const favorites = await prisma.listingFavorite.findMany({
      where: { userId: buyer.id },
      include: { listing: true },
    });

    expect(favorites).toHaveLength(1);
    expect(favorites[0].listing.title).toBe("Test Listing");
  });

  // DB-011: Transaction rollback
  it("DB-011: should rollback transaction on error", async () => {
    const user = await createTestUser(prisma, "LISTER");

    try {
      await prisma.$transaction(async (tx) => {
        await tx.project.create({
          data: {
            name: "Transaction Test",
            userId: user.id,
          },
        });

        // Force an error
        throw new Error("Rollback test");
      });
    } catch (error: any) {
      // Expected error
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
    });

    expect(projects).toHaveLength(0); // Should be rolled back
  });

  // DB-012: Aggregate functions
  it("DB-012: should support aggregate functions", async () => {
    const user = await createTestUser(prisma, "LISTER");

    // Create projects
    await prisma.project.createMany({
      data: [
        { name: "Project 1", userId: user.id },
        { name: "Project 2", userId: user.id },
        { name: "Project 3", userId: user.id },
      ],
    });

    const count = await prisma.project.count({
      where: { userId: user.id },
    });

    expect(count).toBe(3);
  });

  // DB-013: JSON field handling
  it("DB-013: should store and retrieve JSON data", async () => {
    const user = await createTestUser(prisma, "LISTER");
    const project = await prisma.project.create({
      data: {
        name: "JSON Test",
        userId: user.id,
      },
    });

    const image = await prisma.image.create({
      data: {
        projectId: project.id,
        originalUrl: "https://s3.aws.com/test.jpg",
      },
    });

    const job = await prisma.job.create({
      data: {
        userId: user.id,
        projectId: project.id,
        imageId: image.id,
        type: "ENHANCEMENT",
        inputParameters: {
          brightness: 1.2,
          contrast: 1.1,
          format: "JPEG",
        },
      },
    });

    const retrieved = await prisma.job.findUnique({
      where: { id: job.id },
    });

    expect(retrieved!.inputParameters).toEqual({
      brightness: 1.2,
      contrast: 1.1,
      format: "JPEG",
    });
  });

  // DB-014: Array field handling
  it("DB-014: should handle array fields", async () => {
    const user = await prisma.user.create({
      data: {
        email: "array@example.com",
        passwordHash: "hash123",
        displayName: "Array User",
        primaryRole: "ADMIN",
        roles: ["ADMIN", "LISTER", "MODERATOR"], // Array field
      },
    });

    expect(user.roles).toHaveLength(3);
    expect(user.roles).toContain("ADMIN");
  });

  // DB-015: Decimal precision
  it("DB-015: should maintain decimal precision", async () => {
    const plan = await prisma.plan.create({
      data: {
        name: "Decimal Test Plan",
        monthlyPriceUsd: 99.99,
        maxAiCredits: 10000,
        maxStorageMb: 50000,
      },
    });

    expect(Number(plan.monthlyPriceUsd)).toBe(99.99);
  });
});
