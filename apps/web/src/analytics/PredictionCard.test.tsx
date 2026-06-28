import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PredictionCard } from "./PredictionCard.js";
import type { PredictionDTO } from "@sev/shared";

const mockPrediction: PredictionDTO = {
  sessionId: "sess-1",
  archetype: "performance",
  archetypeConfidence: 0.87,
  interestTier: "high",
  interestConfidence: 0.92,
  scores: {
    archetype: { performance: 0.87, family: 0.08, luxury: 0.05 },
    interestTier: { low: 0.02, medium: 0.06, high: 0.92 },
  },
  modelVersion: "v1.0",
  recommendedVehicle: { slug: "aurora-s", name: "Aurora S" },
  highlightComponents: ["infotainment", "sport-seats"],
  rationale: "High engagement with performance components.",
  createdAt: "2026-06-27T00:00:00Z",
};

describe("PredictionCard", () => {
  it("renders archetype (capitalized) and confidence percentage", () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("87% confidence")).toBeInTheDocument();
  });

  it("renders interest tier badge", () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders recommended vehicle name", () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText("Aurora S")).toBeInTheDocument();
  });

  it("renders highlight component chips", () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText("infotainment")).toBeInTheDocument();
    expect(screen.getByText("sport seats")).toBeInTheDocument();
  });

  it("renders rationale text", () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText("High engagement with performance components.")).toBeInTheDocument();
  });

  it("renders nothing when prediction is null", () => {
    const { container } = render(<PredictionCard prediction={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("skips recommended vehicle section when null", () => {
    render(<PredictionCard prediction={{ ...mockPrediction, recommendedVehicle: null }} />);
    expect(screen.queryByText(/Recommended:/)).toBeNull();
  });

  it("skips highlight chips when array is empty", () => {
    render(<PredictionCard prediction={{ ...mockPrediction, highlightComponents: [] }} />);
    expect(screen.queryByText("infotainment")).toBeNull();
  });

  it("skips rationale when null", () => {
    render(<PredictionCard prediction={{ ...mockPrediction, rationale: null }} />);
    expect(screen.queryByText("High engagement with performance components.")).toBeNull();
  });
});
