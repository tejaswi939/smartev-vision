import type { Response } from "express";
import { env } from "../config.js";

export const ACCESS_COOKIE = "sev_access";
export const REFRESH_COOKIE = "sev_refresh";

const base = { httpOnly: true, sameSite: "lax" as const, secure: env.isProd, path: "/" };

export function setAuthCookies(res: Response, t: { access: string; refresh: string }): void {
  res.cookie(ACCESS_COOKIE, t.access, { ...base, maxAge: env.accessTtl * 1000 });
  res.cookie(REFRESH_COOKIE, t.refresh, { ...base, maxAge: env.refreshTtl * 1000 });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
