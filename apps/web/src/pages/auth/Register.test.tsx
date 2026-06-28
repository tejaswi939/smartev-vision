import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockRejectedValue(new Error("401")); // /auth/me -> logged out
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillIdentity() {
  await waitFor(() => screen.getByText(/create account/i));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Lovelace" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@x.io" } });
}

describe("Register page", () => {
  it("lets the user choose their own password and sends only name/email/password", async () => {
    vi.mocked(api.post).mockResolvedValue({
      user: { id: "u1", name: "Ada Lovelace", email: "ada@x.io", role: "CUSTOMER" },
    });
    renderRegister();
    await fillIdentity();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "mySecret123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "mySecret123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Exact-match assertion: `confirm` is a UI-only safeguard, so the payload is
    // strictly { name, email, password } — an extra key would fail this deep equality.
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/register", {
        name: "Ada Lovelace",
        email: "ada@x.io",
        password: "mySecret123",
      }),
    );
  });

  it("blocks submit and warns when the passwords don't match", async () => {
    renderRegister();
    await fillIdentity();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "mySecret123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/don't match/i));
    expect(api.post).not.toHaveBeenCalled();
  });

  it("blocks submit and warns when the password is too short", async () => {
    renderRegister();
    await fillIdentity();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/at least 8 characters/i));
    expect(api.post).not.toHaveBeenCalled();
  });

  it("reveals the password when 'Show password' is toggled", async () => {
    renderRegister();
    await fillIdentity();
    const pwd = screen.getByLabelText("Password");
    expect(pwd).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(pwd).toHaveAttribute("type", "text");
  });

  it("shows a friendly message when the email is already registered", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Email already registered"));
    renderRegister();
    await fillIdentity();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "mySecret123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "mySecret123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/already registered/i));
  });
});
