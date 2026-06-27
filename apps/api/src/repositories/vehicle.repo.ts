import { prisma } from "../db.js";

export const vehicleRepo = {
  listPublished: () => prisma.vehicle.findMany({ where: { isPublished: true }, orderBy: { name: "asc" } }),
  bySlug: (slug: string) =>
    prisma.vehicle.findUnique({
      where: { slug },
      include: { parts: { orderBy: { displayOrder: "asc" } } },
    }),
};
