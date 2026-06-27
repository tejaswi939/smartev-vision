import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HotspotPanel } from "./HotspotPanel.js";
import type { VehiclePartDTO } from "@sev/shared";

const part: VehiclePartDTO = {
  id: "p", name: "Battery Pack", category: "BATTERY", meshName: "battery",
  specs: { Capacity: "82 kWh" }, hotspotPosition: null, animation: null, interactive: true, displayOrder: 0,
};

describe("HotspotPanel", () => {
  it("shows specs and the attention placeholder", () => {
    render(<HotspotPanel part={part} onClose={() => {}} />);
    expect(screen.getByText("Battery Pack")).toBeInTheDocument();
    expect(screen.getByText(/82 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/available after Phase 3/i)).toBeInTheDocument();
  });
  it("renders nothing without a part", () => {
    const { container } = render(<HotspotPanel part={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
