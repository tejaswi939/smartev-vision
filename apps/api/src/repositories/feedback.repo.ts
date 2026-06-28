import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";

export const feedbackRepo = {
  create: (data: Prisma.FeedbackUncheckedCreateInput) => prisma.feedback.create({ data }),
  createRating: (data: Prisma.RatingUncheckedCreateInput) => prisma.rating.create({ data }),
  forVehicle: (vehicleId: string) =>
    prisma.feedback.findMany({ where: { vehicleId }, orderBy: { createdAt: "desc" }, take: 100 }),
  allWithRatings: () =>
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ratingsForVehicle: (vehicleId: string) =>
    prisma.rating.findMany({ where: { vehicleId } }),
  allRatings: () => prisma.rating.findMany(),
};
