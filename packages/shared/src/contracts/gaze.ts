import { z } from "zod";

export const gazeProviderIdSchema = z.enum(["mouse", "camera-center", "crosshair", "webgazer"]);
export type GazeProviderId = z.infer<typeof gazeProviderIdSchema>;

const vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });

export const startSessionSchema = z.object({
  vehicleId: z.string().min(1),
  gazeProvider: gazeProviderIdSchema.default("mouse"),
  device: z.string().max(60).optional(),
});

export const resolvedGazeSampleSchema = z.object({
  tMs: z.number().nonnegative(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  objectId: z.string().optional(),
  meshName: z.string().optional(),
  partId: z.string().optional(),
  camPos: vec3.optional(),
  camRot: vec3.optional(),
  rayDir: vec3.optional(),
  provider: gazeProviderIdSchema,
});

export const gazeBatchSchema = z.object({ samples: z.array(resolvedGazeSampleSchema).min(1).max(1000) });

export const interactionDtoSchema = z.object({
  type: z.enum(["HOVER", "FOCUS", "CLICK", "OPEN", "ROTATE", "ZOOM", "ENTER", "EXIT", "SWITCH"]),
  tMs: z.number().nonnegative(),
  meshName: z.string().optional(),
  partId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const interactionBatchSchema = z.object({ events: z.array(interactionDtoSchema).min(1).max(500) });

export type ResolvedGazeSample = z.infer<typeof resolvedGazeSampleSchema>;
export type InteractionDTO = z.infer<typeof interactionDtoSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
