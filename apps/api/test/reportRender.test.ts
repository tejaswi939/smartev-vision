import { describe, it, expect } from "vitest";
import { renderPdf } from "../src/reports/pdf.js";
import { renderXlsx } from "../src/reports/excel.js";
import type { SessionReportData } from "../src/reports/reportData.js";

const sampleData: SessionReportData = {
  title: "Session Report — Audi e-tron",
  kpis: {
    "Engagement Score": 0.85,
    "Interest Score": 0.72,
    "Most Viewed": "front-grille",
    "Total Gaze (ms)": 15000,
  },
  components: [
    { meshName: "front-grille", attentionPct: 45.0, totalViewMs: 6750 },
    { meshName: "rear-bumper", attentionPct: 22.5, totalViewMs: 3375 },
  ],
};

describe("renderPdf", () => {
  it("returns a non-empty Buffer starting with %PDF", async () => {
    const buf = await renderPdf(sampleData);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});

describe("renderXlsx", () => {
  it("returns a non-empty Buffer starting with PK (ZIP magic bytes)", async () => {
    const buf = await renderXlsx(sampleData);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
  });
});
