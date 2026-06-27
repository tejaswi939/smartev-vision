import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "./Landing.js";

vi.mock("../three/CarPreview", () => ({ default: () => <div>car-preview</div> }));

describe("Landing", () => {
  it("renders hero, features, and CTA", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByText(/truly notice/i)).toBeInTheDocument();
    expect(screen.getByText(/VR Showroom/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
  });
});
