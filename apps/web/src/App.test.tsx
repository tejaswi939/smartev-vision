import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.js";
import { api } from "./lib/apiClient.js";

vi.mock("./lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("./three/CarPreview", () => ({ default: () => <div>car</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockRejectedValue(new Error("401"));
});

describe("App", () => {
  it("wires the router and renders the landing page at /", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
  });
});
