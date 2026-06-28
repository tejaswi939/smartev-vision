import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { mailer } from "../src/lib/mailer.js";

const app = createApp();
beforeEach(resetDb);

describe("forgot + reset password", () => {
  it("always returns 200 for forgot (no account enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "ghost@smartev.io" });
    expect(res.status).toBe(200);
  });
  it("emails a reset link and resets the password", async () => {
    await request(app).post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
    const spy = vi.spyOn(mailer, "sendPasswordReset").mockResolvedValue();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "ada@smartev.io" });
    const link = spy.mock.calls[0]![1];
    const token = new URL(link).searchParams.get("token")!;
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "NewPassword123" });
    expect(res.status).toBe(200);
    const login = await request(app).post("/api/v1/auth/login").send({ email: "ada@smartev.io", password: "NewPassword123" });
    expect(login.status).toBe(200);
    spy.mockRestore();
  });
  it("rejects an unknown reset token with 400", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: "0".repeat(64), password: "NewPassword123" });
    expect(res.status).toBe(400);
  });
});
