import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";
import { predictionRepo } from "../src/repositories/prediction.repo.js";

const app = createApp();
beforeAll(async () => {
  await runSeed(prisma);

  // Seed a prediction on a completed session
  const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
  if (!session) throw new Error("No COMPLETED session found after seed");

  await predictionRepo.upsert(session.id, {
    archetype: "performance",
    archetypeConfidence: 0.91,
    interestTier: "high",
    interestConfidence: 0.87,
    scores: {
      archetype: { performance: 0.91, family: 0.05, luxury: 0.04 },
      interestTier: { high: 0.87, medium: 0.09, low: 0.04 },
    },
    modelVersion: "v1.0.0-test",
    recommendedVehicleId: null,
    highlightComponents: ["battery", "infotainment"],
    rationale: "User showed strong interest in performance features.",
  });
});

async function agentFor(email: string) {
  const a = request.agent(app);
  await a.post("/api/v1/auth/login").send({ email, password: "Password123" });
  return a;
}

describe("GET /sessions/:id/prediction", () => {
  it("returns the prediction for a COMPLETED session as admin", async () => {
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    const a = await agentFor("admin@smartev.io");
    const res = await a.get(`/api/v1/sessions/${session!.id}/prediction`);
    expect(res.status).toBe(200);
    expect(res.body.prediction).not.toBeNull();
    expect(res.body.prediction.archetype).toBe("performance");
    expect(res.body.prediction.highlightComponents).toContain("battery");
    expect(res.body.prediction.rationale).toBe("User showed strong interest in performance features.");
  });

  it("returns 403 for anonymous request on a user-owned session", async () => {
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    const res = await request(app).get(`/api/v1/sessions/${session!.id}/prediction`);
    expect(res.status).toBe(403);
  });

  it("returns { prediction: null } for an unknown session id", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/sessions/nonexistent-session-id/prediction");
    expect(res.status).toBe(200);
    expect(res.body.prediction).toBeNull();
  });
});

describe("GET /analytics/recommendations", () => {
  it("returns recommendations array for admin", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/analytics/recommendations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it("returns 403 for a customer", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.get("/api/v1/analytics/recommendations");
    expect(res.status).toBe(403);
  });
});
