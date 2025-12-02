import { Request, Response } from "express";
import { JwtUser } from "../../middleware/authMiddleware";
import {
  disableMfa,
  enableMfa,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendEmailVerification,
  resetPasswordWithToken,
  setupMfa,
  verifyEmail,
} from "./auth.service";

export async function registerHandler(req: Request, res: Response) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await registerUser(email, password, displayName);

    return res.status(201).json({
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    if (err.message === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password, mfaCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await loginUser(email, password, mfaCode);

    return res.status(200).json({
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (err.message === "MFA_REQUIRED") {
      return res
        .status(401)
        .json({ error: "MFA code required", mfaRequired: true });
    }
    if (err.message === "MFA_INVALID") {
      return res.status(401).json({ error: "Invalid MFA code" });
    }

    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Verify Email
export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    await verifyEmail(token);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "INVALID_TOKEN") {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (err.message === "TOKEN_USED") {
      return res.status(400).json({ error: "Token already used" });
    }
    if (err.message === "TOKEN_EXPIRED") {
      return res.status(400).json({ error: "Token expired" });
    }

    console.error("Verify email error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function resendVerificationHandler(req: Request, res: Response) {
  try {
    // read email from request body so this endpoint does not require auth
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "Email required" });

    await resendEmailVerification(email);

    return res.json({
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (err.message === "ALREADY_VERIFIED") {
      return res.status(400).json({
        error: "ALREADY_VERIFIED",
        message: "Email is already verified.",
      });
    }

    console.error("Error resending verification email:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

import prisma from "../../prisma"; // adjust path to your prisma.ts

// This matches what your auth middleware attaches
interface AuthUser {
  id: number;
  email: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function meHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!dbUser) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    // Map Prisma User -> frontend User type
    const apiUser = {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      isEmailVerified: !!dbUser.emailVerifiedAt,
      mfaEnabled: dbUser.mfaEnabled,
    };

    return res.json({ user: apiUser });
  } catch (err) {
    console.error("Error in /me handler:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

// Forgot password handlers
export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    await requestPasswordReset(email);
    return res.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and newPassword required" });
    }

    await resetPasswordWithToken(token, newPassword);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "INVALID_TOKEN") {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (err.message === "TOKEN_USED") {
      return res.status(400).json({ error: "Token already used" });
    }
    if (err.message === "TOKEN_EXPIRED") {
      return res.status(400).json({ error: "Token expired" });
    }

    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// MFA Handlers
export async function setupMfaHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const result = await setupMfa(user.id);
    return res.json(result); // { otpauthUrl, base32 }
  } catch (err) {
    console.error("Setup MFA error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function enableMfaHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    const { code } = req.body;

    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!code) return res.status(400).json({ error: "Code required" });

    await enableMfa(user.id, code);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "MFA_INVALID") {
      return res.status(400).json({ error: "Invalid MFA code" });
    }

    console.error("Enable MFA error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function disableMfaHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as JwtUser | undefined;
    const { code } = req.body;

    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!code) return res.status(400).json({ error: "Code required" });

    await disableMfa(user.id, code);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "MFA_INVALID") {
      return res.status(400).json({ error: "Invalid MFA code" });
    }

    console.error("Disable MFA error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
