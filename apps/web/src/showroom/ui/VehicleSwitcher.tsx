import type { VehicleSummary } from "@sev/shared";
import { Button } from "../../components/ui/index.js";

export function VehicleSwitcher({ vehicles, activeSlug, onSelect }: {
  vehicles: VehicleSummary[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {vehicles.map((v) => (
        <Button key={v.slug} variant={v.slug === activeSlug ? "primary" : "ghost"} onClick={() => onSelect(v.slug)}>
          {v.name} <span className="opacity-60">· {v.category}</span>
        </Button>
      ))}
    </div>
  );
}
