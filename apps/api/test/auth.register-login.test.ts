import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);
const newUser = { name: "Ada Lovelace", email: "ada@smartev.io", password: "Password123" };

describe("register + login", () => {
  it("registers a user and sets auth cookies", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: newUser.email, role: "CUSTOMER" });
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access");
  });
  it("rejects duplicate email with 409", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/register").send(newUser);
    expect(res.status).toBe(409);
  });
  it("rejects a short password with 400", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ ...newUser, password: "x" });
    expect(res.status).toBe(400);
  });
  it("logs in with correct credentials", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/login").send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access");
  });
  it("rejects wrong password with 401", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/login").send({ email: newUser.email, password: "nope" });
    expect(res.status).toBe(401);
  });
});
