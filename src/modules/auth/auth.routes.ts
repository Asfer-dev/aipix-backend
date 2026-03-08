import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  addRoleHandler,
  completeOnboardingHandler,
  disableMfaHandler,
  enableMfaHandler,
  forgotPasswordHandler,
  getAvailableRolesHandler,
  loginHandler,
  meHandler,
  registerHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  setupMfaHandler,
  switchRoleHandler,
  verifyEmailHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);

router.get("/me", authMiddleware, meHandler);

router.post("/verify-email", verifyEmailHandler);
router.post("/resend-verification", resendVerificationHandler);

router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// MFA – protected routes
router.post("/mfa/setup", authMiddleware, setupMfaHandler);
router.post("/mfa/enable", authMiddleware, enableMfaHandler);
router.post("/mfa/disable", authMiddleware, disableMfaHandler);

// Role Management – protected routes
router.post("/switch-role", authMiddleware, switchRoleHandler);
router.post("/add-role", authMiddleware, addRoleHandler);
router.get("/available-roles", authMiddleware, getAvailableRolesHandler);

// Onboarding
router.post("/complete-onboarding", authMiddleware, completeOnboardingHandler);

export default router;
