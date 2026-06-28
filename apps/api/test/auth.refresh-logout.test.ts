import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);

async function registerAgent() {
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
  return agent;
}

describe("refresh + logout", () => {
  it("issues fresh cookies on refresh", async () => {
    const agent = await registerAgent();
    const res = await agent.post("/api/v1/auth/refresh");
    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("sev_access");
  });
  it("401s refresh without a refresh cookie", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
  it("clears cookies on logout", async () => {
    const agent = await registerAgent();
    const res = await agent.post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("sev_access=;");
  });
});
