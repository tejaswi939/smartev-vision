import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createInteractionBus, type InteractionBus } from "./interactionBus.js";

const Ctx = createContext<InteractionBus | null>(null);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const ref = useRef<InteractionBus>(createInteractionBus());
  useEffect(
    () =>
      ref.current.subscribe((e) => {
        if (import.meta.env.DEV) console.debug("[interaction]", e);
      }),
    [],
  );
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}

export function useInteractionBus(): InteractionBus {
  const c = useContext(Ctx);
  if (!c) throw new Error("useInteractionBus used outside InteractionProvider");
  return c;
}
