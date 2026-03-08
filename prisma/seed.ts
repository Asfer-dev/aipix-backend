/**
 * Prisma Seed Script
 * Creates default admin and moderator users
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Credentials:
 *   admin@aipix.com     / 12345678  (ADMIN)
 *   moderator@aipix.com / 12345678  (MODERATOR)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const SEED_USERS = [
  {
    email: "admin@aipix.com",
    displayName: "System Admin",
    primaryRole: "ADMIN" as const,
    roles: ["ADMIN"] as any[],
  },
  {
    email: "moderator@aipix.com",
    displayName: "Content Moderator",
    primaryRole: "MODERATOR" as const,
    roles: ["MODERATOR"] as any[],
  },
];

const PASSWORD = "12345678";

async function main() {
  console.log("🌱 Starting seed...\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const userData of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`⚠️  User already exists, skipping: ${userData.email}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        displayName: userData.displayName,
        passwordHash,
        primaryRole: userData.primaryRole,
        roles: userData.roles,
        isActive: true,
        onboardingComplete: true,
        emailVerifiedAt: new Date(),
      },
    });

    console.log(
      `✅ Created ${user.primaryRole}: ${user.email} (id: ${user.id})`,
    );
  }

  console.log("\n✨ Seed complete.");
  console.log("──────────────────────────────────");
  console.log("  Email                  Password");
  console.log("──────────────────────────────────");
  console.log(`  admin@aipix.com        ${PASSWORD}`);
  console.log(`  moderator@aipix.com    ${PASSWORD}`);
  console.log("──────────────────────────────────");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
