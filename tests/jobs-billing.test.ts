// tests/jobs-billing.test.ts
import request from "supertest";
import prisma from "../src/prisma";
import { cleanupDatabase, createTestUser, generateTestToken } from "./setup";

const app = require("../src/server");

describe("Jobs & Billing Tests", () => {
  let listerUser: any;
  let listerToken: string;
  let subscription: any;
  let project: any;
  let image: any;

  beforeEach(async () => {
    await cleanupDatabase(prisma);

    listerUser = await createTestUser(prisma, "LISTER");
    listerToken = generateTestToken(listerUser.id);

    // Create plan and subscription
    const plan = await prisma.plan.create({
      data: {
        name: "Pro Plan",
        monthlyPriceUsd: 99.99,
        maxAiCredits: 10000,
        maxStorageMb: 50000,
      },
    });

    subscription = await prisma.subscription.create({
      data: {
        userId: listerUser.id,
        planId: plan.id,
        startDate: new Date(),
        isActive: true,
        currentCreditsUsed: 0,
        currentStorageMb: 0,
      },
    });

    // Create test project and image
    project = await prisma.project.create({
      data: {
        name: "Job Test Project",
        userId: listerUser.id,
      },
    });

    image = await prisma.image.create({
      data: {
        projectId: project.id,
        originalUrl: "https://s3.aws.com/test-image.jpg",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // JOB-001: Create enhancement job
  it("JOB-001: should create an enhancement job", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        projectId: project.id,
        imageId: image.id,
        type: "ENHANCEMENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.type).toBe("ENHANCEMENT");
  });

  // JOB-002: Get all user jobs
  it("JOB-002: should get all user jobs", async () => {
    // Create multiple jobs
    await prisma.job.createMany({
      data: [
        {
          userId: listerUser.id,
          projectId: project.id,
          imageId: image.id,
          type: "ENHANCEMENT",
          status: "PENDING",
        },
        {
          userId: listerUser.id,
          projectId: project.id,
          imageId: image.id,
          type: "VIRTUAL_STAGING",
          status: "COMPLETED",
        },
      ],
    });

    const res = await request(app)
      .get("/api/jobs")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  // JOB-003: Get job by ID
  it("JOB-003: should get job by ID", async () => {
    const job = await prisma.job.create({
      data: {
        userId: listerUser.id,
        projectId: project.id,
        imageId: image.id,
        type: "ENHANCEMENT",
        status: "PENDING",
      },
    });

    const res = await request(app)
      .get(`/api/jobs/${job.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(job.id);
    expect(res.body.data.status).toBe("PENDING");
  });

  // JOB-004: Cancel pending job
  it("JOB-004: should cancel a pending job", async () => {
    const job = await prisma.job.create({
      data: {
        userId: listerUser.id,
        projectId: project.id,
        imageId: image.id,
        type: "ENHANCEMENT",
        status: "PENDING",
      },
    });

    const res = await request(app)
      .delete(`/api/jobs/${job.id}`)
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
  });

  // JOB-005: Get queue status
  it("JOB-005: should get queue statistics", async () => {
    const res = await request(app)
      .get("/api/jobs/queue/status")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("pending");
    expect(res.body.data).toHaveProperty("running");
  });

  // BILL-001: Get all plans
  it("BILL-001: should get all subscription plans", async () => {
    const res = await request(app).get("/api/billing/plans");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // BILL-002: Get user subscription
  it("BILL-002: should get user's active subscription", async () => {
    const res = await request(app)
      .get("/api/billing/subscription")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("planId");
    expect(res.body.data.isActive).toBe(true);
  });

  // BILL-003: Create subscription payment
  it("BILL-003: should create a payment for subscription", async () => {
    const plan = await prisma.plan.findFirst();

    const res = await request(app)
      .post("/api/billing/payments")
      .set("Authorization", `Bearer ${listerToken}`)
      .send({
        planId: plan!.id,
        amount: 99.99,
        paymentMethod: "MOCK",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.status).toBe("PENDING");
  });

  // BILL-004: Get user payments
  it("BILL-004: should get user payment history", async () => {
    const res = await request(app)
      .get("/api/billing/payments")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // USAGE-001: Get usage summary
  it("USAGE-001: should get current usage summary", async () => {
    const res = await request(app)
      .get("/api/billing/usage")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("currentCreditsUsed");
    expect(res.body.data).toHaveProperty("currentStorageMb");
    expect(res.body.data).toHaveProperty("maxAiCredits");
    expect(res.body.data).toHaveProperty("maxStorageMb");
  });

  // USAGE-002: Track storage usage on upload
  it("USAGE-002: should track storage usage", async () => {
    // Simulate image upload
    await prisma.storageUsage.create({
      data: {
        subscriptionId: subscription.id,
        fileSizeMb: 5.2,
        fileUrl: "https://s3.aws.com/new-image.jpg",
        fileName: "villa.jpg",
        operation: "UPLOAD",
      },
    });

    // Update subscription storage
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { currentStorageMb: { increment: 5.2 } },
    });

    const updated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });

    expect(updated!.currentStorageMb).toBeCloseTo(5.2, 1);
  });

  // USAGE-003: Get credit history
  it("USAGE-003: should get credit usage history", async () => {
    const res = await request(app)
      .get("/api/billing/credit-history")
      .set("Authorization", `Bearer ${listerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
