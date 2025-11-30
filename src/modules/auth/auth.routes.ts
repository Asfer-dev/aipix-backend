import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  disableMfaHandler,
  enableMfaHandler,
  forgotPasswordHandler,
  loginHandler,
  registerHandler,
  resetPasswordHandler,
  setupMfaHandler,
  verifyEmailHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);

router.post("/verify-email", verifyEmailHandler);

router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// MFA – protected routes
router.post("/mfa/setup", authMiddleware, setupMfaHandler);
router.post("/mfa/enable", authMiddleware, enableMfaHandler);
router.post("/mfa/disable", authMiddleware, disableMfaHandler);

export default router;
