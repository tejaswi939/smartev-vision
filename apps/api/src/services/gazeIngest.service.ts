import type { ResolvedGazeSample } from "@sev/shared";
import { gazeRepo } from "../repositories/gaze.repo.js";
import { componentViewRepo, type ViewDelta } from "../repositories/componentView.repo.js";

const FOCUS_MS = 400;

/**
 * Bulk-inserts the raw (throttled) gaze samples, then folds them into per-component
 * deltas and applies INCREMENTAL upserts to ComponentView — no full recompute on read.
 * Dwell is accrued to the object under gaze across each inter-sample interval; an
 * entry/exit is counted when the resolved object changes; a focus is counted once a
 * contiguous dwell on the same object crosses FOCUS_MS.
 */
export async function ingestGaze(sessionId: string, vehicleId: string, samples: ResolvedGazeSample[]): Promise<number> {
  if (!samples.length) return 0;
  await gazeRepo.bulkInsert(sessionId, samples);

  const deltas = new Map<string, ViewDelta>();
  const get = (mesh: string, t: number): ViewDelta => {
    let d = deltas.get(mesh);
    if (!d) {
      d = { dViewMs: 0, dFocus: 0, dEntry: 0, dExit: 0, first: t, last: t };
      deltas.set(mesh, d);
    }
    return d;
  };

  let prevMesh: string | null = null;
  let contiguousMs = 0;
  let focusCounted = false;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const mesh = s.meshName ?? null;
    const prev = i > 0 ? samples[i - 1]! : null;
    const dt = prev ? Math.max(0, s.tMs - prev.tMs) : 0;

    if (prev?.meshName) {
      const d = get(prev.meshName, prev.tMs);
      d.dViewMs += dt;
      d.last = s.tMs;
    }

    if (mesh !== prevMesh) {
      if (prevMesh) get(prevMesh, s.tMs).dExit += 1;
      if (mesh) {
        const d = get(mesh, s.tMs);
        d.dEntry += 1;
        d.first = Math.min(d.first, s.tMs);
      }
      contiguousMs = 0;
      focusCounted = false;
    } else if (mesh) {
      contiguousMs += dt;
      if (!focusCounted && contiguousMs >= FOCUS_MS) {
        get(mesh, s.tMs).dFocus += 1;
        focusCounted = true;
      }
    }
    prevMesh = mesh;
  }

  for (const [meshName, d] of deltas) {
    await componentViewRepo.upsertIncrement(sessionId, vehicleId, meshName, d);
  }
  return samples.length;
}
