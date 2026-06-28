import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@sev/shared";
import { env } from "../config.js";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function hashPassword(pw: string): Promise<string> {
  return argon2.hash(pw, { type: argon2.argon2id });
}
export function verifyPassword(hash: string, pw: string): Promise<boolean> {
  return argon2.verify(hash, pw);
}

export function signAccess(p: TokenPayload): string {
  return jwt.sign(p, env.jwtAccessSecret, { expiresIn: env.accessTtl });
}
export function signRefresh(p: TokenPayload): string {
  return jwt.sign(p, env.jwtRefreshSecret, { expiresIn: env.refreshTtl });
}
export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
}
export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
export function newResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashResetToken(raw) };
}
