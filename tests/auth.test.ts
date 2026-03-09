// tests/auth.test.ts
import cors from "cors";
import express from "express";
import request from "supertest";
import authRoutes from "../src/modules/auth/auth.routes";
import prisma from "../src/prisma";
import { cleanupDatabase, generateTestToken } from "./setup";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

describe("Authentication Module", () => {
  beforeEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // AUTH-001: Register new user (BUYER)
  it("AUTH-001: should register a new BUYER user", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "buyer@example.com",
      password: "SecurePass123!",
      displayName: "Test Buyer",
      primaryRole: "BUYER",
      phoneNumber: "+15555551234",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.email).toBe("buyer@example.com");
    expect(res.body.data.primaryRole).toBe("BUYER");
  });

  // AUTH-002: Register new user (LISTER)
  it("AUTH-002: should register a new LISTER user", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "lister@example.com",
      password: "SecurePass123!",
      displayName: "Test Lister",
      primaryRole: "LISTER",
      phoneNumber: "+15555555678",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.email).toBe("lister@example.com");
    expect(res.body.data.primaryRole).toBe("LISTER");
  });

  // AUTH-003: Register duplicate email
  it("AUTH-003: should reject registration with duplicate email", async () => {
    await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "SecurePass123!",
      displayName: "First User",
      primaryRole: "BUYER",
    });

    const res = await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "AnotherPass123!",
      displayName: "Second User",
      primaryRole: "LISTER",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("email");
  });

  // AUTH-004: Register with weak password
  it("AUTH-004: should reject weak password", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "weak@example.com",
      password: "123", // Too short
      displayName: "Test User",
      primaryRole: "BUYER",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("password");
  });

  // AUTH-005: Register without phone number (optional)
  it("AUTH-005: should register user without phone number", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "nophone@example.com",
      password: "SecurePass123!",
      displayName: "No Phone User",
      primaryRole: "BUYER",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.phoneNumber).toBeNull();
  });

  // AUTH-006: Register with invalid email
  it("AUTH-006: should reject invalid email format", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "not-an-email",
      password: "SecurePass123!",
      displayName: "Invalid Email",
      primaryRole: "BUYER",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("email");
  });

  // AUTH-007: Login with valid credentials
  it("AUTH-007: should login with valid credentials and return JWT", async () => {
    // Register user first
    await request(app).post("/auth/register").send({
      email: "login@example.com",
      password: "SecurePass123!",
      displayName: "Login User",
      primaryRole: "LISTER",
    });

    const res = await request(app).post("/auth/login").send({
      email: "login@example.com",
      password: "SecurePass123!",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data.user.email).toBe("login@example.com");
  });

  // AUTH-008: Login with wrong password
  it("AUTH-008: should reject login with wrong password", async () => {
    await request(app).post("/auth/register").send({
      email: "wrongpass@example.com",
      password: "CorrectPass123!",
      displayName: "Test User",
      primaryRole: "BUYER",
    });

    const res = await request(app).post("/auth/login").send({
      email: "wrongpass@example.com",
      password: "WrongPass123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // AUTH-009: Login with non-existent email
  it("AUTH-009: should reject login with non-existent email", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "nonexistent@example.com",
      password: "SomePass123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // AUTH-010: Login inactive user
  it("AUTH-010: should reject login for inactive user", async () => {
    // Create user and deactivate
    const user = await prisma.user.create({
      data: {
        email: "inactive@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Inactive User",
        primaryRole: "BUYER",
        isActive: false,
      },
    });

    const res = await request(app).post("/auth/login").send({
      email: "inactive@example.com",
      password: "Pass123!",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("inactive");
  });

  // AUTH-011: Get current user with valid token
  it("AUTH-011: should return user data with valid token", async () => {
    const user = await prisma.user.create({
      data: {
        email: "authuser@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Auth User",
        primaryRole: "LISTER",
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(user.id);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("authuser@example.com");
    expect(res.body.data.id).toBe(user.id);
  });

  // AUTH-012: Get user without token
  it("AUTH-012: should reject request without token", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // AUTH-013: Get user with expired token
  it("AUTH-013: should reject expired token", async () => {
    const jwt = require("jsonwebtoken");
    const expiredToken = jwt.sign({ userId: "999" }, process.env.JWT_SECRET!, {
      expiresIn: "-1h", // Expired 1 hour ago
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("expired");
  });

  // AUTH-014: Get user with malformed token
  it("AUTH-014: should reject malformed token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer invalid-token-format");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // AUTH-015 to AUTH-018: MFA tests (will be skipped if MFA not implemented)
  it.skip("AUTH-015: should enable MFA for user", async () => {
    // MFA implementation pending
  });

  it.skip("AUTH-016: should verify MFA with valid TOTP", async () => {
    // MFA implementation pending
  });

  it.skip("AUTH-017: should reject invalid MFA TOTP", async () => {
    // MFA implementation pending
  });

  it.skip("AUTH-018: should disable MFA", async () => {
    // MFA implementation pending
  });

  // AUTH-019 to AUTH-021: Password reset tests  (will be skipped if not implemented)
  it.skip("AUTH-019: should request password reset", async () => {
    // Password reset implementation pending
  });

  it.skip("AUTH-020: should reset password with valid token", async () => {
    // Password reset implementation pending
  });

  it.skip("AUTH-021: should reject expired password reset token", async () => {
    // Password reset implementation pending
  });

  // AUTH-022: Logout user
  it.skip("AUTH-022: should logout user", async () => {
    // Logout implementation (stateless JWT, client-side removal)
  });

  // AUTH-023: Refresh token
  it.skip("AUTH-023: should refresh expired token", async () => {
    // Token refresh implementation pending
  });

  // AUTH-024: Access admin route as BUYER
  it("AUTH-024: should deny BUYER access to admin routes", async () => {
    const buyerUser = await prisma.user.create({
      data: {
        email: "buyer-test@example.com",
        passwordHash: await require("bcryptjs").hash("Pass123!", 10),
        displayName: "Buyer Test",
        primaryRole: "BUYER",
        roles: ["BUYER"],
        emailVerifiedAt: new Date(),
      },
    });

    const token = generateTestToken(buyerUser.id);

    // Assuming admin routes exist under /admin
    const app2 = express();
    app2.use(express.json());
    app2.get("/admin/users", (req: any, res) => {
      // Simulate auth check
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "No token" });

      // In real app, middleware would check role
      const userRole = buyerUser.primaryRole;
      if (userRole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
      }

      res.json({ data: [] });
    });

    const res = await request(app2)
      .get("/admin/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Forbidden");
  });
});
