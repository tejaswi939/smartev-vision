import { describe, it, expect } from "vitest";
import * as auth from "../src/services/auth.service.js";

describe("auth.service", () => {
  it("hashes and verifies a password", async () => {
    const h = await auth.hashPassword("Password123");
    expect(await auth.verifyPassword(h, "Password123")).toBe(true);
    expect(await auth.verifyPassword(h, "wrong")).toBe(false);
  });
  it("signs and verifies an access token", () => {
    const t = auth.signAccess({ sub: "u1", role: "ADMIN" });
    expect(auth.verifyAccess(t)).toMatchObject({ sub: "u1", role: "ADMIN" });
  });
  it("rejects a tampered token", () => {
    expect(() => auth.verifyAccess("not.a.jwt")).toThrow();
  });
  it("produces a deterministic reset-token hash", () => {
    const { raw, hash } = auth.newResetToken();
    expect(auth.hashResetToken(raw)).toBe(hash);
  });
});
