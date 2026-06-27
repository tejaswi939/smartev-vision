import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttentionChart } from "./AttentionChart.js";
import type { ComponentScore } from "@sev/shared";

const components: ComponentScore[] = [
  { meshName: "infotainment", name: "Infotainment", totalViewMs: 3000, focusCount: 3, avgDwellMs: 1000, attentionPct: 60, interactionCount: 4, rank: 1 },
  { meshName: "wheels", name: "Wheels", totalViewMs: 2000, focusCount: 2, avgDwellMs: 1000, attentionPct: 40, interactionCount: 0, rank: 2 },
];

describe("AttentionChart", () => {
  it("renders an accessible summary row per component", () => {
    render(<AttentionChart components={components} />);
    expect(screen.getByText(/infotainment: 60%/i)).toBeInTheDocument();
    expect(screen.getByText(/wheels: 40%/i)).toBeInTheDocument();
  });
});
