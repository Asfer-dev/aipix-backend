import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface JwtUser {
  id: number;
  email: string;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
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
      JWT_SECRET as string
    ) as unknown as JwtUser;

    // Attach to request – simple version with "any"
    (req as any).user = decoded;

    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware: only allow users with ADMIN role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtUser | undefined;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (async () => {
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (
        !fullUser ||
        !fullUser.roles.some((ur: any) => ur.role.name === "ADMIN")
      ) {
        return res.status(403).json({ error: "Admin access required" });
      }

      return next();
    } catch (err) {
      console.error("requireAdmin error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  })();
}
