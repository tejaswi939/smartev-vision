import type { Request, Response } from "express";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@sev/shared";
import { prisma } from "../db.js";
import { userRepo } from "../repositories/user.repo.js";
import * as auth from "../services/auth.service.js";
import { audit } from "../services/audit.service.js";
import { HttpError } from "../lib/httpError.js";
import { REFRESH_COOKIE, clearAuthCookies } from "../lib/cookies.js";
import { env } from "../config.js";
import { mailer } from "../lib/mailer.js";
import { toAuthUser, issueAndSetTokens } from "./helpers.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  if (await userRepo.findByEmail(input.email)) throw new HttpError(409, "Email already registered");
  const user = await userRepo.create({
    name: input.name,
    email: input.email,
    passwordHash: await auth.hashPassword(input.password),
    age: input.age,
    gender: input.gender,
  });
  await audit(prisma, { actorUserId: user.id, action: "REGISTER", entityType: "User", entityId: user.id, req });
  issueAndSetTokens(res, user);
  res.status(201).json({ user: toAuthUser(user) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const user = await userRepo.findByEmail(input.email);
  if (!user || !(await auth.verifyPassword(user.passwordHash, input.password))) {
    throw new HttpError(401, "Invalid credentials");
  }
  if (!user.isActive) throw new HttpError(403, "Account disabled");
  await audit(prisma, { actorUserId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, req });
  issueAndSetTokens(res, user);
  res.json({ user: toAuthUser(user) });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new HttpError(401, "Missing refresh token");
  let payload: auth.TokenPayload;
  try {
    payload = auth.verifyRefresh(token);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.isActive) throw new HttpError(401, "User no longer valid");
  issueAndSetTokens(res, user);
  res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  if (req.user) await audit(prisma, { actorUserId: req.user.id, action: "LOGOUT", req });
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await userRepo.findByEmail(email);
  if (user) {
    const { raw, hash } = auth.newResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + env.resetTtl * 1000) },
    });
    await mailer.sendPasswordReset(email, `${env.webOrigin}/reset?token=${raw}`);
  }
  res.json({ ok: true }); // identical response whether or not the account exists
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: auth.hashResetToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new HttpError(400, "Invalid or expired token");
  const passwordHash = await auth.hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(prisma, { actorUserId: row.userId, action: "PASSWORD_RESET", req });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await userRepo.findById(req.user!.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user: toAuthUser(user) });
}
