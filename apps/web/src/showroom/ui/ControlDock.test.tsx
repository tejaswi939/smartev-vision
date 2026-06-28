import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlDock } from "./ControlDock.js";

function setup(over: Record<string, unknown> = {}) {
  const props = {
    mode: "orbit" as const,
    onChangeMode: vi.fn(),
    providerId: "mouse" as const,
    onChangeProvider: vi.fn(),
    heatmapOn: false,
    onToggleHeatmap: vi.fn(),
    vrButton: <button>Enter VR</button>,
    ...over,
  };
  render(<ControlDock {...props} />);
  return props;
}

describe("ControlDock", () => {
  it("cycles the camera mode when the camera control is clicked", () => {
    const p = setup();
    fireEvent.click(screen.getByText(/orbit/i));
    expect(p.onChangeMode).toHaveBeenCalled();
  });

  it("toggles the heatmap", () => {
    const p = setup();
    fireEvent.click(screen.getByRole("button", { name: /heatmap/i }));
    expect(p.onToggleHeatmap).toHaveBeenCalledOnce();
  });

  it("reflects the heatmap-on state via aria-pressed", () => {
    setup({ heatmapOn: true });
    expect(screen.getByRole("button", { name: /heatmap/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders the gaze selector and the VR button", () => {
    setup();
    expect(screen.getByLabelText(/gaze provider/i)).toBeInTheDocument();
    expect(screen.getByText(/enter vr/i)).toBeInTheDocument();
  });
});
