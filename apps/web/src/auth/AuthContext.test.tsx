import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext.js";
import { api } from "../lib/apiClient.js";

vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

function Probe() {
  const { user, loading, login } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span>{user ? user.email : "anon"}</span>
      <button onClick={() => void login("a@x.io", "pw")}>login</button>
    </div>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("AuthContext", () => {
  it("starts anonymous when /auth/me fails", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("401"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("anon")).toBeInTheDocument());
  });
  it("sets the user after login", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("401"));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "1", email: "a@x.io", name: "A", role: "CUSTOMER" },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => screen.getByText("anon"));
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("a@x.io")).toBeInTheDocument());
  });
});
