import { useQuery } from "@tanstack/react-query";
import type { VehicleSummary } from "@sev/shared";
import { api } from "../../lib/apiClient.js";

export function useVehicleCatalog() {
  return useQuery<VehicleSummary[]>({
    queryKey: ["vehicles"],
    queryFn: async () => (await api.get("/vehicles")).vehicles,
  });
}
