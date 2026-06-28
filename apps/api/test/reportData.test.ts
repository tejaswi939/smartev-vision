import { describe, it, expect } from "vitest";
import type { SessionAnalytics } from "@sev/shared";
import { buildSessionReportData } from "../src/reports/reportData.js";

const sampleAnalytics: SessionAnalytics = {
  sessionId: "sess-001",
  vehicleId: "vehicle-abc",
  totalGazeMs: 12000,
  engagementScore: 0.82,
  interestScore: 0.74,
  mostViewed: "front-bumper",
  leastViewed: "trunk",
  components: [
    {
      meshName: "front-bumper",
      name: "Front Bumper",
      totalViewMs: 5000,
      focusCount: 12,
      avgDwellMs: 416,
      attentionPct: 41.7,
      interactionCount: 3,
      rank: 1,
    },
    {
      meshName: "hood",
      name: "Hood",
      totalViewMs: 4000,
      focusCount: 8,
      avgDwellMs: 500,
      attentionPct: 33.3,
      interactionCount: 1,
      rank: 2,
    },
    {
      meshName: "trunk",
      name: "Trunk",
      totalViewMs: 1000,
      focusCount: 2,
      avgDwellMs: 500,
      attentionPct: 8.3,
      interactionCount: 0,
      rank: 3,
    },
  ],
  timeline: [
    { tMs: 0, meshName: "front-bumper" },
    { tMs: 5000, meshName: "hood" },
  ],
};

describe("buildSessionReportData", () => {
  it("title includes the vehicle name", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.title).toContain("Tesla Model S");
  });

  it("kpis includes Engagement Score", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.kpis).toHaveProperty("Engagement Score");
  });

  it("kpis includes Interest Score", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.kpis).toHaveProperty("Interest Score");
  });

  it("kpis includes Most Viewed", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.kpis).toHaveProperty("Most Viewed");
  });

  it("components length matches analytics.components length", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.components.length).toBe(sampleAnalytics.components.length);
  });

  it("components carry correct meshName, attentionPct, totalViewMs", () => {
    const data = buildSessionReportData(sampleAnalytics, "Tesla Model S");
    expect(data.components[0]).toMatchObject({
      meshName: "front-bumper",
      attentionPct: 41.7,
      totalViewMs: 5000,
    });
  });
});
