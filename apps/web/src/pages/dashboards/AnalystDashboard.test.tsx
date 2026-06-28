import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalystDashboard from "./AnalystDashboard.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((p: string) => {
    if (p === "/analytics/overview") {
      return Promise.resolve({
        totalSessions: 12, activeSessions: 2, avgEngagement: 72, avgInterest: 58,
        vehiclePopularity: [{ slug: "aurora-s", name: "Aurora S", sessionCount: 6, avgEngagement: 75, avgInterest: 60, totalViewMs: 1, score: 3.1 }],
        topComponents: [{ meshName: "infotainment", attentionPct: 55 }],
        bottomComponents: [],
      });
    }
    if (p === "/analytics/recommendations") {
      return Promise.resolve({ recommendations: [] });
    }
    if (p === "/analytics/feedback-summary") {
      return Promise.resolve({ summary: { total: 0, sentiment: { positive: 0, neutral: 0, negative: 0 }, avgRating: null } });
    }
    return Promise.resolve({ user: { id: "1", email: "analyst@x.io", name: "Analyst", role: "ANALYST" } });
  });
});

describe("AnalystDashboard", () => {
  it("renders the Insights title and KPI values from the overview API", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AuthProvider>
            <AnalystDashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getAllByText(/insights/i).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument());
  });
});
