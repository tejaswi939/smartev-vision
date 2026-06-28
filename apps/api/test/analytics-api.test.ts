import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";

const app = createApp();
beforeAll(async () => { await runSeed(prisma); });

async function agentFor(email: string) {
  const a = request.agent(app);
  await a.post("/api/v1/auth/login").send({ email, password: "Password123" });
  return a;
}

describe("analytics API", () => {
  it("overview (admin) returns popularity for 3 vehicles", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.vehiclePopularity.length).toBe(3);
    expect(typeof res.body.avgEngagement).toBe("number");
  });
  it("forbids a customer from the overview", async () => {
    const a = await agentFor("customer@smartev.io");
    expect((await a.get("/api/v1/analytics/overview")).status).toBe(403);
  });
  it("returns vehicle analytics for an admin", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/vehicles/byd-atto-3/analytics");
    expect(res.status).toBe(200);
    expect(res.body.components.length).toBeGreaterThan(0);
  });
  it("404s vehicle analytics for an unknown slug", async () => {
    const a = await agentFor("admin@smartev.io");
    expect((await a.get("/api/v1/vehicles/nope/analytics")).status).toBe(404);
  });
  it("returns a 40x40 session heatmap grid", async () => {
    const a = await agentFor("admin@smartev.io");
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    const res = await a.get(`/api/v1/sessions/${session!.id}/heatmap`);
    expect(res.status).toBe(200);
    expect(res.body.grid.length).toBe(40);
  });
});
