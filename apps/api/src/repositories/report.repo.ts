import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";

export const reportRepo = {
  create: (data: Prisma.ReportUncheckedCreateInput) =>
    prisma.report.create({ data }),
};
