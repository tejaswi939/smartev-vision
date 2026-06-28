import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminDashboard from "./AdminDashboard.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((p: string) => {
    if (p === "/analytics/overview") {
      return Promise.resolve({
        totalSessions: 7, activeSessions: 1, avgEngagement: 65, avgInterest: 60,
        vehiclePopularity: [{ slug: "aurora-s", name: "Aurora S", sessionCount: 4, avgEngagement: 70, avgInterest: 60, totalViewMs: 1, score: 2.8 }],
        topComponents: [{ meshName: "infotainment", attentionPct: 50 }],
        bottomComponents: [],
      });
    }
    if (p === "/analytics/recommendations") {
      return Promise.resolve({ recommendations: [] });
    }
    if (p === "/analytics/feedback-summary") {
      return Promise.resolve({ summary: { total: 0, sentiment: { positive: 0, neutral: 0, negative: 0 }, avgRating: null } });
    }
    return Promise.resolve({ user: { id: "1", email: "admin@x.io", name: "Admin", role: "ADMIN" } });
  });
});

describe("AdminDashboard", () => {
  it("renders KPIs and vehicle popularity from the overview API", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AuthProvider>
            <AdminDashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/admin overview/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Aurora S/)).toBeInTheDocument());
  });
});
