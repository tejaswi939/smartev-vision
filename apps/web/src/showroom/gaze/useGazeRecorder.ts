import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Raycaster, Vector2 } from "three";
import type { GazeProvider, GazeProviderId, ResolvedGazeSample } from "@sev/shared";
import { DwellTracker } from "./dwellTracker.js";
import { GazeBatcher } from "./gazeBatcher.js";
import { api } from "../../lib/apiClient.js";
import { useInteractionBus } from "../interaction/InteractionProvider.js";

const THROTTLE_MS = 50; // ~20 Hz capture, decoupled from the 60 FPS render loop

export interface ResolvedHit {
  objectId: string;
  meshName?: string;
  componentId?: string;
}

/** Pure: find the first raycast hit carrying an objectId in userData. */
export function resolveHit(objects: { userData?: Record<string, unknown> }[]): ResolvedHit | null {
  for (const o of objects) {
    const id = o.userData?.objectId;
    if (typeof id === "string") {
      return {
        objectId: id,
        meshName: o.userData?.meshName as string | undefined,
        componentId: o.userData?.componentId as string | undefined,
      };
    }
  }
  return null;
}

export function useGazeRecorder(opts: { provider: GazeProvider | null; sessionId: string | null; vehicleId: string }) {
  const { camera, scene } = useThree();
  const bus = useInteractionBus();
  const raycaster = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);
  const dwell = useMemo(() => new DwellTracker(), []);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastTick = useRef(0);

  const batcher = useMemo(
    () =>
      new GazeBatcher<ResolvedGazeSample>((samples) => {
        if (opts.sessionId) void api.post(`/sessions/${opts.sessionId}/gaze`, { samples }).catch(() => {});
      }, 60),
    [opts.sessionId],
  );

  useEffect(() => {
    const p = opts.provider;
    if (!p) return;
    const off = p.onSample((s) => { last.current = { x: s.x, y: s.y }; });
    void p.start();
    return () => {
      off();
      void p.stop();
      batcher.flush();
    };
  }, [opts.provider, batcher]);

  useEffect(() => {
    const timer = setInterval(() => batcher.flush(), 1500);
    return () => clearInterval(timer);
  }, [batcher]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 1000;
    if (t - lastTick.current < THROTTLE_MS) return;
    lastTick.current = t;
    const pt = last.current;
    if (!pt || !opts.sessionId) return;

    raycaster.setFromCamera(ndc.set(pt.x * 2 - 1, -(pt.y * 2 - 1)), camera);
    const hit = resolveHit(raycaster.intersectObjects(scene.children, true).map((h) => ({ userData: h.object.userData })));

    if (hit) {
      bus.emit({ type: "gaze", objectId: hit.objectId, vehicleId: opts.vehicleId, componentId: hit.componentId ?? "", meshName: hit.meshName ?? "", tMs: t });
    }
    for (const ev of dwell.update(hit?.objectId ?? null, t)) {
      if (ev.type === "exit") continue;
      bus.emit({ type: ev.type === "focus" ? "focus" : "hover", objectId: ev.objectId, vehicleId: opts.vehicleId, componentId: hit?.componentId ?? "", meshName: hit?.meshName ?? "", tMs: t });
    }

    batcher.push({
      tMs: t, x: pt.x, y: pt.y,
      objectId: hit?.objectId, meshName: hit?.meshName, partId: hit?.componentId,
      camPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      provider: (opts.provider?.id as GazeProviderId) ?? "mouse",
    });
  });
}

/** Component wrapper so the recorder hook can live inside the Canvas tree. */
export function GazeRecorder(props: { provider: GazeProvider | null; sessionId: string | null; vehicleId: string }) {
  useGazeRecorder(props);
  return null;
}
