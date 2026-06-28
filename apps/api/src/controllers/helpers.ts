import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { User } from "@prisma/client";
import type { AuthUser, Role } from "@sev/shared";
import { setAuthCookies } from "../lib/cookies.js";
import * as auth from "../services/auth.service.js";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function toAuthUser(u: User): AuthUser {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    age: u.age, gender: u.gender, avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
  };
}

export function issueAndSetTokens(res: Response, u: { id: string; role: Role }): void {
  setAuthCookies(res, {
    access: auth.signAccess({ sub: u.id, role: u.role }),
    refresh: auth.signRefresh({ sub: u.id, role: u.role }),
  });
}
