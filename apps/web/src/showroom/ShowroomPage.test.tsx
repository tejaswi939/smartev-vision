import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ShowroomPage from "./ShowroomPage.js";
import { api } from "../lib/apiClient.js";

// The real <Canvas> needs WebGL; render nothing for it (the 3D children never mount, so no useFrame).
vi.mock("./ShowroomCanvas", () => ({ ShowroomCanvas: () => null }));
vi.mock("./scene/XRLayer", () => ({ ShowroomVRButton: () => null }));
vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const catalog = [
  { id: "1", slug: "aurora-s", name: "Aurora S", category: "Compact", type: "HATCHBACK", thumbnailUrl: null, rangeKm: 560, priceUsd: 48000 },
  { id: "2", slug: "terra-x", name: "Terra X", category: "SUV", type: "SUV", thumbnailUrl: null, rangeKm: 610, priceUsd: 61000 },
  { id: "3", slug: "volt-gt", name: "Volt GT", category: "Sports", type: "SPORTS", thumbnailUrl: null, rangeKm: 540, priceUsd: 89000 },
];
const detail = (slug: string) => ({
  ...catalog.find((c) => c.slug === slug)!, modelUrl: null, metadata: null, parts: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation((p: string) =>
    p === "/vehicles"
      ? Promise.resolve({ vehicles: catalog })
      : Promise.resolve({ vehicle: detail(p.split("/").pop()!) }),
  );
  vi.mocked(api.post).mockResolvedValue({ session: { id: "s1" } });
});

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ShowroomPage />
    </QueryClientProvider>,
  );
}

describe("ShowroomPage", () => {
  it("lists vehicles from the catalog and lets you switch", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Aurora S/)).toBeInTheDocument());
    expect(screen.getByText(/Terra X/)).toBeInTheDocument();
    expect(screen.getByText(/Volt GT/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Terra X/));
    await waitFor(() => expect(screen.getByText(/Terra X/)).toBeInTheDocument());
  });
});
