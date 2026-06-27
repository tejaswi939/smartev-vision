import { useQuery, type QueryKey } from "@tanstack/react-query";

/** Polling interval, paused while the tab is hidden (returns false → React Query stops polling). */
export function pausedWhenHidden(intervalMs: number): number | false {
  return typeof document !== "undefined" && document.hidden ? false : intervalMs;
}

/** Near-real-time analytics: polls every `intervalMs`, pauses on hidden tab, refetches on window focus. */
export function useAnalyticsPolling<T>(key: QueryKey, queryFn: () => Promise<T>, intervalMs = 4000) {
  return useQuery<T>({
    queryKey: key,
    queryFn,
    refetchInterval: () => pausedWhenHidden(intervalMs),
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });
}
