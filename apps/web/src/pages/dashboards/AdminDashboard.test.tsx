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
  vi.mocked(api.get).mockImplementation((p: string) =>
    p === "/users"
      ? Promise.resolve({ items: [], total: 7, page: 1, pageSize: 20 })
      : Promise.resolve({ user: { id: "1", email: "admin@x.io", name: "Admin", role: "ADMIN" } }),
  );
});

describe("AdminDashboard", () => {
  it("renders the total-users KPI from the API", async () => {
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
  });
});
