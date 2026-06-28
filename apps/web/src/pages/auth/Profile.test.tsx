import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const USER = {
  id: "u1",
  email: "admin@smartev.io",
  name: "Admin User",
  role: "ADMIN",
  age: 30,
  gender: "other",
  avatarUrl: null,
  createdAt: "2026-01-15T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ user: USER });
});

function renderProfile() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Profile />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Profile page", () => {
  it("shows the signed-in user's details (email, role, member-since)", async () => {
    renderProfile();
    expect(await screen.findByText("admin@smartev.io")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument(); // role chip
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  it("shows initials when there is no avatar", async () => {
    renderProfile();
    expect(await screen.findByText("AU")).toBeInTheDocument(); // "Admin User" -> AU
  });

  it("saves edited fields to /users/me and confirms", async () => {
    vi.mocked(api.patch).mockResolvedValue({ user: { ...USER, name: "Ada L." } });
    renderProfile();
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Admin User"));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada L." } });
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "41" } });
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Female" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    // avatarUrl is empty, so it is omitted — payload is exactly name/age/gender
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/users/me", {
        name: "Ada L.",
        age: 41,
        gender: "Female",
      }),
    );
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it("surfaces an error when the save fails", async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error("Invalid avatar URL"));
    renderProfile();
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Admin User"));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/invalid avatar url/i));
  });
});
