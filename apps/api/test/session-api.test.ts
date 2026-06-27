import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";

const app = createApp();
beforeAll(async () => { await runSeed(prisma); });

describe("session API", () => {
  it("starts an anonymous session, ingests gaze, and ends with computed scores", async () => {
    const start = await request(app).post("/api/v1/sessions").send({ vehicleId: "byd-atto-3", gazeProvider: "mouse" });
    expect(start.status).toBe(201);
    const id = start.body.session.id as string;

    const gaze = await request(app).post(`/api/v1/sessions/${id}/gaze`).send({
      samples: [
        { tMs: 0, x: 0.5, y: 0.5, meshName: "infotainment", provider: "mouse" },
        { tMs: 600, x: 0.5, y: 0.5, meshName: "infotainment", provider: "mouse" },
        { tMs: 900, x: 0.4, y: 0.4, meshName: "seats", provider: "mouse" },
      ],
    });
    expect(gaze.status).toBe(201);
    expect(gaze.body.inserted).toBe(3);

    const end = await request(app).post(`/api/v1/sessions/${id}/end`).send();
    expect(end.status).toBe(200);
    expect(typeof end.body.session.engagementScore).toBe("number");
    expect(end.body.summary.components.length).toBeGreaterThan(0);
  });

  it("rejects an oversized gaze batch with 400", async () => {
    const start = await request(app).post("/api/v1/sessions").send({ vehicleId: "byd-atto-3" });
    const id = start.body.session.id as string;
    const big = { samples: Array.from({ length: 1001 }, () => ({ tMs: 1, x: 0.1, y: 0.1, provider: "mouse" })) };
    expect((await request(app).post(`/api/v1/sessions/${id}/gaze`).send(big)).status).toBe(400);
  });

  it("404s gaze for an unknown session", async () => {
    const res = await request(app).post("/api/v1/sessions/nope/gaze").send({ samples: [{ tMs: 0, x: 0.1, y: 0.1, provider: "mouse" }] });
    expect(res.status).toBe(404);
  });
});
