import { PrismaClient, Role, VehicleType, PartCategory, SessionStatus, AuditAction } from "@prisma/client";
import argon2 from "argon2";

interface PartSeed {
  name: string;
  category: PartCategory;
  meshName: string;
  animation: string | null;
  hotspotPosition: { x: number; y: number; z: number };
  specs: Record<string, string>;
}

const PARTS: PartSeed[] = [
  { name: "Body", category: "EXTERIOR", meshName: "body", animation: null, hotspotPosition: { x: 0, y: 1.0, z: 1.0 }, specs: { Drag: "0.23 Cd", Material: "Aluminium" } },
  { name: "Doors", category: "DOORS", meshName: "doors", animation: "door-open", hotspotPosition: { x: 1.0, y: 1.0, z: 0 }, specs: { Type: "Frameless", Opening: "Soft-close" } },
  { name: "Hood", category: "EXTERIOR", meshName: "hood", animation: "hood-open", hotspotPosition: { x: 0, y: 1.0, z: 1.8 }, specs: { Storage: "Frunk 60 L" } },
  { name: "Trunk", category: "EXTERIOR", meshName: "trunk", animation: "trunk-open", hotspotPosition: { x: 0, y: 1.0, z: -1.8 }, specs: { Capacity: "425 L" } },
  { name: "Wheels", category: "WHEELS", meshName: "wheels", animation: "wheel-spin", hotspotPosition: { x: 1.3, y: 0.4, z: 1.2 }, specs: { Size: "20-inch", Type: "Aero alloy" } },
  { name: "Steering Wheel", category: "INTERIOR", meshName: "steering-wheel", animation: null, hotspotPosition: { x: 0.35, y: 1.1, z: 0.2 }, specs: { Type: "Heated", Mode: "Drive-by-wire" } },
  { name: "Dashboard", category: "INTERIOR", meshName: "dashboard", animation: null, hotspotPosition: { x: 0, y: 1.1, z: 0.4 }, specs: { Display: "12.3-inch" } },
  { name: "Infotainment Screen", category: "INFOTAINMENT", meshName: "infotainment", animation: "screen-on", hotspotPosition: { x: 0, y: 1.1, z: 0.5 }, specs: { Size: "15.4-inch", OS: "SmartEV OS" } },
  { name: "Battery Pack", category: "BATTERY", meshName: "battery", animation: "battery-glow", hotspotPosition: { x: 0, y: 0.2, z: 0 }, specs: { Capacity: "82 kWh", Chemistry: "NMC" } },
  { name: "Charging Port", category: "CHARGING", meshName: "charging-port", animation: "port-open", hotspotPosition: { x: -1.0, y: 0.8, z: -1.5 }, specs: { Standard: "CCS2", Peak: "250 kW" } },
  { name: "Mirrors", category: "MIRRORS", meshName: "mirrors", animation: null, hotspotPosition: { x: 1.1, y: 1.2, z: 0.6 }, specs: { Type: "Auto-dimming" } },
  { name: "Seats", category: "SEATING", meshName: "seats", animation: null, hotspotPosition: { x: 0, y: 0.9, z: 0 }, specs: { Trim: "Vegan leather", Heating: "Front + rear" } },
  { name: "Headlights", category: "LIGHTING", meshName: "headlights", animation: "lights-on", hotspotPosition: { x: 0.7, y: 0.8, z: 1.9 }, specs: { Type: "Matrix LED" } },
  { name: "Taillights", category: "LIGHTING", meshName: "taillights", animation: "lights-on", hotspotPosition: { x: 0.7, y: 0.8, z: -1.9 }, specs: { Type: "Full-width OLED" } },
  { name: "Windows", category: "GLASS", meshName: "windows", animation: null, hotspotPosition: { x: 0, y: 1.5, z: 0 }, specs: { Glazing: "Acoustic", Tint: "UV-block" } },
];

const VEHICLES = [
  { slug: "aurora-s", name: "Aurora S", make: "SmartEV", modelName: "Aurora", year: 2026, type: "HATCHBACK" as VehicleType, category: "Compact", batteryKwh: 82, rangeKm: 560, priceUsd: 48000 },
  { slug: "terra-x", name: "Terra X", make: "SmartEV", modelName: "Terra", year: 2026, type: "SUV" as VehicleType, category: "SUV", batteryKwh: 100, rangeKm: 610, priceUsd: 61000 },
  { slug: "volt-gt", name: "Volt GT", make: "SmartEV", modelName: "Volt", year: 2026, type: "SPORTS" as VehicleType, category: "Sports", batteryKwh: 95, rangeKm: 540, priceUsd: 89000 },
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
        ...v,
        modelUrl: null, // null => procedural builder; set a path when a real GLB is uploaded
        thumbnailUrl: `/thumbs/${v.slug}.png`,
        description: `${v.name} — a ${v.category.toLowerCase()} EV.`,
        parts: { create: PARTS.map((p, i) => ({ ...p, displayOrder: i })) },
      },
    });
    vehicles.push(vehicle);
  }

  // Synthetic completed sessions + component-view aggregates so dashboards have data
  const DEMO_PARTS = ["body", "doors", "wheels", "infotainment", "battery", "seats"];
  for (let i = 0; i < 6; i++) {
    const vehicle = vehicles[i % vehicles.length]!;
    const started = new Date(Date.now() - (i + 1) * 86_400_000);
    const session = await prisma.session.create({
      data: {
        userId: customer.id, vehicleId: vehicle.id, startedAt: started,
        endedAt: new Date(started.getTime() + 120_000), durationSec: 120,
        status: "COMPLETED" as SessionStatus,
        engagementScore: 60 + i * 5, interestScore: 55 + i * 4, totalGazeMs: 90_000 + i * 1000,
        gazeProvider: "mouse", device: "web",
      },
    });
    await prisma.componentView.createMany({
      data: DEMO_PARTS.map((meshName, j) => ({
        sessionId: session.id, vehicleId: vehicle.id, meshName,
        totalViewMs: 1500 + j * 400 + i * 100, focusCount: 2 + j, interactionCount: j % 3,
        entryCount: 2 + j, exitCount: 1 + j, firstSeenMs: j * 500, lastSeenMs: 5000 + j * 500,
      })),
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

  console.log(`Seeded ${users.length} users, ${vehicles.length} vehicles x ${PARTS.length} parts, 6 sessions.`);
}

// Allow `tsx prisma/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();
  runSeed(prisma)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
