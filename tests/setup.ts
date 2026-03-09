// tests/setup.ts
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Mock uuid before any imports
jest.mock("uuid", () => ({
  v4: () => "mock-uuid-" + Date.now() + "-" + Math.random(),
}));

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";
process.env.USE_MOCK_AI = "true";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";

// Global test setup
beforeAll(async () => {
  console.log("🧪 Test suite starting...");
});

afterAll(async () => {
  console.log("🏁 Test suite completed");
});

// Helper to clean up database between tests
export async function cleanupDatabase(prisma: PrismaClient) {
  // Tables in correct order (children before parents due to CASCADE)
  const tables = [
    "AuditLog",
    "ModerationAction",
    "ModerationFlag",
    "ModerationLog",
    "ListingExport",
    "ListingAd",
    "Message",
    "Booking",
    "ListingFavorite",
    "ListingMedia",
    "Listing",
    "Job",
    "EnhancementJob",
    "ImageVersion",
    "Image",
    "ProjectAdCopy",
    "Project",
    "Payment",
    "StorageUsage",
    "CreditUsage",
    "Subscription",
    "Plan",
    "PasswordResetToken",
    "EmailVerificationToken",
    "User",
    "Organization",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      // Ignore errors for tables that don't exist
    }
  }
}

// Helper to create test user
export async function createTestUser(
  prisma: PrismaClient,
  role: "BUYER" | "LISTER" = "BUYER",
) {
  const bcrypt = require("bcryptjs");
  const passwordHash = await bcrypt.hash("Test123!", 10);

  return await prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      passwordHash,
      displayName: "Test User",
      primaryRole: role,
      emailVerifiedAt: new Date(),
    },
  });
}

// Helper to generate JWT token
export function generateTestToken(userId: number | string) {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
}

// Mock S3 client
export const mockS3Client = {
  send: jest.fn().mockResolvedValue({ ETag: '"mock-etag"' }),
};

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-message-id" }),
  }),
}));

// Suppress console logs during tests (optional)
if (process.env.SILENT_TESTS === "true") {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
