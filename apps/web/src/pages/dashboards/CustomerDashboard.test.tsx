import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CustomerDashboard from "./CustomerDashboard.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const SESSIONS = [
  {
    id: "s1", vehicle: { name: "BYD Atto 3", slug: "byd-atto-3" }, startedAt: "2026-06-26T21:35:27.360Z",
    durationSec: 120, status: "COMPLETED", engagementScore: 60, interestScore: 55, totalGazeMs: 90000,
  },
  {
    id: "s2", vehicle: { name: "Ferrari SF90 Stradale", slug: "ferrari-sf90" }, startedAt: "2026-06-25T21:35:27.367Z",
    durationSec: 90, status: "COMPLETED", engagementScore: 80, interestScore: 59, totalGazeMs: 60000,
  },
];

function mockApi(sessions: unknown[]) {
  vi.mocked(api.get).mockImplementation((p: string) => {
    if (p === "/sessions") return Promise.resolve({ sessions });
    return Promise.resolve({ user: { id: "u1", email: "c@x.io", name: "Cust", role: "CUSTOMER" } });
  });
}

function renderDash() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <CustomerDashboard />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("CustomerDashboard (My Sessions)", () => {
  it("renders a card per session with vehicle + engagement/interest and links to the detail page", async () => {
    mockApi(SESSIONS);
    renderDash();
    expect(await screen.findByText("BYD Atto 3")).toBeInTheDocument();
    expect(screen.getByText("Ferrari SF90 Stradale")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument(); // s1 engagement meter
    expect(screen.getByText("55%")).toBeInTheDocument(); // s1 interest meter (the data the old list hid)
    const view = screen.getAllByRole("link", { name: /view report/i });
    expect(view[0]).toHaveAttribute("href", "/app/sessions/s1");
  });

  it("summarizes count, avg engagement and avg interest in the stat row", async () => {
    mockApi(SESSIONS);
    renderDash();
    await waitFor(() => expect(screen.getByText("BYD Atto 3")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeInTheDocument(); // session count
    expect(screen.getByText("70%")).toBeInTheDocument(); // avg engagement (60+80)/2
    expect(screen.getByText("57%")).toBeInTheDocument(); // avg interest (55+59)/2 — new
  });

  it("shows a friendly empty state with a showroom CTA when there are no sessions", async () => {
    mockApi([]);
    renderDash();
    expect(await screen.findByText(/no sessions yet/i)).toBeInTheDocument();
    expect(screen.getByText(/explore the showroom/i)).toBeInTheDocument();
  });
});
