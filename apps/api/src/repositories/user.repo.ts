import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";

export const userRepo = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
  list: (skip: number, take: number) =>
    prisma.$transaction([
      prisma.user.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
      prisma.user.count(),
    ]),
};
