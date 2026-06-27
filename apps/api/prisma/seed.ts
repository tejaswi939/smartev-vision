import { PrismaClient, Role, VehicleType, PartCategory, SessionStatus, AuditAction } from "@prisma/client";
import argon2 from "argon2";

const PARTS: { name: string; category: PartCategory; meshName: string }[] = [
  { name: "Hood", category: "EXTERIOR", meshName: "hood" },
  { name: "Body", category: "EXTERIOR", meshName: "body" },
  { name: "Front Wheels", category: "WHEELS", meshName: "wheels" },
  { name: "Headlights", category: "LIGHTING", meshName: "headlights" },
  { name: "Windshield", category: "EXTERIOR", meshName: "windshield" },
  { name: "Doors", category: "DOORS", meshName: "doors" },
  { name: "Infotainment", category: "INFOTAINMENT", meshName: "infotainment" },
  { name: "Battery Pack", category: "BATTERY", meshName: "battery" },
];

const VEHICLES = [
  { slug: "aurora-s", name: "Aurora S", make: "SmartEV", modelName: "Aurora", year: 2026, type: "SEDAN" as VehicleType, batteryKwh: 82, rangeKm: 560, priceUsd: 48000 },
  { slug: "terra-x", name: "Terra X", make: "SmartEV", modelName: "Terra", year: 2026, type: "SUV" as VehicleType, batteryKwh: 100, rangeKm: 610, priceUsd: 61000 },
  { slug: "volt-gt", name: "Volt GT", make: "SmartEV", modelName: "Volt", year: 2026, type: "SPORTS" as VehicleType, batteryKwh: 95, rangeKm: 540, priceUsd: 89000 },
];

export async function runSeed(prisma: PrismaClient): Promise<void> {
  // Idempotent reset (FK-safe order)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.report.deleteMany(), prisma.rating.deleteMany(),
    prisma.feedback.deleteMany(), prisma.emotionDetection.deleteMany(), prisma.heatmapCell.deleteMany(),
    prisma.interactionLog.deleteMany(), prisma.gazeData.deleteMany(), prisma.session.deleteMany(),
    prisma.vehiclePart.deleteMany(), prisma.vehicle.deleteMany(),
    prisma.passwordResetToken.deleteMany(), prisma.user.deleteMany(),
  ]);

  const passwordHash = await argon2.hash("Password123", { type: argon2.argon2id });
  const roles: Role[] = ["ADMIN", "ANALYST", "CUSTOMER"];
  const users = await Promise.all(roles.map((role) =>
    prisma.user.create({
      data: {
        email: `${role.toLowerCase()}@smartev.io`,
        name: `${role[0]}${role.slice(1).toLowerCase()} User`,
        role, passwordHash, age: 30, gender: "other",
      },
    })));
  const customer = users.find((u) => u.role === "CUSTOMER")!;

  const vehicles = [];
  for (const v of VEHICLES) {
    const vehicle = await prisma.vehicle.create({
      data: {
        ...v, modelUrl: `/models/${v.slug}.glb`, thumbnailUrl: `/thumbs/${v.slug}.png`,
        description: `${v.name} — a ${v.type.toLowerCase()} EV.`,
        parts: { create: PARTS.map((p, i) => ({ ...p, displayOrder: i })) },
      },
    });
    vehicles.push(vehicle);
  }

  // Synthetic completed sessions so later dashboards have data
  for (let i = 0; i < 6; i++) {
    const vehicle = vehicles[i % vehicles.length]!;
    const started = new Date(Date.now() - (i + 1) * 86_400_000);
    await prisma.session.create({
      data: {
        userId: customer.id, vehicleId: vehicle.id, startedAt: started,
        endedAt: new Date(started.getTime() + 120_000), durationSec: 120,
        status: "COMPLETED" as SessionStatus, engagementScore: 60 + i * 5, device: "web",
      },
    });
  }

  await prisma.feedback.create({
    data: {
      userId: customer.id, vehicleId: vehicles[0]!.id, comment: "Love the interior.",
      favoriteFeature: "Infotainment", sentiment: "positive",
    },
  });
  await prisma.rating.create({ data: { userId: customer.id, vehicleId: vehicles[0]!.id, score: 5 } });
  await prisma.auditLog.create({ data: { actorUserId: users[0]!.id, action: "LOGIN" as AuditAction } });

  console.log(`Seeded ${users.length} users, ${vehicles.length} vehicles, 6 sessions.`);
}

// Allow `tsx prisma/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();
  runSeed(prisma)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
