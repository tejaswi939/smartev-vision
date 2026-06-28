export interface DwellEvent {
  type: "enter" | "exit" | "focus";
  objectId: string;
  tMs: number;
}

const FOCUS_MS = 400;

/**
 * Stateful per-frame dwell tracker (client mirror of the server aggregation): emits enter/exit
 * when the gazed object changes, and a single focus event once a contiguous dwell crosses FOCUS_MS.
 */
export class DwellTracker {
  private current: string | null = null;
  private enterMs = 0;
  private focusFired = false;

  update(objectId: string | null, tMs: number): DwellEvent[] {
    const events: DwellEvent[] = [];
    if (objectId !== this.current) {
      if (this.current) events.push({ type: "exit", objectId: this.current, tMs });
      if (objectId) {
        events.push({ type: "enter", objectId, tMs });
        this.enterMs = tMs;
        this.focusFired = false;
      }
      this.current = objectId;
    } else if (objectId && !this.focusFired && tMs - this.enterMs >= FOCUS_MS) {
      events.push({ type: "focus", objectId, tMs });
      this.focusFired = true;
    }
    return events;
  }
}
