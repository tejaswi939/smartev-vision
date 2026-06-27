import { useEffect, useRef, useState } from "react";
import type { GazeProviderId } from "@sev/shared";
import { api } from "../../lib/apiClient.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

/** Starts a session per vehicle view; ends it on switch/unmount (sendBeacon on unload). */
export function useSession(vehicleId: string | undefined, provider: GazeProviderId): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const active = useRef<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    void api
      .post("/sessions", { vehicleId, gazeProvider: provider })
      .then((res: { session: { id: string } }) => {
        if (cancelled) return;
        active.current = res.session.id;
        setSessionId(res.session.id);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      const ending = active.current;
      active.current = null;
      setSessionId(null);
      if (ending) {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(`${API_BASE}/sessions/${ending}/end`);
        } else {
          void api.post(`/sessions/${ending}/end`).catch(() => {});
        }
      }
    };
  }, [vehicleId, provider]);

  return sessionId;
}
