import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, updateRoleSchema } from "./auth.js";

describe("auth contracts", () => {
  it("accepts a valid registration", () => {
    const r = registerSchema.safeParse({ name: "Ada", email: "ada@x.io", password: "supersecret1" });
    expect(r.success).toBe(true);
  });
  it("rejects a short password", () => {
    const r = registerSchema.safeParse({ name: "Ada", email: "ada@x.io", password: "short" });
    expect(r.success).toBe(false);
  });
  it("rejects a bad email on login", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "supersecret1" }).success).toBe(false);
  });
  it("constrains role to the three enum values", () => {
    expect(updateRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(updateRoleSchema.safeParse({ role: "GOD" }).success).toBe(false);
  });
});
