// src/server.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { sendEmail } from "./lib/mailer";
import authRoutes from "./modules/auth/auth.routes";

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

// TEMP:
app.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: "asferali004@gmail.com",
      subject: "AIPIX SMTP test",
      text: "If you see this, SMTP works 🎉",
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

// Auth routes
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`AIPIX backend running on http://localhost:${PORT}`);
});
