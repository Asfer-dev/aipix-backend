// src/server.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { sendEmail } from "./lib/mailer";
import adminRoutes from "./modules/admin/admin.routes";
import authRoutes from "./modules/auth/auth.routes";
import billingRoutes from "./modules/billing/billing.routes";
import enhancementRoutes from "./modules/enhancement/enhancement.routes";
import jobRoutes from "./modules/jobs/jobs.routes";
import listingRoutes from "./modules/listings/listings.routes";
import projectRoutes from "./modules/projects/projects.routes";
import { jobQueueService } from "./services/job-queue.service";

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

// Billing / subscription routes
app.use("/billing", billingRoutes);

app.use("/projects", projectRoutes);
app.use("/enhancement", enhancementRoutes);
app.use("/jobs", jobRoutes);

app.use("/listings", listingRoutes);

// Admin routes
app.use("/admin", adminRoutes);

// Start job queue processor
jobQueueService.startProcessing();
console.log("✅ Job queue processor started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await jobQueueService.stopProcessing();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await jobQueueService.stopProcessing();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`AIPIX backend running on http://localhost:${PORT}`);
});
