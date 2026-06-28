import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);

async function agent() {
  const a = request.agent(app);
  await a.post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
  return a;
}

describe("me + profile", () => {
  it("returns the current user", async () => {
    const a = await agent();
    const res = await a.get("/api/v1/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("ada@smartev.io");
  });
  it("401s when unauthenticated", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
  });
  it("updates the profile name", async () => {
    const a = await agent();
    const res = await a.patch("/api/v1/users/me").send({ name: "Ada L." });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada L.");
  });
});
