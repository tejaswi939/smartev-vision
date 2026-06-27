import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const TABLES = [
  '"AuditLog"', '"Report"', '"Rating"', '"Feedback"', '"EmotionDetection"', '"HeatmapCell"',
  '"InteractionLog"', '"GazeData"', '"Session"', '"VehiclePart"', '"Vehicle"',
  '"PasswordResetToken"', '"User"',
];

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`);
}
