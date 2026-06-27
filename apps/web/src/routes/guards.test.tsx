import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext.js";
import { AppRoutes } from "../router.js";
import { api } from "../lib/apiClient.js";

vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("../three/CarPreview", () => ({ default: () => <div>car</div> }));

function renderAt(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("route guards", () => {
  it("redirects an unauthenticated user from /app to /login", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("401"));
    renderAt("/app");
    await waitFor(() => expect(screen.getByText(/welcome back/i)).toBeInTheDocument());
  });
  it("redirects a CUSTOMER away from /admin to their home", async () => {
    vi.mocked(api.get).mockResolvedValue({ user: { id: "1", email: "c@x.io", name: "C", role: "CUSTOMER" } });
    renderAt("/admin");
    await waitFor(() => expect(screen.getByText(/my dashboard/i)).toBeInTheDocument());
  });
});
