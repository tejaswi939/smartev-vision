import type { InteractionEvent } from "./objectId.js";

type Handler = (e: InteractionEvent) => void;

export interface InteractionBus {
  emit(e: InteractionEvent): void;
  subscribe(h: Handler): () => void;
}

export function createInteractionBus(): InteractionBus {
  const handlers = new Set<Handler>();
  return {
    emit: (e) => handlers.forEach((h) => h(e)),
    subscribe: (h) => {
      handlers.add(h);
      return () => {
        handlers.delete(h);
      };
    },
  };
}
