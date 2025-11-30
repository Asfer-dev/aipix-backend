// src/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config"; // make sure .env is loaded
import { Pool } from "pg";

// 1. Create a pg connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Wrap it in Prisma's Postgres adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter into PrismaClient
const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"], // optional
});

export default prisma;
