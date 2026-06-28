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

describe("report-export API", () => {
  it("admin GET /sessions/:id/report?format=pdf returns 200 with PDF content-type and %PDF bytes", async () => {
    const a = await agentFor("admin@smartev.io");
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    expect(session).not.toBeNull();

    const res = await a
      .get(`/api/v1/sessions/${session!.id}/report?format=pdf`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");
    const body = res.body as Buffer;
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 4).toString()).toBe("%PDF");

    // Audit row was created
    const report = await prisma.report.findFirst({
      where: { sessionId: session!.id, type: "PDF" },
    });
    expect(report).not.toBeNull();
    expect(report!.scope).toBe(`session:${session!.id}`);
  });

  it("admin GET /sessions/:id/report?format=xlsx returns 200 with spreadsheet content-type", async () => {
    const a = await agentFor("admin@smartev.io");
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });

    const res = await a
      .get(`/api/v1/sessions/${session!.id}/report?format=xlsx`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers["content-disposition"]).toContain(".xlsx");
    const body = res.body as Buffer;
    expect(body.length).toBeGreaterThan(0);
    // XLSX is a ZIP file — magic bytes PK
    expect(body[0]).toBe(0x50);
    expect(body[1]).toBe(0x4b);

    // Audit row was created
    const report = await prisma.report.findFirst({
      where: { sessionId: session!.id, type: "EXCEL" },
    });
    expect(report).not.toBeNull();
    expect(report!.scope).toBe(`session:${session!.id}`);
  });

  it("admin GET /sessions/:id/report?format=json returns JSON and no stale Phase-5 note", async () => {
    const a = await agentFor("admin@smartev.io");
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });

    const res = await a.get(`/api/v1/sessions/${session!.id}/report?format=json`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.report).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain("Phase 5");
    expect(JSON.stringify(res.body)).not.toContain("arrives in Phase");
  });

  it("anonymous GET /sessions/:id/report returns 401 or 403", async () => {
    const session = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    const res = await request(app).get(`/api/v1/sessions/${session!.id}/report`);
    expect([401, 403]).toContain(res.status);
  });


  it("admin GET /vehicles/:slug/report?format=pdf returns 200 with PDF content-type", async () => {
    const a = await agentFor("admin@smartev.io");

    const res = await a
      .get("/api/v1/vehicles/byd-atto-3/report?format=pdf")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    const body = res.body as Buffer;
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 4).toString()).toBe("%PDF");

    // Audit row created with vehicle scope
    const report = await prisma.report.findFirst({
      where: { scope: "vehicle:byd-atto-3", type: "PDF" },
    });
    expect(report).not.toBeNull();
  });

  it("customer GET /vehicles/:slug/report returns 403", async () => {
    const a = await agentFor("customer@smartev.io");
    const res = await a.get("/api/v1/vehicles/byd-atto-3/report?format=pdf");
    expect(res.status).toBe(403);
  });
});
