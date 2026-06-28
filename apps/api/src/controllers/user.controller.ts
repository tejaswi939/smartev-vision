import type { Request, Response } from "express";
import { updateProfileSchema, updateRoleSchema } from "@sev/shared";
import { prisma } from "../db.js";
import { userRepo } from "../repositories/user.repo.js";
import { audit } from "../services/audit.service.js";
import { toAuthUser } from "./helpers.js";

export async function updateMe(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const user = await userRepo.update(req.user!.id, input);
  res.json({ user: toAuthUser(user) });
}

export async function listUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [users, total] = await userRepo.list((page - 1) * pageSize, pageSize);
  res.json({ items: users.map(toAuthUser), total, page, pageSize });
}

export async function updateUserRole(req: Request, res: Response) {
  const { role } = updateRoleSchema.parse(req.body);
  const user = await userRepo.update(req.params.id!, { role });
  await audit(prisma, {
    actorUserId: req.user!.id, action: "ROLE_CHANGE",
    entityType: "User", entityId: user.id, metadata: { role }, req,
  });
  res.json({ user: toAuthUser(user) });
}
