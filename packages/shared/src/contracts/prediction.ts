import { z } from "zod";

export const componentAggSchema = z.object({
  meshName: z.string(),
  totalViewMs: z.number().nonnegative(),
  focusCount: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
});

export const sessionFeaturesPayloadSchema = z.object({
  components: z.array(componentAggSchema).max(64),
  engagementScore: z.number(),
  interestScore: z.number(),
  totalGazeMs: z.number().nonnegative(),
});

export type SessionFeaturesInput = z.infer<typeof sessionFeaturesPayloadSchema>;
