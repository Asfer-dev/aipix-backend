// src/server.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import prisma from "./prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "aipix-backend" });
});

// TEMP: list all users (just to test DB)
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// TEMP: create user (simple test)
app.post("/users", async (req, res) => {
  try {
    const { email, displayName, password } = req.body;

    // NOTE: in real app, hash password!
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: password,
      },
    });

    res.status(201).json(user);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

app.listen(PORT, () => {
  console.log(`AIPIX backend running on http://localhost:${PORT}`);
});
