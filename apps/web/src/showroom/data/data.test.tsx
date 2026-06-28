import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useVehicleCatalog } from "./useVehicleCatalog.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => vi.clearAllMocks());

describe("useVehicleCatalog", () => {
  it("returns the vehicle list", async () => {
    vi.mocked(api.get).mockResolvedValue({
      vehicles: [{ id: "1", slug: "aurora-s", name: "Aurora S", category: "Compact", type: "HATCHBACK", thumbnailUrl: null, rangeKm: 560, priceUsd: 48000 }],
    });
    const { result } = renderHook(() => useVehicleCatalog(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data![0]!.slug).toBe("aurora-s");
  });
});
