import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";

const app = createApp();
beforeAll(async () => {
  await runSeed(prisma);
});

describe("vehicle catalog", () => {
  it("lists published vehicles", async () => {
    const res = await request(app).get("/api/v1/vehicles");
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBe(3);
    expect(res.body.vehicles[0]).toHaveProperty("slug");
  });
  it("returns a vehicle with 15 parts by slug", async () => {
    const res = await request(app).get("/api/v1/vehicles/aurora-s");
    expect(res.status).toBe(200);
    expect(res.body.vehicle.parts).toHaveLength(15);
    expect(res.body.vehicle.parts[0]).toHaveProperty("meshName");
  });
  it("404s for an unknown slug", async () => {
    expect((await request(app).get("/api/v1/vehicles/nope")).status).toBe(404);
  });
});
