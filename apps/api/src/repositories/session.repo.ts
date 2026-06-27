import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const sessionRepo = {
  create: (data: Prisma.SessionCreateInput) => prisma.session.create({ data }),
  findById: (id: string) => prisma.session.findUnique({ where: { id } }),
  end: (id: string, data: Prisma.SessionUpdateInput) => prisma.session.update({ where: { id }, data }),
  listForUser: (userId: string, take = 20) =>
    prisma.session.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take, include: { vehicle: { select: { name: true, slug: true } } } }),
  listAll: (take = 50) =>
    prisma.session.findMany({ orderBy: { startedAt: "desc" }, take, include: { vehicle: { select: { name: true, slug: true } } } }),
};
