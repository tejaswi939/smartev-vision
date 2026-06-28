import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";

const app = createApp();

beforeAll(async () => {
  await runSeed(prisma);
});

async function agentFor(email: string) {
  const a = request.agent(app);
  await a.post("/api/v1/auth/login").send({ email, password: "Password123" });
  return a;
}

describe("POST /api/v1/feedback", () => {
  it("returns 201 with feedback DTO when authenticated customer posts feedback", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.post("/api/v1/feedback").send({
      vehicleId: "byd-atto-3",
      rating: 4,
      comment: "Excellent range and smooth ride.",
      favoriteFeature: "Battery",
    });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.comment).toBe("Excellent range and smooth ride.");
    expect(res.body.feedback.rating).toBe(4);
    expect(res.body.feedback.vehicleId).toBeDefined();
    expect(res.body.feedback.id).toBeDefined();
    // Noop ML → sentiment is null in tests
    expect(res.body.feedback).toHaveProperty("sentiment");
    expect(res.body.feedback.createdAt).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app).post("/api/v1/feedback").send({
      vehicleId: "byd-atto-3",
      comment: "anonymous",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when vehicleId is missing", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.post("/api/v1/feedback").send({ comment: "no vehicle" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when vehicleId does not exist", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.post("/api/v1/feedback").send({ vehicleId: "nonexistent-slug-xyz" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/analytics/feedback-summary", () => {
  it("returns 200 with summary for admin", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/analytics/feedback-summary");

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(typeof res.body.summary.total).toBe("number");
    expect(res.body.summary.sentiment).toBeDefined();
    expect(res.body.summary.sentiment).toHaveProperty("positive");
    expect(res.body.summary.sentiment).toHaveProperty("neutral");
    expect(res.body.summary.sentiment).toHaveProperty("negative");
  });

  it("returns 200 with summary for analyst", async () => {
    const a = await agentFor("analyst@smartev.io");
    const res = await a.get("/api/v1/analytics/feedback-summary");
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });

  it("returns 403 for customer", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.get("/api/v1/analytics/feedback-summary");
    expect(res.status).toBe(403);
  });

  it("returns 401 for unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/analytics/feedback-summary");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/vehicles/:slug/feedback", () => {
  it("returns 200 with feedback array and summary for admin", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/vehicles/byd-atto-3/feedback");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.feedback)).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(typeof res.body.summary.total).toBe("number");
  });

  it("returns 403 for customer", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.get("/api/v1/vehicles/byd-atto-3/feedback");
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown slug", async () => {
    const a = await agentFor("admin@smartev.io");
    const res = await a.get("/api/v1/vehicles/nonexistent-vehicle-xyz/feedback");
    expect(res.status).toBe(404);
  });
});
