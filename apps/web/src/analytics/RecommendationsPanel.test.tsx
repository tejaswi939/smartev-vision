import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecommendationsPanel } from "./RecommendationsPanel.js";
import type { RecommendationDTO } from "@sev/shared";

const mockRecommendations: RecommendationDTO[] = [
  { vehicleSlug: "aurora-s", vehicleName: "Aurora S", count: 12, archetypes: { performance: 8, luxury: 4 } },
  { vehicleSlug: "nova-x", vehicleName: "Nova X", count: 7, archetypes: { family: 7 } },
  { vehicleSlug: "blaze-r", vehicleName: "Blaze R", count: 3, archetypes: { performance: 3 } },
];

describe("RecommendationsPanel", () => {
  it("renders each vehicle name from the recommendations list", () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    expect(screen.getByText("Aurora S")).toBeInTheDocument();
    expect(screen.getByText("Nova X")).toBeInTheDocument();
    expect(screen.getByText("Blaze R")).toBeInTheDocument();
  });

  it("renders counts for each recommendation", () => {
    render(<RecommendationsPanel recommendations={mockRecommendations} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows empty state when recommendations array is empty", () => {
    render(<RecommendationsPanel recommendations={[]} />);
    expect(screen.getByText("No recommendations yet.")).toBeInTheDocument();
  });
});
