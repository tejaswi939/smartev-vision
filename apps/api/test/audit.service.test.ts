import { describe, it, expect, beforeEach } from "vitest";
import { prisma, resetDb } from "./helpers/db.js";
import { audit } from "../src/services/audit.service.js";

beforeEach(resetDb);

describe("audit.service", () => {
  it("writes an audit row", async () => {
    await audit(prisma, { action: "LOGIN", entityType: "User", entityId: "u1" });
    const rows = await prisma.auditLog.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "LOGIN", entityType: "User", entityId: "u1" });
  });
});
