import type { Request, Response, NextFunction } from "express";
import type { Role } from "@sev/shared";
import { ACCESS_COOKIE } from "../lib/cookies.js";
import { verifyAccess } from "../services/auth.service.js";
import { HttpError } from "../lib/httpError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(new HttpError(401, "Authentication required"));
  try {
    const p = verifyAccess(token);
    req.user = { id: p.sub, role: p.role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Forbidden"));
    next();
  };
}
