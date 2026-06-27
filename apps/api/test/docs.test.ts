import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("api docs", () => {
  it("serves the OpenAPI json", async () => {
    const res = await request(createApp()).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths["/auth/login"]).toBeDefined();
  });
});
