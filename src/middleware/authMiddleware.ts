import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface JwtUser {
  id: number;
  email: string;
}

export interface AuthUser extends JwtUser {
  displayName: string;
  emailVerified: boolean;
  roles: string[];
  primaryRole: string;
  organizationId?: number;
  onboardingComplete: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token!,
      JWT_SECRET as string,
    ) as unknown as JwtUser;

    // Fetch full user details including roles
    prisma.user
      .findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerifiedAt: true,
          roles: true,
          primaryRole: true,
          organizationId: true,
          onboardingComplete: true,
        },
      })
      .then((user) => {
        if (!user) {
          return res.status(401).json({ error: "Invalid token" });
        }

        // Attach full user info to request
        (req as any).user = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: !!user.emailVerifiedAt,
          roles: user.roles,
          primaryRole: user.primaryRole,
          organizationId: user.organizationId || undefined,
          onboardingComplete: user.onboardingComplete,
        } as AuthUser;

        next();
      })
      .catch((err) => {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ error: "Internal server error" });
      });
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role-based access control middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasRole = allowedRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}

// Specific role middleware
export const requireLister = requireRole("LISTER", "ADMIN");
export const requireBuyer = requireRole("BUYER", "LISTER", "ADMIN"); // Listers can also browse
export const requireModerator = requireRole("MODERATOR", "ADMIN");
export const requireEditor = requireRole("EDITOR", "ADMIN");

/**
 * Middleware: only allow users with ADMIN role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!user.roles.includes("ADMIN")) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

/**
 * Middleware: only allow users with MODERATOR or ADMIN role.
 */
export function requireModeratorOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!user.roles.includes("MODERATOR") && !user.roles.includes("ADMIN")) {
    return res
      .status(403)
      .json({ error: "Moderator or Admin access required" });
  }

  next();
}
