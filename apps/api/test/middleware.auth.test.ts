import { describe, it, expect, vi } from "vitest";
import { requireRole } from "../src/middleware/auth.js";
import { HttpError } from "../src/lib/httpError.js";
import type { Request, Response } from "express";

function call(role: string | undefined, allowed: string[]) {
  const req = { user: role ? { id: "u1", role } : undefined } as unknown as Request;
  const next = vi.fn();
  requireRole(...(allowed as never[]))(req, {} as Response, next);
  return next.mock.calls[0]?.[0];
}

describe("requireRole", () => {
  it("passes when role is allowed", () => {
    expect(call("ADMIN", ["ADMIN"])).toBeUndefined();
  });
  it("403s when role is not allowed", () => {
    const err = call("CUSTOMER", ["ADMIN"]);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(403);
  });
  it("401s when unauthenticated", () => {
    expect((call(undefined, ["ADMIN"]) as HttpError).status).toBe(401);
  });
});
