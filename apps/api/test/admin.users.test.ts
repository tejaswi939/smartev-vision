import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma, resetDb } from "./helpers/db.js";
import { hashPassword } from "../src/services/auth.service.js";

const app = createApp();
beforeEach(resetDb);

async function seedAdminAgent() {
  await prisma.user.create({
    data: { name: "Admin", email: "admin@smartev.io", role: "ADMIN", passwordHash: await hashPassword("Password123") },
  });
  const a = request.agent(app);
  await a.post("/api/v1/auth/login").send({ email: "admin@smartev.io", password: "Password123" });
  return a;
}

describe("admin users", () => {
  it("lets an admin list users", async () => {
    const a = await seedAdminAgent();
    const res = await a.get("/api/v1/users");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
  it("forbids a customer from listing users", async () => {
    const a = request.agent(app);
    await a.post("/api/v1/auth/register").send({ name: "Cust", email: "c@smartev.io", password: "Password123" });
    expect((await a.get("/api/v1/users")).status).toBe(403);
  });
  it("lets an admin change a user role and audits it", async () => {
    const a = await seedAdminAgent();
    const target = await prisma.user.create({
      data: { name: "T", email: "t@smartev.io", role: "CUSTOMER", passwordHash: "x" },
    });
    const res = await a.patch(`/api/v1/users/${target.id}/role`).send({ role: "ANALYST" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ANALYST");
    expect(await prisma.auditLog.count({ where: { action: "ROLE_CHANGE" } })).toBe(1);
  });
});
