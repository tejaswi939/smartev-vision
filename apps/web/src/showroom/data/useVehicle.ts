import { useQuery } from "@tanstack/react-query";
import type { VehicleDetail } from "@sev/shared";
import { api } from "../../lib/apiClient.js";

export function useVehicle(slug: string | undefined) {
  return useQuery<VehicleDetail>({
    queryKey: ["vehicle", slug],
    enabled: !!slug,
    queryFn: async () => (await api.get(`/vehicles/${slug}`)).vehicle,
  });
}
